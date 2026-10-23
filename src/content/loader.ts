import catalogJson from "./countries.json";
import scheduleJson from "./puzzles.json";
import demoJson from "./demos.json";
import { resolveCatalog } from "./requirements";
import type {
  Catalog,
  DailyPuzzle,
  Puzzle,
  PuzzleDefinition,
} from "../game/types";
import { validatePuzzle } from "../game/validator";

function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length)
    throw new Error(`Duplicate ${label} IDs.`);
}

export function loadPuzzle(
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
  for (const entity of entities) {
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
  const report = validatePuzzle(puzzle);
  if (!report.solvable || report.minimum !== definition.rules.expectedOptimal) {
    throw new Error(
      `Puzzle ${definition.id} needs an optimum of ${definition.rules.expectedOptimal}; found ${report.minimum ?? "no solution"}.`,
    );
  }
  return puzzle;
}

export const catalog = resolveCatalog(catalogJson as Catalog);
export const definitions = scheduleJson.puzzles as PuzzleDefinition[];
unique(
  definitions.map((definition) => definition.id),
  "puzzle",
);
export const puzzles = definitions.map((definition) =>
  loadPuzzle(catalog, definition),
);

export const demoDefinitions = demoJson.puzzles as PuzzleDefinition[];
unique(demoDefinitions.map((definition) => definition.id), "demo");
export const demoPuzzles = demoDefinitions.map((definition) => loadPuzzle(catalog, definition));

export function demoPuzzle(id: string): DailyPuzzle | null {
  const index = demoPuzzles.findIndex((puzzle) => puzzle.id === id);
  if (index < 0) return null;
  // A fixed date keeps each demo's progress independent of the daily rotation.
  return { date: demoJson.snapshotDate, number: index + 1, puzzle: demoPuzzles[index], demoId: id };
}

export function utcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dailyPuzzle(date = utcDate()): DailyPuzzle {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    utcDate(new Date(`${date}T00:00:00Z`)) !== date
  ) {
    throw new Error("Invalid puzzle date.");
  }
  const offset = Math.floor(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${scheduleJson.epoch}T00:00:00Z`)) /
      86_400_000,
  );
  return {
    date,
    number: offset + 1,
    puzzle:
      puzzles[((offset % puzzles.length) + puzzles.length) % puzzles.length],
  };
}

// Replace this strategy with a real generator later; the engine consumes only
// the returned definition, not the mechanism that authored it.
export type PuzzleGenerator = (input: {
  catalog: Catalog;
  seed: number;
}) => PuzzleDefinition;
export const authoredFixtureGenerator: PuzzleGenerator = ({ seed }) => {
  if (!Number.isInteger(seed) || seed < 0)
    throw new Error("Seed must be a non-negative integer.");
  return structuredClone(definitions[seed % definitions.length]);
};
