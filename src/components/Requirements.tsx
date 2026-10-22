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
    <section className="requirements" aria-labelledby="requirements-heading">
      <div className="section-heading">
        <h2 id="requirements-heading">Requirements</h2>
        <span>
          {check
            ? `${check.coveredIds.length} of ${puzzle.attributes.length}`
            : `${puzzle.attributes.length} to cover`}
        </span>
      </div>
      <ol
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
                <span className="requirement-number">
                  {check && covered ? <TickIcon /> : index + 1}
                </span>
                <span>{attribute.label}</span>
                {check ? (
                  <span className="requirement-status">
                    {covered ? "Met" : "Missing"}
                  </span>
                ) : (
                  <span className="definition-hint" aria-hidden="true">
                    i
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="requirements-note">
        {check
          ? `Coverage from your ${finished ? "best" : "last"} check.`
          : "Tap any requirement for its definition."}
      </p>
    </section>
  );
}
