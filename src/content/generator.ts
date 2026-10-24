import type { Attribute, Catalog, Entity, PuzzleDefinition } from "../game/types";
import { excludedCountries } from "./eligibility";
import { resolvePuzzle } from "./puzzle";
import {
  assessCountryMix, assessPuzzle, assessRequirementMix, qualityProfile, validateProfile,
  type QualityIssue, type QualityProfile, type QualityReport,
} from "./quality";

export const algorithmVersion = "seeded-safe-route-v1";
export interface GenerationOptions {
  catalog: Catalog;
  seed: number;
  count: number;
  maxAttempts: number;
  profile?: QualityProfile;
  traceLimit?: number;
}
interface Trace {
  attempt: number;
  stage: string;
  requirementIds: string[];
  entityIds?: string[];
  eligibleCount?: number;
  exclusions?: { id: string; reasons: string[] }[];
  ineligibleCountries?: { id: string; reason: "excluded" | "unverified" | "no-matches"; requirementIds?: string[] }[];
  issues: QualityIssue[];
}
export interface GenerationResult {
  algorithmVersion: string;
  catalogVersion: string;
  seed: number;
  profile: QualityProfile;
  requested: number;
  maxAttempts: number;
  attempts: number;
  exhausted: boolean;
  stages: Record<string, number>;
  rejectionCounts: Record<string, number>;
  trace: Trace[];
  traceDropped: number;
  puzzles: PuzzleDefinition[];
  reports: QualityReport[];
}

/** Mulberry32. No clock, network or global random state participates in generation. */
function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    let n = state = (state + 0x6d2b79f5) >>> 0;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function bitCount(mask: number) {
  let count = 0;
  for (; mask; mask &= mask - 1) count++;
  return count;
}

/** Give each country a private requirement that no other country in this route covers.
 * Other requirements may overlap. Such a route cannot be improved by deletion alone.
 * The finite search is a proposal heuristic: failure is not proof that no route exists.
 */
function proposeSafeRoute(entities: Entity[], attributes: Attribute[], sizes: number[], random: () => number) {
  const fullMask = (1 << attributes.length) - 1;
  const masks = entities.map((entity) => attributes.reduce((mask, a, i) =>
    entity.facts[a.id].value ? mask | (1 << i) : mask, 0));
  for (const size of shuffle(sizes, random)) {
    const privateSets = [];
    for (let mask = 1; mask <= fullMask; mask++) if (bitCount(mask) === size) privateSets.push(mask);
    for (const privateSet of shuffle(privateSets, random)) {
      const groups: number[][] = [];
      for (let bit = 1; bit <= fullMask; bit <<= 1)
        if (privateSet & bit) groups.push(masks.flatMap((mask, index) =>
          (mask & privateSet) === bit ? [index] : []));
      if (groups.some((group) => !group.length)) continue;
      // A few draws allow the non-private requirements to be covered too.
      for (let draw = 0; draw < 4; draw++) {
        const indexes = groups.map((group) => group[Math.floor(random() * group.length)]);
        if (indexes.reduce((mask, index) => mask | masks[index], 0) === fullMask)
          return indexes.map((index) => entities[index]);
      }
    }
  }
  return null;
}

/** Bounded proposal → eligibility → cheap checks → exact analysis → quality policy.
 * Returns partial output on exhaustion. Constraints are never silently relaxed.
 * Input must be a resolved catalog (see catalog.ts / resolveCatalog).
 */
export function generatePuzzles(options: GenerationOptions): GenerationResult {
  const { catalog, seed, count, maxAttempts, profile = qualityProfile, traceLimit = 30 } = options;
  validateProfile(profile);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff ||
      !Number.isInteger(count) || count < 1 || count > 366 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 1_000_000 ||
      !Number.isInteger(traceLimit) || traceLimit < 0 || traceLimit > 10000)
    throw new Error("Invalid generator seed, count, attempt budget or trace limit.");
  const random = randomSource(seed);
  const attributes = catalog.attributes.filter((a) => a.generationEnabled !== false).sort((a, b) => a.id.localeCompare(b.id));
  const recall = attributes.filter((a) => a.reasoning === "recall");
  const estimation = attributes.filter((a) => a.reasoning === "estimation");
  const entities = [...catalog.entities].sort((a, b) => a.id.localeCompare(b.id));
  const result: GenerationResult = {
    algorithmVersion, catalogVersion: catalog.version, seed, profile: structuredClone(profile),
    requested: count, maxAttempts, attempts: 0, exhausted: false,
    stages: {}, rejectionCounts: {}, trace: [], traceDropped: 0, puzzles: [], reports: [],
  };
  const requirementSets = new Set<string>();
  const finish = (trace: Trace) => {
    result.stages[trace.stage] = (result.stages[trace.stage] ?? 0) + 1;
    for (const code of new Set(trace.issues.map((issue) => issue.code)))
      result.rejectionCounts[code] = (result.rejectionCounts[code] ?? 0) + 1;
    if (result.trace.length < traceLimit) result.trace.push(trace);
    else result.traceDropped++;
  };
  while (result.attempts < maxAttempts && result.puzzles.length < count) {
    const estimationCount = profile.estimationCount.min + Math.floor(random() *
      (profile.estimationCount.max - profile.estimationCount.min + 1));
    const chosen = shuffle([
      ...shuffle(estimation, random).slice(0, estimationCount),
      ...shuffle(recall, random).slice(0, profile.requirementCount - estimationCount),
    ], random);
    const trace: Trace = { attempt: ++result.attempts, stage: "requirement-mix", requirementIds: chosen.map((a) => a.id), issues: assessRequirementMix(chosen, profile) };
    if (trace.issues.length) { finish(trace); continue; }
    const key = chosen.map((a) => a.id).sort().join("|");
    const previous = result.puzzles.at(-1);
    const first = result.puzzles[0];
    const closingLoop = result.puzzles.length === count - 1 && count > 1;
    if (requirementSets.has(key) || (previous && chosen.filter((a) => previous.attributeIds.includes(a.id)).length > profile.maxAdjacentRequirementOverlap) ||
        (closingLoop && chosen.filter((a) => first.attributeIds.includes(a.id)).length > profile.maxAdjacentRequirementOverlap)) {
      trace.stage = "schedule-diversity";
      trace.issues = [{ code: "schedule-diversity", message: "Duplicate requirement set or excessive overlap between adjacent days (including the looping schedule boundary)." }];
      finish(trace); continue;
    }
    const exclusions = excludedCountries(chosen);
    for (const id of exclusions.keys())
      if (!entities.some((entity) => entity.id === id)) throw new Error(`Missing excluded country: ${id}`);
    trace.exclusions = [...exclusions].map(([id, reasons]) => ({ id, reasons }));
    const eligible: Entity[] = [];
    trace.ineligibleCountries = [];
    for (const entity of entities) {
      const unverified = chosen.filter((a) => typeof entity.facts[a.id]?.value !== "boolean");
      if (exclusions.has(entity.id)) trace.ineligibleCountries.push({ id: entity.id, reason: "excluded" });
      else if (unverified.length) trace.ineligibleCountries.push({ id: entity.id, reason: "unverified", requirementIds: unverified.map((a) => a.id) });
      else if (!chosen.some((a) => entity.facts[a.id].value)) trace.ineligibleCountries.push({ id: entity.id, reason: "no-matches" });
      else eligible.push(entity);
    }
    trace.eligibleCount = eligible.length;
    if (eligible.length < profile.candidateCount) {
      trace.stage = "eligibility";
      trace.issues = [{ code: "eligible-count", message: `Only ${eligible.length} verified, useful, permitted countries are available.`, actual: eligible.length, min: profile.candidateCount }];
      finish(trace); continue;
    }
    const safe = proposeSafeRoute(eligible, chosen, profile.safeRouteSizes, random);
    if (!safe) {
      trace.stage = "safe-route";
      trace.issues = [{ code: "safe-route-proposal", message: "The bounded private-requirement search found no conservative route." }];
      finish(trace); continue;
    }
    const selected = shuffle([...safe, ...shuffle(eligible.filter((e) => !safe.includes(e)), random)
      .slice(0, profile.candidateCount - safe.length)], random);
    trace.entityIds = selected.map((entity) => entity.id);
    trace.stage = "country-mix";
    trace.issues = assessCountryMix({ entities: selected }, profile);
    if (trace.issues.length) { finish(trace); continue; }
    const definition: PuzzleDefinition = {
      id: `countries-${seed}-${String(result.puzzles.length + 1).padStart(3, "0")}`,
      version: 1, title: "A world of overlaps", entityIds: trace.entityIds,
      attributeIds: trace.requirementIds, authoring: { safeSelectionIds: safe.map((entity) => entity.id) },
      rules: { maxSelected: profile.maxSelected, maxChecks: 3, expectedOptimal: profile.optimalSize, clueMode: "hidden" },
    };
    const puzzle = resolvePuzzle(catalog, definition);
    const report = assessPuzzle(puzzle, profile);
    trace.stage = report.accepted ? "accepted" : "quality";
    trace.issues = report.issues;
    if (report.accepted) {
      result.puzzles.push(definition);
      result.reports.push(report);
      requirementSets.add(key);
    }
    finish(trace);
  }
  result.exhausted = result.puzzles.length < count;
  return result;
}
