import { describe, expect, it } from "vitest";
import { dailyPuzzle } from "../content/loader";
import { newRun } from "../storage/local";
import { bestCheck, expireRun, startRun, submitCheck, timeExpired, TIMER_DURATION_MS } from "./engine";

const daily = dailyPuzzle("2026-10-22");
const now = Date.parse("2026-10-22T12:00:00Z");
const fresh = () => newRun(daily, "p");

describe("five-minute puzzle mode", () => {
  it("only starts the clock on play and cannot restart it", () => {
    const run = fresh();
    expect(run.startedAt).toBeUndefined();
    expect(timeExpired(run, now + TIMER_DURATION_MS)).toBe(false);
    const started = startRun(run, true, now);
    expect(started.deadline).toBe(now + TIMER_DURATION_MS);
    expect(startRun(started, false, now + 1000)).toBe(started);
    expect(startRun(started, true, now + 1000)).toBe(started);
    const finished = { ...run, finished: true };
    expect(startRun(finished, true, now)).toBe(finished);
  });
  it("allows untimed games without expiring them", () => {
    const run = startRun(fresh(), false, now);
    expect(run.startedAt).toBe(now);
    expect(run.deadline).toBeUndefined();
    expect(expireRun(run, now + TIMER_DURATION_MS * 100)).toBe(run);
  });
  it("expires exactly at the deadline, retaining checks without submitting the selection", () => {
    const started = startRun(fresh(), true, now);
    const checked = submitCheck(daily.puzzle, {
      ...started, selectedIds: [daily.puzzle.entities[0].id],
    }, new Date(now + 1000).toISOString());
    const run = { ...checked, selectedIds: [daily.puzzle.entities[1].id] };
    expect(expireRun(run, started.deadline! - 1)).toBe(run);
    const expired = expireRun(run, started.deadline!);
    expect(expired.finished).toBe(true);
    expect(expired.timedOut).toBe(true);
    expect(expired.checks).toEqual(checked.checks);
    expect(bestCheck(expired.checks)).toEqual(bestCheck(checked.checks));
    expect(expireRun(expired, started.deadline! + 1)).toBe(expired);
  });
  it("ends without checks and detects elapsed time after being away", () => {
    const run = startRun(fresh(), true, now);
    const expired = expireRun(run, now + TIMER_DURATION_MS * 2);
    expect(expired).toMatchObject({ finished: true, timedOut: true, checks: [] });
    expect(expireRun({ ...run, finished: true }, now + TIMER_DURATION_MS * 2).timedOut).toBeUndefined();
  });
  it("rejects checks at and after expiry without consuming a check", () => {
    const run = { ...startRun(fresh(), true, now), selectedIds: [daily.puzzle.entities[0].id] };
    expect(submitCheck(daily.puzzle, run, new Date(run.deadline! - 1).toISOString()).checks).toHaveLength(1);
    for (const at of [run.deadline!, run.deadline! + 10_000])
      expect(() => submitCheck(daily.puzzle, run, new Date(at).toISOString())).toThrow("Time’s up");
    expect(run.checks).toHaveLength(0);
  });
});
