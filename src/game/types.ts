export interface Source {
  id: string;
  title: string;
  url: string;
  retrievedOn?: string;
  license?: string;
}

export type Metric = "population" | "gdpUsd" | "surfaceAreaKm2" | "gdpPerPerson" | "density";

export type RequirementRule =
  | { kind: "comparison"; metric: Metric; year: number; operator: "greater" | "less"; referenceId: string }
  | { kind: "distance"; placeId: string; maxMiles: number }
  | { kind: "closer"; firstPlaceId: string; secondPlaceId: string }
  | { kind: "event"; collectionId: string; fromYear: number; toYear: number }
  | { kind: "regime"; year: number; categories: number[] };

export interface Attribute {
  id: string;
  label: string;
  definition: string;
  rule?: RequirementRule;
  category?: "geography" | "culture" | "history" | "sport" | "economy" | "population";
  difficulty?: "easy" | "medium" | "hard";
  family?: string;
  reasoning?: "recall" | "estimation";
  excludedEntityIds?: string[];
  generationEnabled?: boolean;
}

export interface Measurement {
  value: number | null;
  year: number;
  sourceIds: string[];
}

export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sourceIds: string[];
}

export interface EventCollection {
  id: string;
  name: string;
  fromYear: number;
  toYear: number;
  reviewedEntityIds: string[];
  sourceIds: string[];
  events: { entityId: string; year: number; description: string }[];
}

export interface Fact {
  value: boolean | null;
  explanation: string;
  sourceIds: string[];
}

export interface Entity {
  id: string;
  name: string;
  symbol: string;
  clue: string;
  familiarity?: "familiar" | "moderate" | "less-familiar";
  facts: Record<string, Fact>;
  statistics?: Partial<Record<"population" | "gdpUsd" | "surfaceAreaKm2", Measurement>>;
  capital?: Omit<Place, "id">;
  regimes?: { year: number; category: number; sourceIds: string[] }[];
}

export interface Catalog {
  version: string;
  theme: string;
  scope: string;
  reviewedOn: string;
  sources: Source[];
  attributes: Attribute[];
  entities: Entity[];
  places?: Place[];
  eventCollections?: EventCollection[];
}

export interface PuzzleDefinition {
  id: string;
  version: number;
  title: string;
  entityIds: string[];
  attributeIds: string[];
  authoring?: { safeSelectionIds: string[] };
  rules: {
    maxSelected: number;
    maxChecks: number;
    expectedOptimal: number;
    clueMode: "hidden" | "partial" | "full";
  };
}

export interface Puzzle {
  id: string;
  version: number;
  contentVersion: string;
  title: string;
  theme: string;
  scope: string;
  entities: Entity[];
  attributes: Attribute[];
  sources: Source[];
  rules: PuzzleDefinition["rules"];
}

export interface DailyPuzzle {
  date: string;
  number: number;
  puzzle: Puzzle;
}

export interface Evaluation {
  entityIds: string[];
  coveredIds: string[];
  complete: boolean;
}

export interface Check extends Evaluation {
  id: string;
  submittedAt: string;
}

export interface Participant {
  id: string;
  kind: "anonymous";
  createdAt: string;
}

export interface Run {
  id: string;
  participantId: string;
  puzzleId: string;
  puzzleVersion: number;
  contentVersion: string;
  date: string;
  selectedIds: string[];
  checks: Check[];
  finished: boolean;
}
