import type { Catalog, PuzzleDefinition } from "../game/types";
import { resolvePuzzle } from "./puzzle";
import { assessPuzzle, qualityProfile, validateProfile, type QualityProfile, type QualityReport } from "./quality";
import { evaluate } from "../game/engine";

export interface ScheduleAudit {
  accepted: boolean;
  catalogVersion: string;
  profile: QualityProfile;
  issues: { code: string; message: string }[];
  puzzles: { definition: PuzzleDefinition; report: QualityReport | null; error?: string }[];
}

/** Audit authored and generated boards through the same quality policy. */
export function auditSchedule(catalog: Catalog, definitions: PuzzleDefinition[], profile = qualityProfile): ScheduleAudit {
  validateProfile(profile);
  const issues: ScheduleAudit["issues"] = [];
  if (!definitions.length) issues.push({ code: "empty-schedule", message: "No puzzles supplied." });
  const ids = new Set<string>();
  const sets = new Set<string>();
  const puzzles = definitions.map((definition, index) => {
    if (ids.has(definition.id)) issues.push({ code: "duplicate-id", message: `Repeated puzzle ID: ${definition.id}.` });
    ids.add(definition.id);
    const key = [...definition.attributeIds].sort().join("|");
    if (sets.has(key)) issues.push({ code: "duplicate-requirement-set", message: `Repeated requirement set: ${definition.id}.` });
    sets.add(key);
    // The published testing schedule loops, so check last → first as well.
    const previous = definitions[(index + definitions.length - 1) % definitions.length];
    if (definitions.length > 1 && definition.attributeIds.filter((id) => previous.attributeIds.includes(id)).length > profile.maxAdjacentRequirementOverlap)
      issues.push({ code: "adjacent-overlap", message: `${previous.id} → ${definition.id} exceeds the adjacent requirement overlap limit.` });
    try {
      const puzzle = resolvePuzzle(catalog, definition);
      const report = assessPuzzle(puzzle, profile);
      if (definition.rules.expectedOptimal !== report.analysis.minimum)
        report.issues.push({ code: "claimed-optimum", message: "The claimed optimum differs from the exact minimum." });
      const safe = definition.authoring?.safeSelectionIds ?? [];
      if (!profile.safeRouteSizes.includes(safe.length) || new Set(safe).size !== safe.length ||
          safe.some((id) => !definition.entityIds.includes(id)) || !evaluate(puzzle, safe).complete ||
          safe.some((id) => evaluate(puzzle, safe.filter((candidate) => candidate !== id)).complete))
        report.issues.push({ code: "safe-witness", message: "The stored conservative route must be valid and irreducible." });
      report.accepted = report.issues.length === 0;
      return { definition, report };
    } catch (error) {
      return { definition, report: null, error: error instanceof Error ? error.message : String(error) };
    }
  });
  return { accepted: !issues.length && puzzles.every((p) => p.report?.accepted), catalogVersion: catalog.version, profile: structuredClone(profile), issues, puzzles };
}
