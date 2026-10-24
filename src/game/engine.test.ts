import { describe, expect, it } from "vitest";
import { catalog, dailyPuzzle, loadPuzzle, puzzles } from "../content/loader";
import {
  bestCheck,
  evaluate,
  resultLabel,
  shareText,
  submitCheck,
} from "./engine";
import { validatePuzzle } from "./validator";
import { newRun } from "../storage/local";
import type { Check, Puzzle } from "./types";

// Keep rule tests independent of editorial changes to the daily boards.
const puzzle = loadPuzzle(catalog, {
  id: "engine-test", version: 1, title: "Rule fixture",
  entityIds: ["brazil", "portugal", "kenya", "south-africa", "japan", "egypt", "austria", "indonesia", "peru", "france", "nigeria", "nepal"],
  attributeIds: ["africa", "landlocked", "portuguese", "left", "south", "europe"],
  rules: { maxSelected: 6, maxChecks: 3, expectedOptimal: 3, clueMode: "hidden" },
});
const daily = { ...dailyPuzzle("2026-10-22"), puzzle };
const optimum = validatePuzzle(puzzle).optimalSolutions[0];
const attempt = (ids: string[], id = "check"): Check => ({
  ...evaluate(puzzle, ids),
  id,
  submittedAt: "2026-10-22T12:00:00Z",
});

describe("coverage and check rules", () => {
  it("unions requirements without counting duplicate coverage", () => {
    const a = evaluate(puzzle, ["kenya"]);
    const b = evaluate(puzzle, ["kenya", "south-africa"]);
    expect(a.coveredIds).toEqual(["africa", "left", "south"]);
    expect(b.coveredIds).toEqual(a.coveredIds);
    expect(a.complete).toBe(false);
    expect(evaluate(puzzle, optimum).complete).toBe(true);
  });
  it.each(
    [
      [],
      ["missing"],
      ["kenya", "kenya"],
      puzzle.entities.slice(0, 7).map((entity) => entity.id),
    ].map((ids) => [ids]),
  )("rejects invalid selections: %j", (ids) => {
    expect(() => evaluate(puzzle, ids)).toThrow();
  });
  it("does not turn missing or unknown facts into false", () => {
    const unverified = structuredClone(puzzle);
    unverified.entities[0].facts.africa.value = null;
    expect(() =>
      evaluate(unverified, [unverified.entities[0].id, "kenya"]),
    ).toThrow("Unverified fact");
  });
  it("enforces all three checks and automatically finishes", () => {
    let run = newRun(daily, "participant");
    for (const id of ["kenya", "brazil", "japan"])
      run = submitCheck(puzzle, { ...run, selectedIds: [id] });
    expect(run.checks).toHaveLength(3);
    expect(run.finished).toBe(true);
    expect(() => submitCheck(puzzle, run)).toThrow("finished");
  });
  it("rejects repeated combinations independent of ordering without spending a check", () => {
    const run = submitCheck(puzzle, {
      ...newRun(daily, "p"),
      selectedIds: ["kenya", "brazil"],
    });
    expect(() =>
      submitCheck(puzzle, { ...run, selectedIds: ["brazil", "kenya"] }),
    ).toThrow("already checked");
    expect(run.checks).toHaveLength(1);
  });
  it("disallows checks after an explicit early finish", () => {
    expect(() =>
      submitCheck(puzzle, {
        ...newRun(daily, "p"),
        selectedIds: ["kenya"],
        finished: true,
      }),
    ).toThrow();
  });
});

describe("ranking and sharing", () => {
  it("accepts six countries and improves a complete Quorum down to three", () => {
    const extras = puzzle.entities
      .filter((entity) => !optimum.includes(entity.id))
      .slice(0, 3)
      .map((entity) => entity.id);
    let run = newRun(daily, "p");
    for (const ids of [[...optimum, ...extras], [...optimum, extras[0]], optimum]) {
      run = submitCheck(puzzle, { ...run, selectedIds: ids });
      expect(bestCheck(run.checks)?.entityIds).toEqual(ids);
      expect(bestCheck(run.checks)?.complete).toBe(true);
    }
    expect(run.checks.map((check) => check.entityIds.length)).toEqual([6, 4, 3]);
    expect(resultLabel(puzzle, run.checks[0])).toBe("Complete Quorum");
    expect(resultLabel(puzzle, bestCheck(run.checks))).toBe("Perfect Quorum");
    expect(run.finished).toBe(true);
  });
  it("keeps a complete result after a later failed check", () => {
    const complete = attempt([
      ...optimum,
      ...puzzle.entities
        .filter((entity) => !optimum.includes(entity.id))
        .slice(0, 1)
        .map((entity) => entity.id),
    ]);
    expect(bestCheck([complete, attempt(["kenya"], "later")])).toBe(complete);
  });
  it("prefers fewer countries for complete solutions", () => {
    const perfect = attempt(optimum);
    const complete = attempt([
      ...optimum,
      puzzle.entities.find((entity) => !optimum.includes(entity.id))!.id,
    ]);
    expect(bestCheck([complete, perfect])).toBe(perfect);
    expect(resultLabel(puzzle, perfect)).toBe("Perfect Quorum");
    expect(resultLabel(puzzle, complete)).toBe("Complete Quorum");
  });
  it("ranks incomplete checks by coverage, then fewer countries", () => {
    const smaller = attempt(["kenya"]);
    const larger = attempt(["kenya", "south-africa"]);
    expect(bestCheck([larger, smaller])).toBe(smaller);
    expect(
      bestCheck([smaller, attempt(["kenya", "nepal"])])?.entityIds,
    ).toHaveLength(2);
    expect(bestCheck([])).toBeUndefined();
    expect(resultLabel(puzzle)).toBe("Incomplete Quorum");
  });
  it("shares progression and score without names, attributes or solutions", () => {
    const run = {
      ...newRun(daily, "p"),
      checks: [attempt(["kenya"]), attempt(optimum, "final")],
      finished: true,
    };
    const text = shareText(daily, run, "https://quorum.example");
    expect(text).toContain("Quorum #001");
    expect(text).toContain("Perfect Quorum");
    expect(text).toContain("2/3 checks");
    expect(text).toContain("https://quorum.example");
    for (const entity of puzzle.entities)
      expect(text).not.toContain(entity.name);
    for (const attribute of puzzle.attributes)
      expect(text).not.toContain(attribute.label);
  });
  it("identifies a browsed day with its puzzle number and date", () => {
    const otherDay = dailyPuzzle("2026-10-28");
    const text = shareText(otherDay, newRun(otherDay, "p"), "https://quorum.example/?date=2026-10-28");
    expect(text).toContain("Quorum #007 · 2026-10-28");
    expect(text).toContain("?date=2026-10-28");
    expect(text).not.toContain("demo");
  });
});

describe("exhaustive solver", () => {
  const abstract: Puzzle = {
    ...puzzle,
    id: "abstract",
    attributes: ["a", "b", "c"].map((id) => ({
      id,
      label: id,
      definition: id,
    })),
    entities: [["a"], ["b"], ["c"], ["a", "b"]].map((covered, index) => ({
      id: String(index),
      name: String(index),
      symbol: "●",
      clue: "",
      facts: Object.fromEntries(
        ["a", "b", "c"].map((id) => [
          id,
          {
            value: covered.includes(id),
            explanation: "Abstract fixture",
            sourceIds: [],
          },
        ]),
      ),
    })),
    rules: { ...puzzle.rules, maxSelected: 3, expectedOptimal: 2 },
  };
  it("finds every optimum and counts complete near-optimal combinations", () => {
    const result = validatePuzzle(abstract);
    expect(result.minimum).toBe(2);
    expect(result.optimalSolutions).toEqual([["2", "3"]]);
    expect(result.validBySize).toEqual({ 2: 1, 3: 3 });
    expect(result.validSolutionCount).toBe(4);
    expect(result.nearOptimalSolutionCount).toBe(3);
    expect(result.combinationsBySize).toEqual({ 1: 4, 2: 6, 3: 4 });
    expect(result.completionRates[3]).toBe(3 / 4);
    // 0,1,2 is an irreducible triple, although 2,3 is the smaller optimum.
    expect(result.irreducibleBySize).toEqual({ 2: 1, 3: 1 });
    expect(result.irreducibleExamples[3]).toEqual([["0", "1", "2"]]);
    expect(result.prunableRates[3]).toBeCloseTo(2 / 3);
    expect(result.implications).toEqual([]);
  });
  it("agrees with gameplay evaluation for every playable subset", () => {
    const result = validatePuzzle(abstract);
    const complete: Record<number, number> = {};
    const irreducible: Record<number, number> = {};
    for (let mask = 1; mask < 1 << abstract.entities.length; mask++) {
      const ids = abstract.entities.filter((_, i) => mask & (1 << i)).map((e) => e.id);
      if (ids.length > abstract.rules.maxSelected || !evaluate(abstract, ids).complete) continue;
      complete[ids.length] = (complete[ids.length] ?? 0) + 1;
      if (ids.every((id) => ids.length === 1 || !evaluate(abstract, ids.filter((other) => other !== id)).complete))
        irreducible[ids.length] = (irreducible[ids.length] ?? 0) + 1;
    }
    expect(result.validBySize).toEqual(complete);
    expect(result.irreducibleBySize).toEqual(irreducible);
  });
  it("supports more than 32 requirements and identifies implications", () => {
    const wide: Puzzle = {
      ...abstract,
      attributes: Array.from({ length: 33 }, (_, i) => ({ id: `a${i}`, label: `a${i}`, definition: "Abstract requirement" })),
      entities: abstract.entities.map((e) => ({ ...e, facts: Object.fromEntries(Array.from({ length: 33 }, (_, i) =>
        [`a${i}`, { ...e.facts[["a", "b", "c"][i % 3]] }])) })),
    };
    const result = validatePuzzle(wide);
    expect(result.minimum).toBe(2);
    expect(result.validBySize).toEqual({ 2: 1, 3: 3 });
    expect(result.implications).toContainEqual({ from: "a0", to: "a3" });
    expect(result.implications).not.toContainEqual({ from: "a0", to: "a1" });
  });
  it("recognises impossibility and solutions outside the selection limit", () => {
    expect(
      validatePuzzle({
        ...abstract,
        entities: abstract.entities.slice(0, 2),
        rules: { ...abstract.rules, maxSelected: 2 },
      }).minimum,
    ).toBeNull();
    const outside = validatePuzzle({
      ...abstract,
      rules: { ...abstract.rules, expectedOptimal: 1, maxSelected: 1 },
    });
    expect(outside.minimum).toBe(2);
    expect(outside.solvable).toBe(false);
    expect(outside.validSolutionCount).toBe(0);
  });
  it("rejects duplicated requirements and invalid limits", () => {
    expect(() =>
      validatePuzzle({
        ...abstract,
        attributes: [abstract.attributes[0], abstract.attributes[0]],
      }),
    ).toThrow("Duplicate");
    expect(() =>
      validatePuzzle({
        ...abstract,
        rules: { ...abstract.rules, maxChecks: 0 },
      }),
    ).toThrow("limits");
  });
  it("evaluates all optimal answers consistently across authored puzzles", () => {
    for (const fixture of puzzles) {
      for (const ids of validatePuzzle(fixture).optimalSolutions)
        expect(evaluate(fixture, ids).complete).toBe(true);
    }
  });
});
