import { useEffect, useState } from "react";

export function PuzzleTimer({ deadline, finished, timedOut, onExpire }: {
  deadline: number;
  finished: boolean;
  timedOut: boolean;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (finished) return;
    function tick() {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) onExpire();
    }
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, finished, onExpire]);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const urgent = !finished && seconds <= 60;
  return (
    <div className={`puzzle-timer ${urgent ? "is-urgent" : ""}`}>
      <span>{finished ? (timedOut ? "Time’s up" : "Timer stopped") : "Time remaining"}</span>
      <strong role="timer" aria-label="Time remaining" aria-live="off">
        {finished ? (timedOut ? "0:00" : "Finished") : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      </strong>
      <span className="timer-notice" role="status">{urgent ? "Final minute — make your checks count." : ""}</span>
    </div>
  );
}
