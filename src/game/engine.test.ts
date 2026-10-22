import { describe, expect, it } from "vitest";
import { dailyPuzzle, puzzles } from "../content/loader";
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

const daily = dailyPuzzle("2026-10-22");
const puzzle = daily.puzzle;
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
    expect(a.coveredIds).toEqual(["africa", "equator", "left", "south"]);
    expect(b.coveredIds).toEqual(a.coveredIds);
    expect(a.complete).toBe(false);
    expect(evaluate(puzzle, optimum).complete).toBe(true);
  });
  it.each(
    [
      [],
      ["missing"],
      ["kenya", "kenya"],
      puzzle.entities.slice(0, 6).map((entity) => entity.id),
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
