import { useEffect, useState, type CSSProperties } from "react";
import type { Tile } from "../game/engine";

export const FLIP_DURATION = 620;
export const FLIP_STAGGER = 320;

export function ComparisonTile({
  tile,
  label,
  index,
  animate,
  onComplete,
}: {
  tile: Tile;
  label: string;
  index: number;
  animate: boolean;
  onComplete?: () => void;
}) {
  const [revealed, setRevealed] = useState(!animate);
  useEffect(() => {
    if (!animate) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const timer = window.setTimeout(
      () => setRevealed(true),
      index * FLIP_STAGGER + FLIP_DURATION,
    );
    return () => window.clearTimeout(timer);
  }, [animate, index]);
  useEffect(() => {
    if (revealed && animate) onComplete?.();
  }, [revealed, animate, onComplete]);
  const indicator = { green: "✓", yellow: "≈", gray: "×", neutral: "—" }[
    tile.color
  ];
  return (
    <button
      type="button"
      className={`comparison-flip ${animate ? "is-flipping" : ""} ${revealed ? "is-revealed" : ""}`}
      style={
        {
          "--flip-delay": `${index * FLIP_STAGGER}ms`,
          "--flip-duration": `${FLIP_DURATION}ms`,
        } as CSSProperties
      }
      title={revealed ? tile.hint : undefined}
      aria-label={
        revealed
          ? `${label}: ${tile.value}. ${tile.hint}`
          : `Revealing ${label} clue`
      }
      onClick={(e) => {
        if (!revealed) return;
        const el = e.currentTarget;
        el.dataset.explain = el.dataset.explain ? "" : tile.hint;
      }}
    >
      <span className="flip-inner" aria-hidden="true">
        <span className="flip-face flip-front">
          <small>{label}</small>
          <span className="unrevealed-mark">CG</span>
        </span>
        <span className={`flip-face flip-back tile ${tile.color}`}>
          <small>{label}</small>
          <b>{tile.value}</b>
          <span className="indicator">{indicator}</span>
        </span>
      </span>
    </button>
  );
}
