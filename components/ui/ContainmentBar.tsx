"use client";

import { useEffect, useState } from "react";

interface ContainmentBarProps {
  cases: number;
  countries: number;
  threshold?: number;
}

export default function ContainmentBar({
  cases,
  countries,
  threshold = 100,
}: ContainmentBarProps) {
  // "Spread index": composite of cases vs threshold and countries
  const target = Math.min(
    100,
    Math.round((cases / threshold) * 60 + countries * 7)
  );
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setPct(target), 100);
    return () => clearTimeout(id);
  }, [target]);

  let level: string;
  let levelColor: string;
  if (target < 20) {
    level = "Contained";
    levelColor = "var(--color-success)";
  } else if (target < 50) {
    level = "Localised";
    levelColor = "var(--color-warning)";
  } else if (target < 75) {
    level = "Spreading";
    levelColor = "var(--color-accent)";
  } else {
    level = "Critical";
    levelColor = "var(--color-accent)";
  }

  return (
    <div className="hud-frame p-4">
      <span className="hud-corner-tl" />
      <span className="hud-corner-br" />
      <div className="flex items-center justify-between mb-2">
        <span className="font-data text-[10px] uppercase tracking-widest text-color-text-muted">
          Spread index
        </span>
        <span
          className="font-data text-[10px] uppercase tracking-widest"
          style={{ color: levelColor }}
        >
          [ {level} ]
        </span>
      </div>
      <div
        className="containment-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={target}
        aria-label={`Spread index: ${level}, ${target} of 100`}
      >
        <div className="containment-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 font-data text-[10px] tabular-nums text-color-text-muted">
        <span>0</span>
        <span className="text-color-accent">{target.toString().padStart(3, "0")} / 100</span>
        <span>100</span>
      </div>
    </div>
  );
}
