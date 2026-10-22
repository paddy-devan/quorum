import { beforeEach, describe, expect, it } from "vitest";
import { dailyPuzzle } from "../content/loader";
import { bestCheck, submitCheck } from "../game/engine";
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
        selectedIds: ["kenya"],
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
      selectedIds: ["kenya"],
    });
    run.checks[0].complete = true;
    run.checks[0].coveredIds = daily.puzzle.attributes.map(
      (attribute) => attribute.id,
    );
    saveRun(storage, daily, run);
    const loaded = loadRun(storage, daily, "p");
    expect(bestCheck(loaded.checks)?.complete).toBe(false);
    expect(bestCheck(loaded.checks)?.coveredIds).toHaveLength(3);
  });
  it("recovers from corrupt JSON, invalid IDs and excessive attempts", () => {
    storage.setItem(runKey(daily, "p"), "{broken");
    expect(loadRun(storage, daily, "p").checks).toEqual([]);
    const run = submitCheck(daily.puzzle, {
      ...newRun(daily, "p"),
      selectedIds: ["kenya"],
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
    for (const id of ["kenya", "brazil", "japan"])
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
