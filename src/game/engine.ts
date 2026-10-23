import type { Check, Evaluation, Puzzle, Run } from "./types";

export function evaluate(puzzle: Puzzle, entityIds: string[]): Evaluation {
  if (entityIds.length === 0) throw new Error("Choose at least one country.");
  if (entityIds.length > puzzle.rules.maxSelected)
    throw new Error(`Choose up to ${puzzle.rules.maxSelected} countries.`);
  if (new Set(entityIds).size !== entityIds.length)
    throw new Error("A selection cannot contain duplicates.");
  const entities = entityIds.map((id) => {
    const entity = puzzle.entities.find((candidate) => candidate.id === id);
    if (!entity) throw new Error(`Unknown candidate: ${id}`);
    return entity;
  });
  const coveredIds = puzzle.attributes
    .filter((attribute) => {
      // Unknown and missing facts are authoring errors, never silently false.
      for (const entity of entities) {
        if (typeof entity.facts[attribute.id]?.value !== "boolean") {
          throw new Error(`Unverified fact: ${entity.id} / ${attribute.id}`);
        }
      }
      return entities.some(
        (entity) => entity.facts[attribute.id].value === true,
      );
    })
    .map((attribute) => attribute.id);
  return {
    entityIds: [...entityIds],
    coveredIds,
    complete: coveredIds.length === puzzle.attributes.length,
  };
}

export function bestCheck(checks: Check[]): Check | undefined {
  return checks.reduce<Check | undefined>((best, check) => {
    if (!best) return check;
    if (check.complete !== best.complete) return check.complete ? check : best;
    if (check.coveredIds.length !== best.coveredIds.length)
      return check.coveredIds.length > best.coveredIds.length ? check : best;
    return check.entityIds.length < best.entityIds.length ? check : best;
  }, undefined);
}

export function submitCheck(
  puzzle: Puzzle,
  run: Run,
  submittedAt = new Date().toISOString(),
): Run {
  if (run.finished || run.checks.length >= puzzle.rules.maxChecks)
    throw new Error("This game has finished.");
  const result = evaluate(puzzle, run.selectedIds);
  const signature = [...result.entityIds].sort().join("|");
  if (
    run.checks.some(
      (check) => [...check.entityIds].sort().join("|") === signature,
    )
  ) {
    throw new Error(
      "You’ve already checked this combination. Try changing a country.",
    );
  }
  const checks = [
    ...run.checks,
    { ...result, id: `${run.id}:check:${run.checks.length + 1}`, submittedAt },
  ];
  return { ...run, checks, finished: checks.length >= puzzle.rules.maxChecks };
}

export function resultLabel(puzzle: Puzzle, check?: Evaluation): string {
  if (!check?.complete) return "Incomplete Quorum";
  return check.entityIds.length === puzzle.rules.expectedOptimal
    ? "Perfect Quorum"
    : "Complete Quorum";
}

export function shareText(
  daily: { number: number; date: string; puzzle: Puzzle; demoId?: string },
  run: Run,
  url: string,
): string {
  const best = bestCheck(run.checks);
  const score = best?.complete
    ? `${best.entityIds.length} countries · ${resultLabel(daily.puzzle, best)}`
    : `${best?.coveredIds.length ?? 0}/${daily.puzzle.attributes.length} requirements · Incomplete`;
  const progression = run.checks
    .map(
      (check) =>
        `${check.coveredIds.map(() => "🟩").join("")}${"⬜".repeat(daily.puzzle.attributes.length - check.coveredIds.length)} ${check.entityIds.length}`,
    )
    .join("\n");
  const identity = daily.demoId ? `Quorum demo ${daily.number} · ${daily.puzzle.title}` : `Quorum #${String(daily.number).padStart(3, "0")} · ${daily.date}`;
  return `${identity}\n${score}\n${progression || "No checks used"}\n${run.checks.length}/${daily.puzzle.rules.maxChecks} checks\n${url}`;
}
