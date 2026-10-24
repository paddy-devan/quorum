import { useState } from "react";
import { bestCheck, resultLabel, shareText } from "../game/engine";
import { validatePuzzle } from "../game/validator";
import type { DailyPuzzle, Run } from "../game/types";
import { TickIcon } from "./Modal";

export function Results({
  daily,
  run,
  onShare,
}: {
  daily: DailyPuzzle;
  run: Run;
  onShare: () => void;
}) {
  const { puzzle } = daily;
  const best = bestCheck(run.checks);
  const [report] = useState(() => validatePuzzle(puzzle));
  const [shareStatus, setShareStatus] = useState("");
  const [manualShare, setManualShare] = useState("");
  const solution = report.optimalSolutions[0];
  const names = (ids: string[]) =>
    ids
      .map((id) => puzzle.entities.find((entity) => entity.id === id)!.name)
      .join(" + ");
  async function share() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("date", daily.date);
    const text = shareText(
      daily,
      run,
      url.toString(),
    );
    try {
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ text }))
      ) {
        try {
          await navigator.share({ text });
          onShare();
          setShareStatus("Result shared.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
        }
      }
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      onShare();
      setShareStatus("Copied! Ready to share.");
    } catch {
      setManualShare(text);
      setShareStatus("Select and copy your result below.");
    }
  }
  return (
    <section className="results" aria-labelledby="result-heading">
      <div className="result-summary">
        <div className="result-emblem" aria-hidden="true">
          {best?.complete ? (
            <TickIcon />
          ) : (
            <span>
              {best?.coveredIds.length ?? 0}
              <small>/{puzzle.attributes.length}</small>
            </span>
          )}
        </div>
        <h2 id="result-heading">{resultLabel(puzzle, best)}</h2>
        <p className="result-score">
          {best?.complete ? (
            <>
              <strong>{best.entityIds.length} countries.</strong> Every
              requirement covered.
            </>
          ) : (
            <>
              <strong>
                {best?.coveredIds.length ?? 0} of {puzzle.attributes.length}{" "}
                requirements.
              </strong>{" "}
              Try another angle in the next puzzle.
            </>
          )}
        </p>
        {best ? (
          <p className="best-country-names">{names(best.entityIds)}</p>
        ) : (
          <p className="best-country-names">
            You finished without using a check.
          </p>
        )}
        <p className="muted">
          {run.checks.length} of {puzzle.rules.maxChecks} checks used · Your
          best checked result is saved.
        </p>
        <button className="primary-button share-button" onClick={share}>
          Share your Quorum{" "}
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 13V3m0 0L6 7m4-4 4 4M4 11v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="share-status" role="status">
          {shareStatus || "No country names or answers in your shared result."}
        </p>
        {manualShare ? (
          <textarea
            className="manual-share"
            aria-label="Shareable result"
            readOnly
            value={manualShare}
            onFocus={(event) => event.currentTarget.select()}
          />
        ) : null}
      </div>
      <div className="solution-note">
        <h3>One smallest Quorum</h3>
        <p>{names(solution)}</p>
        <span>
          {report.optimalSolutions.length} optimal{" "}
          {report.optimalSolutions.length === 1
            ? "combination"
            : "combinations"}{" "}
          · Minimum {report.minimum} countries
        </span>
      </div>
      <div className="explanation-heading">
        <h3>How your countries connect</h3>
        <p>Explore the facts behind your best checked selection.</p>
      </div>
      <div className="fact-breakdown">
        {puzzle.attributes.map((attribute) => {
          const contributors = puzzle.entities.filter(
            (entity) =>
              best?.entityIds.includes(entity.id) &&
              entity.facts[attribute.id].value,
          );
          return (
            <details key={attribute.id}>
              <summary>
                <span
                  className={`fact-indicator ${contributors.length ? "is-covered" : ""}`}
                  aria-hidden="true"
                >
                  {contributors.length ? <TickIcon /> : "–"}
                </span>
                <span>
                  {attribute.label}
                  <small>
                    {contributors.length
                      ? contributors.map((entity) => entity.name).join(", ")
                      : "Not covered by your best selection"}
                  </small>
                </span>
              </summary>
              <div className="fact-detail">
                <p>{attribute.definition}</p>
                {contributors.map((entity) => (
                  <p key={entity.id}>
                    <strong>{entity.name}.</strong>{" "}
                    {entity.facts[attribute.id].explanation}{" "}
                    <SourceLinks
                      ids={entity.facts[attribute.id].sourceIds}
                      puzzle={puzzle}
                    />
                  </p>
                ))}
              </div>
            </details>
          );
        })}
      </div>
      <details className="all-facts">
        <summary>Explore all {puzzle.entities.length} countries</summary>
        <p className="scope-note">{puzzle.scope}</p>
        {puzzle.entities.map((entity) => (
          <details key={entity.id} className="entity-facts">
            <summary>
              <span aria-hidden="true">{entity.symbol} </span>
              {entity.name}
            </summary>
            <ul>
              {puzzle.attributes.map((attribute) => (
                <li key={attribute.id}>
                  <strong>
                    {entity.facts[attribute.id].value ? "Yes" : "No"} ·{" "}
                    {attribute.label}
                  </strong>
                  <p>
                    {entity.facts[attribute.id].explanation}{" "}
                    <SourceLinks
                      ids={entity.facts[attribute.id].sourceIds}
                      puzzle={puzzle}
                    />
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </details>
      <p className="next-puzzle">Use the arrows beside the puzzle number to try another day.</p>
    </section>
  );
}

function SourceLinks({
  ids,
  puzzle,
}: {
  ids: string[];
  puzzle: DailyPuzzle["puzzle"];
}) {
  return (
    <span className="source-links">
      {ids.map((id, index) => {
        const source = puzzle.sources.find((candidate) => candidate.id === id)!;
        return (
          <a
            key={id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Source: ${source.title}`}
            title={source.title}
          >
            [{index + 1}]
          </a>
        );
      })}
    </span>
  );
}
