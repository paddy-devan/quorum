import { beforeEach, describe, expect, it } from "vitest";
import { adjacentPuzzle, dailyPuzzle } from "../content/loader";
import { bestCheck, expireRun, startRun, submitCheck } from "../game/engine";
import {
  loadRun,
  newRun,
  participant,
  recordEvent,
  runKey,
  saveRun,
  type StoragePort,
} from "./local";

let storage: StoragePort;
const daily = dailyPuzzle("2026-10-22");
const country = daily.puzzle.entities[0].id;
beforeEach(() => {
  const memory = new Map<string, string>();
  storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
});

describe("local persistence", () => {
  it("restores a day's checks after browsing away and back", () => {
    const other = adjacentPuzzle(daily.date, 1);
    const run = submitCheck(daily.puzzle, { ...newRun(daily, "p"), selectedIds: [country] });
    saveRun(storage, daily, run);
    expect(loadRun(storage, other, "p").selectedIds).toEqual([]);
    expect(loadRun(storage, adjacentPuzzle(other.date, -1), "p")).toEqual(run);
    const repeat = dailyPuzzle("2026-10-29");
    expect(repeat.puzzle.id).toBe(daily.puzzle.id);
    expect(loadRun(storage, repeat, "p").selectedIds).toEqual([]);
  });
  it("keeps a stable anonymous identity and a separate run per day", () => {
    const person = participant(storage);
    expect(participant(storage)).toEqual(person);
    const run = newRun(daily, person.id);
    saveRun(storage, daily, run);
    expect(loadRun(storage, daily, person.id).id).toBe(run.id);
    expect(loadRun(storage, dailyPuzzle("2026-10-23"), person.id).id).not.toBe(
      run.id,
    );
  });
  it("restores selection, checks and early completion across refreshes", () => {
    const run = {
      ...submitCheck(daily.puzzle, {
        ...newRun(daily, "p"),
        selectedIds: [country],
      }),
      finished: true,
    };
    saveRun(storage, daily, run);
    expect(loadRun(storage, daily, "p")).toEqual(run);
    expect(() =>
      submitCheck(daily.puzzle, loadRun(storage, daily, "p")),
    ).toThrow();
  });
  it("recalculates persisted coverage instead of trusting stored scores", () => {
    const run = submitCheck(daily.puzzle, {
      ...newRun(daily, "p"),
      selectedIds: [country],
    });
    const expectedCoverage = [...run.checks[0].coveredIds];
    run.checks[0].complete = true;
    run.checks[0].coveredIds = daily.puzzle.attributes.map(
      (attribute) => attribute.id,
    );
    saveRun(storage, daily, run);
    const loaded = loadRun(storage, daily, "p");
    expect(bestCheck(loaded.checks)?.complete).toBe(false);
    expect(bestCheck(loaded.checks)?.coveredIds).toEqual(expectedCoverage);
  });
  it("recovers from corrupt JSON, invalid IDs and excessive attempts", () => {
    storage.setItem(runKey(daily, "p"), "{broken");
    expect(loadRun(storage, daily, "p").checks).toEqual([]);
    const run = submitCheck(daily.puzzle, {
      ...newRun(daily, "p"),
      selectedIds: [country],
    });
    run.checks[0].entityIds = ["absent"];
    saveRun(storage, daily, run);
    expect(loadRun(storage, daily, "p").checks).toEqual([]);
    run.checks = Array.from({ length: 4 }, () => run.checks[0]);
    saveRun(storage, daily, run);
    expect(loadRun(storage, daily, "p").checks).toEqual([]);
  });
  it("retains the check limit even when stored completion was cleared", () => {
    let run = newRun(daily, "p");
    for (const id of daily.puzzle.entities.slice(0, 3).map((entity) => entity.id))
      run = submitCheck(daily.puzzle, { ...run, selectedIds: [id] });
    saveRun(storage, daily, { ...run, finished: false });
    expect(loadRun(storage, daily, "p").finished).toBe(true);
  });
  it("isolates participant identities and content versions", () => {
    saveRun(storage, daily, newRun(daily, "a"));
    expect(loadRun(storage, daily, "b").participantId).toBe("b");
    const updated = {
      ...daily,
      puzzle: { ...daily.puzzle, contentVersion: "countries-2" },
    };
    expect(runKey(daily, "a")).not.toBe(runKey(updated, "a"));
    const revisedPuzzle = {
      ...daily,
      puzzle: { ...daily.puzzle, version: daily.puzzle.version + 1 },
    };
    expect(runKey(daily, "a")).not.toBe(runKey(revisedPuzzle, "a"));
    expect(loadRun(storage, revisedPuzzle, "a").checks).toEqual([]);
  });
  it("restores timed and untimed starts without resetting the deadline", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    const run = startRun(newRun(daily, "p"), true, now);
    saveRun(storage, daily, run);
    const loaded = loadRun(storage, daily, "p");
    expect(loaded).toEqual(run);
    expect(startRun(loaded, true, now + 1000).deadline).toBe(run.deadline);
    const expired = expireRun(loaded, now + 300_000);
    saveRun(storage, daily, expired);
    expect(loadRun(storage, daily, "p")).toEqual(expired);
    const untimed = startRun(newRun(daily, "p"), false, now);
    saveRun(storage, daily, untimed);
    expect(loadRun(storage, daily, "p")).toEqual(untimed);
    expect(loadRun(storage, adjacentPuzzle(daily.date, 1), "p").startedAt).toBeUndefined();
  });
  it("recovers from malformed timer metadata", () => {
    for (const fields of [
      { startedAt: "bad" }, { startedAt: -1 }, { deadline: 300000 },
      { startedAt: 1000, deadline: 2000 }, { timedOut: "yes" },
    ]) {
      const run = { ...newRun(daily, "p"), ...fields };
      storage.setItem(runKey(daily, "p"), JSON.stringify(run));
      expect(loadRun(storage, daily, "p").id).not.toBe(run.id);
    }
  });
  it("deduplicates lifecycle telemetry locally and bounds retained events", () => {
    const event = {
      type: "visit" as const,
      at: "2026-10-22T12:00:00Z",
      participantId: "p",
      runId: "r",
      date: daily.date,
      puzzleId: daily.puzzle.id,
    };
    recordEvent(storage, event);
    recordEvent(storage, event);
    expect(JSON.parse(storage.getItem("quorum:v1:events")!)).toHaveLength(1);
    for (let i = 0; i < 510; i++)
      recordEvent(storage, { ...event, type: "share" });
    expect(JSON.parse(storage.getItem("quorum:v1:events")!)).toHaveLength(500);
  });
});
