import { describe, expect, it } from "vitest";
import { catalog, demoDefinitions, loadPuzzle } from "./loader";
import { distanceMiles, resolveCatalog, resolveRequirement } from "./requirements";
import type { Attribute, Catalog } from "../game/types";

const entity = (data: Catalog, id: string) => data.entities.find((country) => country.id === id)!;
const attribute = (id: string) => catalog.attributes.find((requirement) => requirement.id === id)!;

describe("data-driven requirements", () => {
  it("uses the same year and a strict unrounded comparison", () => {
    expect(entity(catalog, "brazil").facts["gdp-above-austria"].value).toBe(true);
    expect(entity(catalog, "nigeria").facts["gdp-above-austria"].value).toBe(false);
    expect(entity(catalog, "austria").facts["gdp-above-austria"].value).toBe(false);
    const input = structuredClone(catalog);
    entity(input, "brazil").statistics!.gdpUsd!.year = 2022;
    expect(resolveCatalog(input).entities[0].facts["gdp-above-austria"].value).toBeNull();
    expect(() => loadPuzzle(resolveCatalog(input), demoDefinitions[0])).toThrow("Unverified");
  });
  it("derives per-person and density measures from matching dated observations", () => {
    expect(entity(catalog, "austria").facts["gdp-person-above-portugal"].value).toBe(true);
    expect(entity(catalog, "netherlands").facts["denser-than-germany"].value).toBe(true);
    expect(entity(catalog, "nepal").facts["denser-than-germany"].value).toBe(false);
    const input = structuredClone(catalog);
    entity(input, "japan").statistics!.population!.value = null;
    expect(resolveRequirement(input, entity(input, "japan"), attribute("denser-than-germany")).value).toBeNull();
  });
  it("calculates great-circle distances, including the international date line", () => {
    const point = (latitude: number, longitude: number) => ({name: "Test point", latitude, longitude, sourceIds: []});
    expect(distanceMiles(point(0, 0), point(0, 0))).toBe(0);
    expect(distanceMiles(point(0, 179), point(0, -179))).toBeCloseTo(138.19, 1);
    expect(distanceMiles(point(0, 0), point(0, 180))).toBeCloseTo(12436.8, 0);
    expect(entity(catalog, "nepal").facts["capital-near-tokyo"].value).toBe(true);
    expect(entity(catalog, "japan").facts["closer-cairo-than-paris"].value).toBe(true);
    expect(entity(catalog, "netherlands").facts["closer-cairo-than-paris"].value).toBe(false);
    expect(() => distanceMiles(point(100, 0), point(0, 0))).toThrow("coordinates");
  });
  it("counts an absent event as false only for a reviewed country and period", () => {
    expect(entity(catalog, "portugal").facts["mediterranean-diet"].value).toBe(true);
    expect(entity(catalog, "france").facts["mediterranean-diet"].value).toBe(false);
    const input = structuredClone(catalog);
    input.eventCollections!.find((collection) => collection.id === "mediterranean-diet")!.reviewedEntityIds = [];
    expect(resolveRequirement(input, entity(input, "france"), attribute("mediterranean-diet")).value).toBeNull();
    const outsideSnapshot: Attribute = { ...attribute("summer-host"), rule: {kind: "event", collectionId: "summer-olympics", fromYear: 1896, toYear: 2032} };
    expect(resolveRequirement(catalog, entity(catalog, "australia"), outsideSnapshot).value).toBeNull();
  });
  it("pins political history to the named dataset without filling historical gaps", () => {
    expect(entity(catalog, "brazil").facts["autocracy-1980"].value).toBe(true);
    expect(entity(catalog, "india").facts["autocracy-1980"].value).toBe(false);
    // The source separates East and West Germany in 1980; neither is silently substituted.
    expect(entity(catalog, "germany").facts["autocracy-1980"].value).toBeNull();
    expect(entity(catalog, "germany").facts["autocracy-1980"].explanation).toMatch(/not been verified/);
  });
  it("rejects broken source references and invalid template parameters", () => {
    const input = structuredClone(catalog);
    entity(input, "brazil").statistics!.gdpUsd!.sourceIds = ["missing"];
    expect(() => resolveCatalog(input)).toThrow("source references");
    const invalid: Attribute = { ...attribute("capital-near-cairo"), rule: {kind: "distance", placeId: "cairo", maxMiles: -1} };
    expect(() => resolveRequirement(catalog, entity(catalog, "brazil"), invalid)).toThrow("positive");
    const absent: Attribute = { ...invalid, rule: {kind: "distance", placeId: "absent", maxMiles: 1000} };
    expect(() => resolveRequirement(catalog, entity(catalog, "brazil"), absent)).toThrow("reference place");
  });
});
