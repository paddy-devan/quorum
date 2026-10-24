import type { Catalog, Puzzle, PuzzleDefinition } from "../game/types";
import { validatePuzzle } from "../game/validator";
import { excludedCountries } from "./eligibility";

function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length)
    throw new Error(`Duplicate ${label} IDs.`);
}

export function resolvePuzzle(
  catalog: Catalog,
  definition: PuzzleDefinition,
): Puzzle {
  if (
    !catalog.version ||
    !catalog.theme ||
    !catalog.scope ||
    !definition.id ||
    !Number.isInteger(definition.version) ||
    definition.version < 1
  ) {
    throw new Error(
      "Content needs stable identifiers, versions and a geographical scope.",
    );
  }
  unique(
    catalog.entities.map((entity) => entity.id),
    "entity",
  );
  unique(
    catalog.attributes.map((attribute) => attribute.id),
    "attribute",
  );
  unique(
    catalog.sources.map((source) => source.id),
    "source",
  );
  unique(definition.entityIds, "candidate");
  unique(definition.attributeIds, "requirement");
  if (!["hidden", "partial", "full"].includes(definition.rules.clueMode))
    throw new Error("Invalid clue mode.");
  for (const source of catalog.sources) {
    if (!source.title.trim() || !/^https?:\/\//.test(source.url))
      throw new Error(`Invalid source: ${source.id}`);
  }
  const entities = definition.entityIds.map((id) => {
    const entity = catalog.entities.find((candidate) => candidate.id === id);
    if (!entity) throw new Error(`Missing entity: ${id}`);
    if (!entity.name.trim() || !entity.symbol.trim())
      throw new Error(`Missing display metadata: ${id}`);
    return entity;
  });
  const attributes = definition.attributeIds.map((id) => {
    const attribute = catalog.attributes.find(
      (candidate) => candidate.id === id,
    );
    if (!attribute || !attribute.label.trim() || !attribute.definition.trim())
      throw new Error(`Missing attribute: ${id}`);
    return attribute;
  });
  const exclusions = excludedCountries(attributes);
  for (const id of exclusions.keys())
    if (!catalog.entities.some((entity) => entity.id === id))
      throw new Error(`Missing excluded country: ${id}`);
  for (const entity of entities) {
    if (exclusions.has(entity.id))
      throw new Error(`Excluded country: ${entity.id}; ${exclusions.get(entity.id)!.join("; ")}`);
    for (const attribute of attributes) {
      const fact = entity.facts[attribute.id];
      if (typeof fact?.value !== "boolean")
        throw new Error(`Unverified fact: ${entity.id} / ${attribute.id}`);
      if (
        !fact.explanation.trim() ||
        !fact.sourceIds.length ||
        fact.sourceIds.some(
          (id) => !catalog.sources.some((source) => source.id === id),
        )
      ) {
        throw new Error(
          `Missing fact evidence: ${entity.id} / ${attribute.id}`,
        );
      }
    }
  }
  const puzzle: Puzzle = {
    id: definition.id,
    version: definition.version,
    contentVersion: catalog.version,
    theme: catalog.theme,
    scope: catalog.scope,
    title: definition.title,
    entities,
    attributes,
    sources: catalog.sources,
    rules: definition.rules,
  };
  return puzzle;
}

export function loadPuzzle(catalog: Catalog, definition: PuzzleDefinition): Puzzle {
  const puzzle = resolvePuzzle(catalog, definition);
  const report = validatePuzzle(puzzle);
  if (!report.solvable || report.minimum !== definition.rules.expectedOptimal)
    throw new Error(`Puzzle ${definition.id} needs an optimum of ${definition.rules.expectedOptimal}; found ${report.minimum ?? "no solution"}.`);
  return puzzle;
}
