import { evaluate } from "../game/engine";
import type { DailyPuzzle, Participant, Run } from "../game/types";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AnalyticsEvent {
  type: "visit" | "start" | "first_check" | "check" | "finish" | "share";
  at: string;
  participantId: string;
  runId: string;
  date: string;
  puzzleId: string;
  outcome?: string;
  returning?: boolean;
}

function read(storage: StoragePort, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function participant(storage: StoragePort): Participant {
  const stored = read(
    storage,
    "quorum:v1:participant",
  ) as Partial<Participant> | null;
  if (
    stored?.kind === "anonymous" &&
    typeof stored.id === "string" &&
    stored.id &&
    typeof stored.createdAt === "string"
  )
    return stored as Participant;
  const created: Participant = {
    id: crypto.randomUUID(),
    kind: "anonymous",
    createdAt: new Date().toISOString(),
  };
  storage.setItem("quorum:v1:participant", JSON.stringify(created));
  return created;
}

export function runKey(daily: DailyPuzzle, participantId: string): string {
  return `quorum:v1:run:${participantId}:${daily.date}:${daily.puzzle.id}:${daily.puzzle.version}:${daily.puzzle.contentVersion}`;
}

export function newRun(daily: DailyPuzzle, participantId: string): Run {
  return {
    id: crypto.randomUUID(),
    participantId,
    date: daily.date,
    puzzleId: daily.puzzle.id,
    puzzleVersion: daily.puzzle.version,
    contentVersion: daily.puzzle.contentVersion,
    selectedIds: [],
    checks: [],
    finished: false,
  };
}

export function loadRun(
  storage: StoragePort,
  daily: DailyPuzzle,
  participantId: string,
): Run {
  const stored = read(
    storage,
    runKey(daily, participantId),
  ) as Partial<Run> | null;
  const fresh = () => newRun(daily, participantId);
  if (!stored) return fresh();
  if (
    typeof stored.id !== "string" ||
    !stored.id ||
    stored.participantId !== participantId ||
    stored.date !== daily.date ||
    stored.puzzleId !== daily.puzzle.id ||
    stored.puzzleVersion !== daily.puzzle.version ||
    stored.contentVersion !== daily.puzzle.contentVersion ||
    !Array.isArray(stored.checks) ||
    stored.checks.length > daily.puzzle.rules.maxChecks ||
    typeof stored.finished !== "boolean"
  )
    return fresh();
  try {
    const signatures = new Set<string>();
    const checks = stored.checks.map((check, index) => {
      if (
        !check ||
        !Array.isArray(check.entityIds) ||
        check.entityIds.some((id) => typeof id !== "string") ||
        typeof check.submittedAt !== "string"
      )
        throw new Error("Invalid stored check.");
      const signature = [...check.entityIds].sort().join("|");
      if (signatures.has(signature))
        throw new Error("Duplicate stored checks.");
      signatures.add(signature);
      // Recalculate coverage and completion instead of trusting stored scores.
      return {
        ...evaluate(daily.puzzle, check.entityIds),
        id: `${stored.id}:check:${index + 1}`,
        submittedAt: check.submittedAt,
      };
    });
    const selectedIds =
      Array.isArray(stored.selectedIds) &&
      stored.selectedIds.length <= daily.puzzle.rules.maxSelected &&
      new Set(stored.selectedIds).size === stored.selectedIds.length &&
      stored.selectedIds.every(
        (id) =>
          typeof id === "string" &&
          daily.puzzle.entities.some((entity) => entity.id === id),
      )
        ? stored.selectedIds
        : [];
    return {
      ...(stored as Run),
      checks,
      selectedIds,
      finished:
        stored.finished || checks.length === daily.puzzle.rules.maxChecks,
    };
  } catch {
    return fresh();
  }
}

export function saveRun(storage: StoragePort, daily: DailyPuzzle, run: Run) {
  storage.setItem(runKey(daily, run.participantId), JSON.stringify(run));
}

export function recordEvent(storage: StoragePort, event: AnalyticsEvent) {
  const stored = read(storage, "quorum:v1:events");
  const events: AnalyticsEvent[] = Array.isArray(stored) ? stored : [];
  // One visit per day/run and one lifecycle event; share/check actions can repeat.
  if (
    !["share", "check"].includes(event.type) &&
    events.some(
      (previous) =>
        previous.type === event.type && previous.runId === event.runId,
    )
  )
    return;
  storage.setItem(
    "quorum:v1:events",
    JSON.stringify([...events, event].slice(-500)),
  );
}

export function storageAvailable(): boolean {
  try {
    const key = "quorum:storage-probe";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
