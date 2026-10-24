import type { Puzzle } from "./types";

export interface Validation {
  solvable: boolean;
  minimum: number | null;
  optimalSolutions: string[][];
  validSolutionCount: number;
  nearOptimalSolutionCount: number;
  validBySize: Record<number, number>;
  combinationsBySize: Record<number, number>;
  completionRates: Record<number, number>;
  irreducibleBySize: Record<number, number>;
  irreducibleExamples: Record<number, string[][]>;
  prunableRates: Record<number, number>;
  attributeFrequency: Record<string, number>;
  countryCoverage: Record<string, number>;
  implications: { from: string; to: string }[];
}

/** Analyse every country subset. Policies about interestingness live outside this solver. */
export function validatePuzzle(puzzle: Puzzle): Validation {
  const n = puzzle.entities.length;
  if (n > 20) throw new Error("Exhaustive validation is limited to 20 candidates.");
  if (!n || !puzzle.attributes.length) throw new Error("A puzzle needs candidates and requirements.");
  if (new Set(puzzle.entities.map((entity) => entity.id)).size !== n)
    throw new Error("Duplicate candidate IDs.");
  if (new Set(puzzle.attributes.map((attribute) => attribute.id)).size !== puzzle.attributes.length)
    throw new Error("Duplicate requirement IDs.");
  const { maxSelected, maxChecks, expectedOptimal } = puzzle.rules;
  if (![maxSelected, maxChecks, expectedOptimal].every((value) => Number.isInteger(value) && value > 0) ||
      maxSelected > n || expectedOptimal > maxSelected) throw new Error("Invalid puzzle limits.");
  for (const entity of puzzle.entities)
    for (const attribute of puzzle.attributes)
      if (typeof entity.facts[attribute.id]?.value !== "boolean")
        throw new Error(`Unverified fact: ${entity.id} / ${attribute.id}`);

  // Each requirement has a bit per matching country (not a bit per requirement),
  // so the solver also supports catalogs with more than 32 requirements.
  const answerMasks = puzzle.attributes.map((attribute) => puzzle.entities.reduce(
    (mask, entity, i) => entity.facts[attribute.id].value ? mask | (1 << i) : mask, 0,
  ));
  const complete = new Uint8Array(1 << n);
  const sizes = new Uint8Array(1 << n);
  const validBySize: Record<number, number> = {};
  const combinationsBySize: Record<number, number> = {};
  const irreducibleBySize: Record<number, number> = {};
  const irreducibleExamples: Record<number, string[][]> = {};
  const optimalSolutions: string[][] = [];
  let minimum: number | null = null;
  const ids = (mask: number) => puzzle.entities.filter((_, i) => mask & (1 << i)).map((entity) => entity.id);

  // Removing a country always produces a smaller integer mask, already analysed.
  for (let mask = 1; mask < complete.length; mask++) {
    const bit = mask & -mask;
    const size = sizes[mask] = sizes[mask ^ bit] + 1;
    if (size <= maxSelected) combinationsBySize[size] = (combinationsBySize[size] ?? 0) + 1;
    if (!answerMasks.every((answers) => answers & mask)) continue;
    complete[mask] = 1;
    if (minimum === null || size < minimum) {
      minimum = size;
      optimalSolutions.length = 0;
    }
    if (size === minimum) optimalSolutions.push(ids(mask));
    if (size > maxSelected) continue;
    validBySize[size] = (validBySize[size] ?? 0) + 1;
    let irreducible = true;
    for (let remaining = mask; remaining; remaining &= remaining - 1)
      if (complete[mask ^ (remaining & -remaining)]) { irreducible = false; break; }
    if (irreducible) {
      irreducibleBySize[size] = (irreducibleBySize[size] ?? 0) + 1;
      const examples = irreducibleExamples[size] ??= [];
      if (examples.length < 5) examples.push(ids(mask));
    }
  }
  const completionRates: Record<number, number> = {};
  const prunableRates: Record<number, number> = {};
  for (let size = 1; size <= maxSelected; size++) {
    completionRates[size] = (validBySize[size] ?? 0) / combinationsBySize[size];
    prunableRates[size] = validBySize[size]
      ? 1 - (irreducibleBySize[size] ?? 0) / validBySize[size] : 0;
  }
  const implications: Validation["implications"] = [];
  answerMasks.forEach((from, i) => answerMasks.forEach((to, j) => {
    if (i !== j && from !== 0 && (from & to) === from)
      implications.push({ from: puzzle.attributes[i].id, to: puzzle.attributes[j].id });
  }));
  return {
    solvable: minimum !== null && minimum <= maxSelected,
    minimum, optimalSolutions, validBySize, combinationsBySize, completionRates,
    irreducibleBySize, irreducibleExamples, prunableRates, implications,
    validSolutionCount: Object.values(validBySize).reduce((sum, count) => sum + count, 0),
    nearOptimalSolutionCount: minimum === null ? 0 : (validBySize[minimum + 1] ?? 0),
    attributeFrequency: Object.fromEntries(puzzle.attributes.map((attribute, i) => [
      attribute.id, puzzle.entities.filter((_, j) => answerMasks[i] & (1 << j)).length,
    ])),
    countryCoverage: Object.fromEntries(puzzle.entities.map((entity, j) => [
      entity.id, answerMasks.filter((answers) => answers & (1 << j)).length,
    ])),
  };
}
