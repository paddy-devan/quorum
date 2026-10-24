import type { Attribute, Puzzle } from "../game/types";
import { validatePuzzle, type Validation } from "../game/validator";
import { excludedCountries } from "./eligibility";
import profileJson from "./quality-profile.json";

export interface Range { min: number; max: number }
export interface QualityProfile {
  id: string; version: number;
  candidateCount: number; requirementCount: number; maxSelected: number;
  maxPerFamily: number; estimationCount: Range; minSubjects: number;
  difficultyCounts: Record<string, Range>;
  familiarityCounts: Record<string, Range>;
  matchingCountries: Range; optimalSize: number; optimalCount: Range;
  completionRates: Record<number, Range>;
  minIrreducibleBySize: Record<number, number>;
  safeRouteSizes: number[];
  preventImplications: boolean;
  maxAdjacentRequirementOverlap: number;
}
export interface QualityIssue {
  code: string; message: string;
  actual?: number; min?: number; max?: number; ids?: string[];
}
export interface QualityReport {
  accepted: boolean;
  issues: QualityIssue[];
  mix: ReturnType<typeof requirementMix>;
  familiarity: Record<string, number>;
  analysis: Validation;
}
export const qualityProfile: QualityProfile = profileJson;

/** Fail loudly on an invalid authoring profile; a typo must not disable a check. */
export function validateProfile(profile: QualityProfile) {
  const integer = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!profile.id || !integer(profile.version, 1, 10000) ||
      !integer(profile.candidateCount, 1, 20) || !integer(profile.requirementCount, 1, 12) ||
      !integer(profile.maxSelected, 1, profile.candidateCount) ||
      !integer(profile.maxPerFamily, 1, profile.requirementCount) ||
      !integer(profile.minSubjects, 1, profile.requirementCount) ||
      !integer(profile.optimalSize, 1, profile.maxSelected) ||
      !integer(profile.maxAdjacentRequirementOverlap, 0, profile.requirementCount) ||
      typeof profile.preventImplications !== "boolean") throw new Error("Invalid quality profile limits.");
  const range = (r: Range, max: number, fractions = false) => {
    if (!r || !Number.isFinite(r.min) || !Number.isFinite(r.max) || r.min < 0 || r.min > r.max || r.max > max ||
        (!fractions && (!Number.isInteger(r.min) || !Number.isInteger(r.max))))
      throw new Error("Invalid quality profile range.");
  };
  range(profile.estimationCount, profile.requirementCount);
  range(profile.matchingCountries, profile.candidateCount);
  range(profile.optimalCount, 2 ** profile.candidateCount);
  for (const r of Object.values(profile.difficultyCounts)) range(r, profile.requirementCount);
  for (const r of Object.values(profile.familiarityCounts)) range(r, profile.candidateCount);
  if (Object.keys(profile.difficultyCounts).sort().join() !== "easy,hard,medium" ||
      Object.keys(profile.familiarityCounts).sort().join() !== "familiar,less-familiar,moderate")
    throw new Error("Quality profile needs all difficulty and familiarity bands.");
  for (const [size, r] of Object.entries(profile.completionRates)) {
    if (!integer(Number(size), 1, profile.maxSelected)) throw new Error("Invalid completion-rate size.");
    range(r, 1, true);
  }
  for (const [size, min] of Object.entries(profile.minIrreducibleBySize))
    if (!integer(Number(size), 1, profile.maxSelected) || !integer(min, 0, 2 ** profile.candidateCount))
      throw new Error("Invalid irreducible-solution limit.");
  if (!profile.safeRouteSizes.length || profile.safeRouteSizes.some((size) =>
    !integer(size, profile.optimalSize, Math.min(profile.requirementCount, profile.maxSelected))))
    throw new Error("Invalid safe-route size.");
}

function counts(values: (string | undefined)[]) {
  const result: Record<string, number> = {};
  for (const value of values) if (value) result[value] = (result[value] ?? 0) + 1;
  return result;
}
export function requirementMix(attributes: Attribute[]) {
  return {
    families: counts(attributes.map((a) => a.family)),
    reasoning: counts(attributes.map((a) => a.reasoning)),
    subjects: counts(attributes.map((a) => a.category)),
    difficulties: counts(attributes.map((a) => a.difficulty)),
  };
}
function rangeIssue(code: string, label: string, actual: number, range: Range): QualityIssue[] {
  return actual < range.min || actual > range.max
    ? [{ code, message: `${label}: ${actual}; expected ${range.min}–${range.max}.`, actual, ...range }] : [];
}

/** Cheap checks shared by the generator and the full published-board audit. */
export function assessRequirementMix(attributes: Attribute[], profile: QualityProfile): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const mix = requirementMix(attributes);
  if (attributes.length !== profile.requirementCount)
    issues.push({ code: "requirement-count", message: `Expected ${profile.requirementCount} requirements.`, actual: attributes.length });
  for (const a of attributes) {
    const needsEstimation = a.rule && ["comparison", "distance", "closer"].includes(a.rule.kind);
    if (!a.family?.trim() || !["recall", "estimation"].includes(a.reasoning ?? "") ||
        !["geography", "culture", "history", "sport", "economy", "population"].includes(a.category ?? "") ||
        !["easy", "medium", "hard"].includes(a.difficulty ?? "") || (needsEstimation && a.reasoning !== "estimation"))
      issues.push({ code: "requirement-metadata", message: `Missing, invalid or contradictory authoring metadata: ${a.id}.`, ids: [a.id] });
    if (a.generationEnabled === false)
      issues.push({ code: "disabled-requirement", message: `Requirement is disabled for publication: ${a.id}.`, ids: [a.id] });
  }
  for (const [family, count] of Object.entries(mix.families))
    issues.push(...rangeIssue("family-count", `Question family “${family}”`, count, { min: 0, max: profile.maxPerFamily }));
  issues.push(...rangeIssue("estimation-count", "Estimation questions", mix.reasoning.estimation ?? 0, profile.estimationCount));
  issues.push(...rangeIssue("subject-count", "Distinct subjects", Object.keys(mix.subjects).length, { min: profile.minSubjects, max: attributes.length }));
  for (const [difficulty, range] of Object.entries(profile.difficultyCounts))
    issues.push(...rangeIssue("difficulty-count", `Difficulty “${difficulty}”`, mix.difficulties[difficulty] ?? 0, range));
  return issues;
}

export function assessCountryMix(puzzle: Pick<Puzzle, "entities">, profile: QualityProfile): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const familiarity = counts(puzzle.entities.map((e) => e.familiarity));
  for (const e of puzzle.entities)
    if (!e.familiarity || !(e.familiarity in profile.familiarityCounts))
      issues.push({ code: "country-metadata", message: `Missing or unsupported familiarity band: ${e.id}.`, ids: [e.id] });
  for (const [band, range] of Object.entries(profile.familiarityCounts))
    issues.push(...rangeIssue("familiarity-count", `Country familiarity “${band}”`, familiarity[band] ?? 0, range));
  return issues;
}

export function assessPuzzle(puzzle: Puzzle, profile = qualityProfile, analysis = validatePuzzle(puzzle)): QualityReport {
  validateProfile(profile);
  const issues = [...assessRequirementMix(puzzle.attributes, profile), ...assessCountryMix(puzzle, profile)];
  if (puzzle.entities.length !== profile.candidateCount)
    issues.push({ code: "candidate-count", message: `Expected ${profile.candidateCount} countries.`, actual: puzzle.entities.length });
  if (puzzle.rules.maxSelected !== profile.maxSelected)
    issues.push({ code: "selection-limit", message: `Expected a selection limit of ${profile.maxSelected}.`, actual: puzzle.rules.maxSelected });
  const exclusions = excludedCountries(puzzle.attributes);
  for (const entity of puzzle.entities) {
    if (exclusions.has(entity.id))
      issues.push({ code: "excluded-country", message: `${entity.name}: ${exclusions.get(entity.id)!.join("; ")}.`, ids: [entity.id] });
    if (!analysis.countryCoverage[entity.id])
      issues.push({ code: "unused-country", message: `${entity.name} covers no requirement.`, ids: [entity.id] });
  }
  for (const [id, frequency] of Object.entries(analysis.attributeFrequency))
    issues.push(...rangeIssue("matching-countries", `Matching countries for ${id}`, frequency, profile.matchingCountries));
  if (analysis.minimum !== profile.optimalSize)
    issues.push({ code: "optimum", message: `Minimum is ${analysis.minimum ?? "unsolvable"}; expected ${profile.optimalSize}.` });
  issues.push(...rangeIssue("optimal-count", "Optimal solutions", analysis.optimalSolutions.length, profile.optimalCount));
  for (const [size, range] of Object.entries(profile.completionRates))
    issues.push(...rangeIssue("completion-rate", `Completion rate for ${size} countries`, analysis.completionRates[Number(size)] ?? 0, range));
  for (const [size, min] of Object.entries(profile.minIrreducibleBySize)) {
    const actual = analysis.irreducibleBySize[Number(size)] ?? 0;
    if (actual < min) issues.push({ code: "irreducible-count", message: `Irreducible ${size}-country solutions: ${actual}; expected at least ${min}.`, actual, min });
  }
  if (!profile.safeRouteSizes.some((size) => analysis.irreducibleBySize[size] > 0))
    issues.push({ code: "safe-route", message: `No irreducible route of ${profile.safeRouteSizes.join(" or ")} countries.` });
  if (profile.preventImplications)
    for (const pair of analysis.implications)
      issues.push({ code: "implied-requirement", message: `${pair.from} always also satisfies ${pair.to}.`, ids: [pair.from, pair.to] });
  return { accepted: issues.length === 0, issues, mix: requirementMix(puzzle.attributes), familiarity: counts(puzzle.entities.map((e) => e.familiarity)), analysis };
}
