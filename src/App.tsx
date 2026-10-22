import { useEffect, useRef, useState } from "react";
import { dailyPuzzle, puzzles, utcDate } from "./content/loader";
import { bestCheck, resultLabel, submitCheck } from "./game/engine";
import type { Attribute, DailyPuzzle } from "./game/types";
import {
  loadRun,
  participant,
  recordEvent,
  runKey,
  saveRun,
  storageAvailable,
  type AnalyticsEvent,
  type StoragePort,
} from "./storage/local";
import { CountryGrid } from "./components/CountryGrid";
import { Help } from "./components/Help";
import { ArrowIcon, Modal } from "./components/Modal";
import { Requirements } from "./components/Requirements";
import { Results } from "./components/Results";

const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(
  window.location.hostname,
);
const testDate = isLocal
  ? new URLSearchParams(window.location.search).get("date")
  : null;

function startingDaily() {
  try {
    return dailyPuzzle(testDate || utcDate());
  } catch {
    return dailyPuzzle();
  }
}

function memoryStorage(): StoragePort {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export default function App() {
  const [daily, setDaily] = useState(startingDaily);
  const [local] = useState(() => {
    const persistent = storageAvailable();
    const storage = persistent ? window.localStorage : memoryStorage();
    return { storage, persistent, person: participant(storage) };
  });
  useEffect(() => {
    if (testDate) return;
    function rollover() {
      setDaily((previous) =>
        previous.date === utcDate() ? previous : dailyPuzzle(),
      );
    }
    const timer = window.setInterval(rollover, 15_000);
    document.addEventListener("visibilitychange", rollover);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", rollover);
    };
  }, []);
  return <Game key={daily.date} daily={daily} local={local} />;
}

function Game({
  daily,
  local,
}: {
  daily: DailyPuzzle;
  local: {
    storage: StoragePort;
    persistent: boolean;
    person: ReturnType<typeof participant>;
  };
}) {
  const { puzzle } = daily;
  const { storage, person } = local;
  const [run, setRun] = useState(() => loadRun(storage, daily, person.id));
  const [help, setHelp] = useState(false);
  const [definition, setDefinition] = useState<Attribute | null>(null);
  const [confirm, setConfirm] = useState<"finish" | "reset" | null>(null);
  const [message, setMessage] = useState("");
  const [saveProblem, setSaveProblem] = useState(!local.persistent);
  const [showIntro, setShowIntro] = useState(
    () => !storage.getItem("quorum:v1:tutorial-seen"),
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const remaining = puzzle.rules.maxChecks - run.checks.length;
  const lastCheck = run.checks.at(-1);
  const best = bestCheck(run.checks);
  const displayCheck = run.finished ? best : lastCheck;
  const selectionChanged =
    lastCheck &&
    [...lastCheck.entityIds].sort().join("|") !==
      [...run.selectedIds].sort().join("|");

  function track(
    type: AnalyticsEvent["type"],
    current = run,
    outcome?: string,
  ) {
    try {
      recordEvent(storage, {
        type,
        at: new Date().toISOString(),
        participantId: person.id,
        runId: current.id,
        date: daily.date,
        puzzleId: puzzle.id,
        outcome,
        returning: person.createdAt.slice(0, 10) !== daily.date,
      });
    } catch {
      /* Analytics must never interrupt a game. */
    }
  }

  useEffect(() => {
    try {
      saveRun(storage, daily, run);
    } catch {
      setSaveProblem(true);
    }
  }, [storage, daily, run]);

  useEffect(() => {
    track("visit");
  }, []); // One event per run, deduplicated in the repository.

  function toggle(id: string) {
    if (run.finished) return;
    setMessage("");
    if (
      !run.selectedIds.includes(id) &&
      run.selectedIds.length >= puzzle.rules.maxSelected
    ) {
      setMessage(
        `You’ve chosen ${puzzle.rules.maxSelected} countries. Remove one to make room.`,
      );
      return;
    }
    const selectedIds = run.selectedIds.includes(id)
      ? run.selectedIds.filter((selected) => selected !== id)
      : [...run.selectedIds, id];
    setRun({ ...run, selectedIds });
    if (selectedIds.length) track("start");
  }

  function check() {
    try {
      const next = submitCheck(puzzle, run);
      setRun(next);
      setMessage("");
      if (run.checks.length === 0) track("first_check", next);
      track("check", next);
      if (next.finished) finish(next);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not check this selection.",
      );
    }
  }

  function finish(current = run) {
    const next = { ...current, finished: true };
    setRun(next);
    setConfirm(null);
    setMessage("");
    track("finish", next, resultLabel(puzzle, bestCheck(next.checks)));
    window.setTimeout(
      () =>
        resultRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      80,
    );
  }

  function closeHelp() {
    setHelp(false);
    setShowIntro(false);
    try {
      storage.setItem("quorum:v1:tutorial-seen", "true");
    } catch {
      /* Optional preference. */
    }
  }

  function reset() {
    storage.removeItem(runKey(daily, person.id));
    window.location.reload();
  }

  function exportEvents() {
    const blob = new Blob([storage.getItem("quorum:v1:events") || "[]"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quorum-local-events.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="header-brand">
          <a
            href={window.location.pathname}
            className="wordmark"
            aria-label="Quorum, today’s puzzle"
          >
            Quorum<span className="wordmark-dot">.</span>
          </a>
          <h1 className="header-title">{puzzle.title}</h1>
        </div>
        <button className="help-button" onClick={() => setHelp(true)}>
          How to play <span aria-hidden="true">?</span>
        </button>
      </header>
      <main>
        <div className="puzzle-meta">
          <span>
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${daily.date}T12:00:00Z`))}
          </span>
          <span className="meta-dot" aria-hidden="true">
            ·
          </span>
          <span>Puzzle #{String(daily.number).padStart(3, "0")}</span>
          <span className="theme-label">{puzzle.theme}</span>
        </div>
        <div className="intro">
          <p>
            Meet all {puzzle.attributes.length} requirements.{" "}
            <span>Aim for {puzzle.rules.expectedOptimal} countries.</span>
          </p>
        </div>
        {saveProblem ? (
          <p className="storage-warning" role="status">
            Browser storage is unavailable. You can play, but progress may be
            lost when you leave this page.
          </p>
        ) : null}
        {showIntro && !run.finished && !run.checks.length ? (
          <div className="first-play">
            <p>
              <strong>A country can cover more than one requirement.</strong>{" "}
              Your selection works as a team.
            </p>
            <button onClick={() => setHelp(true)}>
              Try an example <ArrowIcon />
            </button>
          </div>
        ) : null}
        <div className="game-layout">
          <CountryGrid
            puzzle={puzzle}
            selectedIds={
              run.finished ? (best?.entityIds ?? []) : run.selectedIds
            }
            finished={run.finished}
            onToggle={toggle}
          />
          <Requirements
            puzzle={puzzle}
            check={displayCheck}
            finished={run.finished}
            onDefinition={setDefinition}
          />
          <div className="play-area">
            {run.finished ? (
              <div className="finished-strip">
                Today’s Quorum is complete.{" "}
                <button
                  onClick={() =>
                    resultRef.current?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  See your result
                </button>
              </div>
            ) : (
              <>
                <div className="check-bar">
                  <div className="selection-count">
                    <strong>
                      {run.selectedIds.length}{" "}
                      <span>of {puzzle.rules.maxSelected}</span>
                    </strong>
                    <span>selected</span>
                    <button
                      className="clear-selection"
                      disabled={!run.selectedIds.length}
                      onClick={() => {
                        setRun({ ...run, selectedIds: [] });
                        setMessage("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="checks-left">
                    <span className="check-dots" aria-hidden="true">
                      {Array.from(
                        { length: puzzle.rules.maxChecks },
                        (_, index) => (
                          <i
                            key={index}
                            className={index < remaining ? "available" : ""}
                          />
                        ),
                      )}
                    </span>
                    <span>
                      {remaining} {remaining === 1 ? "check" : "checks"} left
                    </span>
                    <button
                      className="finish-button"
                      onClick={() => setConfirm("finish")}
                    >
                      Finish & reveal <ArrowIcon />
                    </button>
                  </div>
                  <button
                    className="primary-button check-button"
                    onClick={check}
                    disabled={!run.selectedIds.length}
                  >
                    Check selection
                  </button>
                </div>
                <div className="selection-tray" aria-label="Selected countries">
                  {run.selectedIds.length ? (
                    <span>
                      {run.selectedIds
                        .map(
                          (id) =>
                            puzzle.entities.find(
                              (entity) => entity.id === id,
                            )!.name,
                        )
                        .join(" + ")}
                    </span>
                  ) : (
                    <span>Pick your first country to get started.</span>
                  )}
                </div>
                {message || selectionChanged ? (
                  <p className="interaction-message" role="status">
                    {message ||
                      "Selection changed. Requirement feedback still shows your last check."}
                  </p>
                ) : null}
              </>
            )}
            {lastCheck && !run.finished ? (
              <div className="check-feedback" key={lastCheck.id} role="status">
                <div>
                  <strong>
                    {lastCheck.complete
                      ? "All requirements covered."
                      : `${lastCheck.coveredIds.length} of ${puzzle.attributes.length} covered.`}
                  </strong>
                  <p>
                    {lastCheck.complete
                      ? lastCheck.entityIds.length ===
                        puzzle.rules.expectedOptimal
                        ? "A perfect Quorum. Finish to explore the facts."
                        : `Your ${lastCheck.entityIds.length}-country solution is safe. Can you make it smaller?`
                      : "Look for countries that fill the missing requirements."}
                  </p>
                </div>
                {best?.complete && !lastCheck.complete ? (
                  <p className="saved-best">
                    Your complete {best.entityIds.length}-country Quorum is
                    still saved.
                  </p>
                ) : null}
              </div>
            ) : null}
            {run.checks.length ? (
              <section className="history" aria-labelledby="history-heading">
                <div className="section-heading">
                  <h2 id="history-heading">Your checks</h2>
                  {best?.complete ? (
                    <span>Best: {best.entityIds.length} countries</span>
                  ) : null}
                </div>
                {run.checks.map((attempt, index) => (
                  <div className="history-row" key={attempt.id}>
                    <span>#{index + 1}</span>
                    <span
                      className="history-squares"
                      aria-label={`${attempt.coveredIds.length} of ${puzzle.attributes.length} requirements covered`}
                    >
                      {puzzle.attributes.map((attribute) => (
                        <i
                          key={attribute.id}
                          className={
                            attempt.coveredIds.includes(attribute.id)
                              ? "filled"
                              : ""
                          }
                        />
                      ))}
                    </span>
                    <span>
                      {attempt.coveredIds.length}/{puzzle.attributes.length}
                    </span>
                    <span>
                      {attempt.entityIds.length}{" "}
                      {attempt.entityIds.length === 1 ? "country" : "countries"}
                    </span>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>
        {run.finished ? (
          <div ref={resultRef} className="result-anchor">
            <Results daily={daily} run={run} onShare={() => track("share")} />
          </div>
        ) : null}
        {isLocal ? (
          <details className="local-tools">
            <summary>Local testing</summary>
            <p>
              {puzzles.length} authored puzzles rotate by UTC date. These
              controls are available on localhost only.
            </p>
            <label>
              Preview a day{" "}
              <input
                type="date"
                value={daily.date}
                onChange={(event) => {
                  if (event.target.value)
                    window.location.search = `?date=${event.target.value}`;
                }}
              />
            </label>
            <div>
              <button
                className="text-button"
                onClick={() => setConfirm("reset")}
              >
                Reset this day’s progress
              </button>
              <button className="text-button" onClick={exportEvents}>
                Export local events
              </button>
            </div>
            <p className="muted">
              Facts: {puzzle.contentVersion} · {puzzle.id} v{puzzle.version}
            </p>
          </details>
        ) : null}
      </main>
      {help ? <Help maxSelected={puzzle.rules.maxSelected} onClose={closeHelp} /> : null}
      {definition ? (
        <Modal title={definition.label} onClose={() => setDefinition(null)}>
          <p>{definition.definition}</p>
          <p className="scope-note">{puzzle.scope}</p>
          <button
            className="primary-button wide"
            onClick={() => setDefinition(null)}
          >
            Got it
          </button>
        </Modal>
      ) : null}
      {confirm ? (
        <Modal
          title={
            confirm === "finish" ? "Ready to reveal?" : "Reset this local game?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "finish"
              ? `This ends your game and reveals the facts. ${remaining} ${remaining === 1 ? "check remains" : "checks remain"}. Only checked combinations count towards your result.`
              : "Your checks and selection for this day will be cleared. Other days and your anonymous identity will be kept."}
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setConfirm(null)}
            >
              Keep playing
            </button>
            <button
              className="primary-button"
              onClick={() => (confirm === "finish" ? finish() : reset())}
            >
              {confirm === "finish" ? "Finish & reveal" : "Reset game"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
