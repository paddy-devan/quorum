import { evaluate } from "./engine";
import type { Puzzle } from "./types";

export interface Validation {
  solvable: boolean;
  minimum: number | null;
  optimalSolutions: string[][];
  validSolutionCount: number;
  nearOptimalSolutionCount: number;
  validBySize: Record<number, number>;
  attributeFrequency: Record<string, number>;
}

export function validatePuzzle(puzzle: Puzzle): Validation {
  if (puzzle.entities.length > 20)
    throw new Error("Exhaustive validation is limited to 20 candidates.");
  if (!puzzle.entities.length || !puzzle.attributes.length)
    throw new Error("A puzzle needs candidates and requirements.");
  if (
    new Set(puzzle.entities.map((entity) => entity.id)).size !==
    puzzle.entities.length
  )
    throw new Error("Duplicate candidate IDs.");
  if (
    new Set(puzzle.attributes.map((attribute) => attribute.id)).size !==
    puzzle.attributes.length
  )
    throw new Error("Duplicate requirement IDs.");
  const { maxSelected, maxChecks, expectedOptimal } = puzzle.rules;
  if (
    ![maxSelected, maxChecks, expectedOptimal].every(
      (value) => Number.isInteger(value) && value > 0,
    ) ||
    maxSelected > puzzle.entities.length ||
    expectedOptimal > maxSelected
  ) {
    throw new Error("Invalid puzzle limits.");
  }
  for (const entity of puzzle.entities) {
    for (const attribute of puzzle.attributes) {
      if (typeof entity.facts[attribute.id]?.value !== "boolean")
        throw new Error(`Unverified fact: ${entity.id} / ${attribute.id}`);
    }
  }
  // Enumerate every non-empty subset, including those beyond the play limit.
  // This distinguishes an unsolvable puzzle from a solution needing too many cards.
  const solutions: string[][] = [];
  for (let mask = 1; mask < 2 ** puzzle.entities.length; mask++) {
    const ids = puzzle.entities
      .filter((_, index) => mask & (1 << index))
      .map((entity) => entity.id);
    const unrestricted = {
      ...puzzle,
      rules: { ...puzzle.rules, maxSelected: puzzle.entities.length },
    };
    if (evaluate(unrestricted, ids).complete) solutions.push(ids);
  }
  const minimum = solutions.length
    ? solutions.reduce(
        (size, solution) => Math.min(size, solution.length),
        Infinity,
      )
    : null;
  const playable = solutions.filter(
    (solution) => solution.length <= maxSelected,
  );
  const validBySize: Record<number, number> = {};
  for (const solution of playable)
    validBySize[solution.length] = (validBySize[solution.length] ?? 0) + 1;
  return {
    solvable: minimum !== null && minimum <= maxSelected,
    minimum,
    optimalSolutions: solutions.filter(
      (solution) => solution.length === minimum,
    ),
    validSolutionCount: playable.length,
    nearOptimalSolutionCount:
      minimum === null ? 0 : (validBySize[minimum + 1] ?? 0),
    validBySize,
    attributeFrequency: Object.fromEntries(
      puzzle.attributes.map((attribute) => [
        attribute.id,
        puzzle.entities.filter((entity) => entity.facts[attribute.id].value)
          .length,
      ]),
    ),
  };
}
