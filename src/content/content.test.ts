import { describe, expect, it } from "vitest";
import {
  catalog,
  dailyPuzzle,
  adjacentPuzzle,
  definitions,
  loadPuzzle,
  puzzles,
  utcDate,
} from "./loader";
import { validatePuzzle } from "../game/validator";
import { auditSchedule } from "./audit";

describe("authored content integrity", () => {
  it.each(puzzles.map((puzzle) => [puzzle.id, puzzle] as const))(
    "%s has twelve verified candidates, six requirements and a three-country optimum",
    (_, puzzle) => {
      expect(puzzle.entities).toHaveLength(12);
      expect(puzzle.attributes).toHaveLength(6);
      expect(puzzle.rules.maxSelected).toBe(6);
      const report = validatePuzzle(puzzle);
      expect(report.solvable).toBe(true);
      expect(report.minimum).toBe(3);
      expect(report.optimalSolutions.length).toBeGreaterThan(0);
      expect(report.validBySize[1] ?? 0).toBe(0);
      expect(report.validBySize[2] ?? 0).toBe(0);
      expect(
        Object.values(report.attributeFrequency).every((count) => count > 0),
      ).toBe(true);
      expect(
        puzzle.entities.every((entity) =>
          puzzle.attributes.some((attribute) => entity.facts[attribute.id].value),
        ),
      ).toBe(true);
    },
  );
  it("rejects unknown and omitted facts instead of silently treating them as false", () => {
    const unknown = structuredClone(catalog);
    const countryId = definitions[0].entityIds[0];
    const attributeId = definitions[0].attributeIds[0];
    const country = unknown.entities.find((entity) => entity.id === countryId)!;
    country.facts[attributeId].value = null;
    expect(() => loadPuzzle(unknown, definitions[0])).toThrow("Unverified");
    delete country.facts[attributeId];
    expect(() => loadPuzzle(unknown, definitions[0])).toThrow("Unverified");
  });
  it("rejects missing sources, missing references, duplicates and incorrect claimed optima", () => {
    const noSources = structuredClone(catalog);
    noSources.entities.find((entity) => entity.id === definitions[0].entityIds[0])!
      .facts[definitions[0].attributeIds[0]].sourceIds = ["absent"];
    expect(() => loadPuzzle(noSources, definitions[0])).toThrow("evidence");
    expect(() =>
      loadPuzzle(catalog, { ...definitions[0], entityIds: ["absent"] }),
    ).toThrow("Missing entity");
    expect(() =>
      loadPuzzle(catalog, { ...definitions[0], entityIds: ["kenya", "kenya"] }),
    ).toThrow("Duplicate");
    expect(() =>
      loadPuzzle(catalog, {
        ...definitions[0],
        rules: { ...definitions[0].rules, expectedOptimal: 2 },
      }),
    ).toThrow("optimum");
  });
  it("keeps unreviewed relationships unknown and supplies evidence for every verified fact", () => {
    for (const entity of catalog.entities)
      for (const attribute of catalog.attributes) {
        const fact = entity.facts[attribute.id];
        expect(fact.explanation.length).toBeGreaterThan(20);
        if (fact.value === null) {
          expect(fact.sourceIds).toEqual([]);
          continue;
        }
        expect(typeof fact.value).toBe("boolean");
        expect(fact.sourceIds.length).toBeGreaterThan(0);
        expect(
          fact.sourceIds.every((id) =>
            catalog.sources.some((source) => source.id === id),
          ),
        ).toBe(true);
      }
  });
  it("passes the shared publication policy for the complete looping schedule", () => {
    const audit = auditSchedule(catalog, definitions);
    expect(audit.issues).toEqual([]);
    for (const { definition, report, error } of audit.puzzles) {
      expect(error, definition.id).toBeUndefined();
      expect(report?.issues, definition.id).toEqual([]);
    }
    expect(audit.accepted).toBe(true);
    expect(puzzles).toHaveLength(7);
  });
  it("browses every day and wraps inside the selected seven-day testing week", () => {
    const first = dailyPuzzle("2026-10-22");
    let current = first;
    const seen = new Set<string>();
    for (let i = 0; i < puzzles.length; i++) {
      seen.add(current.puzzle.id);
      expect(adjacentPuzzle(adjacentPuzzle(current.date, 1).date, -1)).toEqual(current);
      current = adjacentPuzzle(current.date, 1);
    }
    expect(seen.size).toBe(7);
    expect(current).toEqual(first);
    expect(adjacentPuzzle(first.date, -1).date).toBe("2026-10-28");
    expect(adjacentPuzzle("2026-11-04", 1).date).toBe("2026-10-29");
    expect(() => adjacentPuzzle("invalid", 1)).toThrow("date");
  });
  it("uses UTC boundaries and deterministic shared fixtures", () => {
    expect(utcDate(new Date("2026-10-22T00:30:00+01:00"))).toBe("2026-10-21");
    expect(dailyPuzzle("2026-10-22").number).toBe(1);
    expect(dailyPuzzle("2026-10-23").puzzle.id).not.toBe(
      dailyPuzzle("2026-10-22").puzzle.id,
    );
    const cycleEnd = new Date("2026-10-22T00:00:00Z");
    for (const puzzle of puzzles) {
      expect(dailyPuzzle(utcDate(cycleEnd)).puzzle.id).toBe(puzzle.id);
      cycleEnd.setUTCDate(cycleEnd.getUTCDate() + 1);
    }
    expect(dailyPuzzle(utcDate(cycleEnd)).puzzle.id).toBe(
      dailyPuzzle("2026-10-22").puzzle.id,
    );
    expect(dailyPuzzle("2026-10-22")).toEqual(dailyPuzzle("2026-10-22"));
    expect(() => dailyPuzzle("2026-02-30")).toThrow();
  });
});
