import type { Attribute, Check, Puzzle } from "../game/types";
import { TickIcon } from "./Modal";

export function Requirements({
  puzzle,
  check,
  finished,
  onDefinition,
}: {
  puzzle: Puzzle;
  check?: Check;
  finished: boolean;
  onDefinition: (attribute: Attribute) => void;
}) {
  return (
    <section className="requirements" aria-label="Requirements">
      <div className="section-heading">
        <h2 id="requirements-heading">Requirements</h2>
      </div>
      <ul
        key={check?.id ?? "unchecked"}
        className={`requirement-list ${check ? "has-feedback" : ""}`}
      >
        {puzzle.attributes.map((attribute, index) => {
          const covered = check?.coveredIds.includes(attribute.id);
          return (
            <li
              key={attribute.id}
              className={check ? (covered ? "covered" : "uncovered") : ""}
              style={
                { "--reveal-delay": `${index * 45}ms` } as React.CSSProperties
              }
            >
              <button
                className="requirement"
                onClick={() => onDefinition(attribute)}
                aria-label={`${attribute.label}${check ? (covered ? ", covered" : ", not covered") : ""}. View definition`}
              >
                <span className="requirement-checkbox" aria-hidden="true">
                  {check && covered ? <TickIcon /> : null}
                </span>
                <span>{attribute.label}</span>
                <span className="definition-hint" aria-hidden="true">
                  i
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {check ? (
        <p className="requirements-note">
          Coverage from your {finished ? "best" : "last"} check.
        </p>
      ) : null}
    </section>
  );
}
