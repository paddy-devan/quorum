export interface Source {
  id: string;
  title: string;
  url: string;
}

export interface Attribute {
  id: string;
  label: string;
  definition: string;
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
  facts: Record<string, Fact>;
}

export interface Catalog {
  version: string;
  theme: string;
  scope: string;
  reviewedOn: string;
  sources: Source[];
  attributes: Attribute[];
  entities: Entity[];
}

export interface PuzzleDefinition {
  id: string;
  version: number;
  title: string;
  entityIds: string[];
  attributeIds: string[];
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
