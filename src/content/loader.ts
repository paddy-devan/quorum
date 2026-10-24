import scheduleJson from "./puzzles.json";
import type { DailyPuzzle, PuzzleDefinition } from "../game/types";
import { catalog } from "./catalog";
import { loadPuzzle } from "./puzzle";

export { catalog } from "./catalog";
export { loadPuzzle } from "./puzzle";

function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} IDs.`);
}

export const definitions = scheduleJson.puzzles as PuzzleDefinition[];
unique(
  definitions.map((definition) => definition.id),
  "puzzle",
);
export const puzzles = definitions.map((definition) =>
  loadPuzzle(catalog, definition),
);

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

/** Browse the authored week containing this date, wrapping at its ends. */
export function adjacentPuzzle(date: string, direction: -1 | 1): DailyPuzzle {
  const current = dailyPuzzle(date);
  const index = ((current.number - 1) % puzzles.length + puzzles.length) % puzzles.length;
  const nextIndex = (index + direction + puzzles.length) % puzzles.length;
  const nextDate = new Date(`${current.date}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + nextIndex - index);
  return dailyPuzzle(utcDate(nextDate));
}
