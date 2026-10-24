import { useState } from "react";
import { Modal, TickIcon } from "./Modal";

export function Help({
  maxSelected,
  onClose,
}: {
  maxSelected: number;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const sample = [
    { id: "a", name: "Island A", facts: ["Mountains", "Coast"] },
    { id: "b", name: "Island B", facts: ["Coast", "Forest"] },
  ];
  const covered = new Set(
    sample
      .filter((item) => selected.includes(item.id))
      .flatMap((item) => item.facts),
  );
  return (
    <Modal title="A smaller Quorum." onClose={onClose}>
      <p>
        Find countries that <strong>together meet every requirement</strong>.
        One country can cover several; each requirement only needs to be met
        once.
      </p>
      <ol className="help-steps">
        <li>
          <strong>Choose.</strong> Select up to {maxSelected} countries. Use your
          knowledge to work out which requirements they cover.
        </li>
        <li>
          <strong>Check.</strong> You have three checks. Each reveals the
          requirements your whole selection covers.
        </li>
        <li>
          <strong>Refine.</strong> Use fewer countries. A complete solution
          stays safe even if your next check misses.
        </li>
      </ol>
      <p>
        During testing, use the arrows beside the puzzle number to try another
        day. Each day keeps its own progress. The Quorum logo returns to today.
      </p>
      <p>
        Choose the optional 5-minute timer on the welcome screen before you start.
        It keeps running while you’re away or reading help. At zero, play ends
        and only your best checked selection counts.
      </p>
      <div className="tutorial">
        <h3>Try a tiny example</h3>
        <p>These are imaginary islands, just to show the idea.</p>
        <div className="tutorial-options">
          {sample.map((item) => (
            <button
              key={item.id}
              className={`tutorial-choice ${selected.includes(item.id) ? "selected" : ""}`}
              aria-pressed={selected.includes(item.id)}
              onClick={() => {
                setChecked(false);
                setSelected((previous) =>
                  previous.includes(item.id)
                    ? previous.filter((id) => id !== item.id)
                    : [...previous, item.id],
                );
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.facts.join(" + ")}</span>
            </button>
          ))}
        </div>
        <button
          className="secondary-button"
          disabled={!selected.length}
          onClick={() => setChecked(true)}
        >
          Check example
        </button>
        <div className="tutorial-feedback" role="status">
          {checked ? (
            <>
              <strong>{covered.size}/3 requirements covered.</strong>{" "}
              {covered.size === 3
                ? "Together, the two islands cover everything."
                : "Add the other island to cover the missing requirement."}
            </>
          ) : (
            "Select an island, then check its coverage."
          )}
        </div>
      </div>
      <p className="help-score">
        <span className="tiny-tick">
          <TickIcon />
        </span>{" "}
        Three countries is perfect. Four to {maxSelected} is complete. You can finish
        early to reveal the facts.
      </p>
      <button className="primary-button wide" onClick={onClose}>
        Got it
      </button>
    </Modal>
  );
}
