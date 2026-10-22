import type { Puzzle } from "../game/types";
import { TickIcon } from "./Modal";

export function CountryGrid({
  puzzle,
  selectedIds,
  finished,
  onToggle,
}: {
  puzzle: Puzzle;
  selectedIds: string[];
  finished: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <section aria-labelledby="countries-heading" className="countries">
      <div className="section-heading">
        <h2 id="countries-heading">Your countries</h2>
        <span>Choose up to {puzzle.rules.maxSelected}</span>
      </div>
      <div className="country-grid">
        {puzzle.entities.map((entity) => {
          const selected = selectedIds.includes(entity.id);
          return (
            <button
              key={entity.id}
              className={`country-card ${selected ? "selected" : ""}`}
              onClick={() => onToggle(entity.id)}
              aria-pressed={selected}
              aria-label={entity.name}
              disabled={finished}
            >
              <span className="country-flag" aria-hidden="true">
                {entity.symbol}
              </span>
              <span className="country-copy">
                <span className="country-name">{entity.name}</span>
                {puzzle.rules.clueMode === "full" ? (
                  <span className="full-clues">
                    {puzzle.attributes
                      .filter((attribute) => entity.facts[attribute.id].value)
                      .map((attribute) => attribute.label)
                      .join(" · ")}
                  </span>
                ) : null}
              </span>
              <span className="selected-mark" aria-hidden="true">
                {selected ? <TickIcon /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
