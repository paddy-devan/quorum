import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { definitions, puzzles } from "./loader";
import { excludedCountries } from "./eligibility";
import { resolvePuzzle } from "./puzzle";
import { assessPuzzle, assessRequirementMix, qualityProfile, validateProfile } from "./quality";
import { generatePuzzles } from "./generator";
import { auditSchedule } from "./audit";
import type { Attribute } from "../game/types";

describe("quality policies and country eligibility", () => {
  it("caps estimation across comparison, distance and relative-distance families", () => {
    const ids = ["gdp-above-austria", "capital-near-paris", "closer-cairo-than-paris", "summer-host", "tango-heritage", "landlocked"];
    const issues = assessRequirementMix(ids.map((id) => catalog.attributes.find((a) => a.id === id)!), qualityProfile);
    expect(issues.find((issue) => issue.code === "estimation-count")?.actual).toBe(3);
    expect(issues.some((issue) => issue.code === "family-count")).toBe(false);
  });
  it("caps repeated families and requires useful editorial metadata", () => {
    const distances = catalog.attributes.filter((a) => a.rule?.kind === "distance").slice(0, 3);
    expect(assessRequirementMix(distances, qualityProfile).some((i) => i.code === "family-count")).toBe(true);
    const missing = structuredClone(puzzles[0].attributes);
    delete missing[0].family;
    expect(assessRequirementMix(missing, qualityProfile).some((i) => i.code === "requirement-metadata")).toBe(true);
    const mislabeled = { ...catalog.attributes.find((a) => a.id === "gdp-above-austria")!, reasoning: "recall" as const };
    expect(assessRequirementMix([mislabeled], qualityProfile).some((i) => i.code === "requirement-metadata")).toBe(true);
    const disabled = catalog.attributes.find((a) => a.id === "autocracy-1980")!;
    expect(assessRequirementMix([disabled], qualityProfile).some((i) => i.code === "disabled-requirement")).toBe(true);
  });
  it("excludes comparison references without changing their factual answer", () => {
    const attribute = catalog.attributes.find((a) => a.id === "people-above-germany")!;
    expect(catalog.entities.find((e) => e.id === "germany")!.facts[attribute.id].value).toBe(false);
    expect(excludedCountries([attribute]).get("germany")?.[0]).toContain("reference country");
    expect(() => resolvePuzzle(catalog, { ...definitions[0], entityIds: ["germany"], attributeIds: [attribute.id] })).toThrow("Excluded country: germany");
    const permitted = resolvePuzzle(catalog, { ...definitions[0], entityIds: ["brazil"], attributeIds: [attribute.id] });
    expect(permitted.entities[0].facts[attribute.id].value).toBe(true);
  });
  it("honours explicit exclusions and rejects misspelled exclusion references", () => {
    const custom = structuredClone(catalog);
    const attr = custom.attributes.find((a) => a.id === definitions[0].attributeIds[0])!;
    attr.excludedEntityIds = [definitions[0].entityIds[0]];
    expect(() => resolvePuzzle(custom, definitions[0])).toThrow("Excluded country");
    attr.excludedEntityIds = ["misspelled-country"];
    expect(() => resolvePuzzle(custom, definitions[0])).toThrow("Missing excluded country");
  });
  it("reports factual coverage, difficulty and familiarity issues separately", () => {
    const puzzle = structuredClone(puzzles[0]);
    puzzle.entities[0].familiarity = undefined;
    for (const a of puzzle.attributes) puzzle.entities[0].facts[a.id].value = false;
    for (const a of puzzle.attributes) a.difficulty = "easy";
    const codes = assessPuzzle(puzzle).issues.map((issue) => issue.code);
    expect(codes).toContain("country-metadata");
    expect(codes).toContain("unused-country");
    expect(codes).toContain("difficulty-count");
  });
  it("allows policy tuning without changing factual rules or the solver", () => {
    const puzzle = puzzles[0];
    const original = JSON.stringify(puzzle);
    expect(assessPuzzle(puzzle).accepted).toBe(true);
    const strict = { ...qualityProfile, optimalCount: { min: 0, max: 0 } };
    expect(assessPuzzle(puzzle, strict).issues.map((i) => i.code)).toContain("optimal-count");
    expect(JSON.stringify(puzzle)).toBe(original);
    expect(() => validateProfile({ ...qualityProfile, estimationCount: { min: 3, max: 2 } })).toThrow("range");
    expect(() => validateProfile({ ...qualityProfile, candidateCount: 30 })).toThrow("limits");
  });
  it("audits the stored safe route, declared optimum and schedule boundaries", () => {
    const changed = structuredClone(definitions);
    changed[0].authoring!.safeSelectionIds = [];
    changed[0].rules.expectedOptimal = 2;
    const report = auditSchedule(catalog, changed).puzzles[0].report!;
    expect(report.issues.map((i) => i.code)).toContain("safe-witness");
    expect(report.issues.map((i) => i.code)).toContain("claimed-optimum");
    expect(auditSchedule(catalog, [definitions[0], definitions[0]]).issues.map((i) => i.code)).toContain("adjacent-overlap");
  });
});

describe("bounded seeded generation", () => {
  it("replays exactly and produces boards accepted by the same published-content policy", () => {
    const options = { catalog, seed: 20261022, count: 2, maxAttempts: 10000, traceLimit: 12 };
    const original = JSON.stringify(catalog);
    const result = generatePuzzles(options);
    expect(result).toEqual(generatePuzzles(options));
    expect(result.exhausted).toBe(false);
    expect(result.puzzles).toHaveLength(2);
    expect(auditSchedule(catalog, result.puzzles).accepted).toBe(true);
    expect(Object.values(result.stages).reduce((a, b) => a + b, 0)).toBe(result.attempts);
    expect(result.trace.length + result.traceDropped).toBe(result.attempts);
    expect(result.trace).toHaveLength(12);
    expect(JSON.stringify(catalog)).toBe(original);
    expect(result.puzzles).not.toEqual(generatePuzzles({ ...options, seed: 42 }).puzzles);
  });
  it("stops at its budget without silently weakening an impossible policy", () => {
    const impossible = { ...qualityProfile, optimalCount: { min: 0, max: 0 } };
    const result = generatePuzzles({ catalog, profile: impossible, seed: 42, count: 2, maxAttempts: 200, traceLimit: 0 });
    expect(result.exhausted).toBe(true);
    expect(result.attempts).toBe(200);
    expect(result.puzzles).toEqual([]);
    expect(result.rejectionCounts["optimal-count"]).toBeGreaterThan(0);
    expect(result.trace).toEqual([]);
    expect(result.traceDropped).toBe(200);
    expect(result.profile).toEqual(impossible);
  });
  it("enforces explicit exclusions before proposing boards and checks seed bounds", () => {
    const input = structuredClone(catalog);
    for (const a of input.attributes) a.excludedEntityIds = ["brazil"];
    const result = generatePuzzles({ catalog: input, seed: 42, count: 1, maxAttempts: 10000 });
    expect(result.exhausted).toBe(false);
    expect(result.puzzles[0].entityIds).not.toContain("brazil");
    expect(() => generatePuzzles({ catalog, seed: -1, count: 1, maxAttempts: 1 })).toThrow("seed");
    const malformed: Attribute = { ...input.attributes[0], excludedEntityIds: ["absent"] };
    expect(excludedCountries([malformed]).has("absent")).toBe(true);
  });
});
