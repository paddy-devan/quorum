import { describe, expect, it } from "vitest";
import {
  authoredFixtureGenerator,
  catalog,
  dailyPuzzle,
  demoPuzzle,
  demoPuzzles,
  definitions,
  loadPuzzle,
  puzzles,
  utcDate,
} from "./loader";
import { validatePuzzle } from "../game/validator";

describe("authored content integrity", () => {
  it.each([...puzzles, ...demoPuzzles].map((puzzle) => [puzzle.id, puzzle] as const))(
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
    unknown.entities[0].facts.africa.value = null;
    expect(() => loadPuzzle(unknown, definitions[0])).toThrow("Unverified");
    delete unknown.entities[0].facts.africa;
    expect(() => loadPuzzle(unknown, definitions[0])).toThrow("Unverified");
  });
  it("rejects missing sources, missing references, duplicates and incorrect claimed optima", () => {
    const noSources = structuredClone(catalog);
    noSources.entities[0].facts.africa.sourceIds = ["absent"];
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
  it.each(demoPuzzles.map((puzzle) => [puzzle.id, puzzle] as const))(
    "%s offers alternatives and gives every requirement an independent role",
    (_, puzzle) => {
      const report = validatePuzzle(puzzle);
      expect(report.optimalSolutions.length).toBeGreaterThan(1);
      expect(report.validBySize[4]).toBeGreaterThan(0);
      expect(Object.values(report.attributeFrequency).every((n) => n >= 2 && n <= 7)).toBe(true);
      for (const first of puzzle.attributes)
        for (const second of puzzle.attributes) {
          if (first.id === second.id) continue;
          // If every answer to A also answers B, B adds no decision to a complete solution.
          expect(puzzle.entities.some((entity) =>
            entity.facts[first.id].value && !entity.facts[second.id].value,
          ), `${first.id} should not automatically satisfy ${second.id}`).toBe(true);
        }
    },
  );
  it("resolves stable demo links without changing the daily rotation", () => {
    const demo = demoPuzzle(demoPuzzles[0].id)!;
    expect(demo.demoId).toBe(demoPuzzles[0].id);
    expect(demo.date).toBe("2026-10-23");
    expect(demoPuzzle("absent")).toBeNull();
    expect(dailyPuzzle("2026-10-23").demoId).toBeUndefined();
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
  it("exposes a deterministic, replaceable authored generator without mutating fixtures", () => {
    const generated = authoredFixtureGenerator({ catalog, seed: 0 });
    expect(generated).toEqual(definitions[0]);
    generated.entityIds.pop();
    expect(definitions[0].entityIds).toHaveLength(12);
  });
});
