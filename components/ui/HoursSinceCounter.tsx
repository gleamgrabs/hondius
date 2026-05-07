"use client";

import { useEffect, useState } from "react";

interface HoursSinceCounterProps {
  startIso: string;
  label?: string;
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function calc(startIso: string) {
  const elapsed = Date.now() - new Date(startIso).getTime();
  const totalHours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1000);
  return { totalHours, minutes, seconds };
}

export default function HoursSinceCounter({
  startIso,
  label = "Hours since first symptom",
}: HoursSinceCounterProps) {
  const [t, setT] = useState(() => calc(startIso));

  useEffect(() => {
    setT(calc(startIso));
    const id = setInterval(() => setT(calc(startIso)), 1000);
    return () => clearInterval(id);
  }, [startIso]);

  return (
    <div className="hud-frame px-4 py-3">
      <span className="hud-corner-tl" />
      <span className="hud-corner-br" />
      <div className="flex items-center gap-2 mb-1">
        <span className="live-dot" aria-hidden />
        <span className="font-data text-[10px] uppercase tracking-widest text-color-text-muted">
          {label}
        </span>
      </div>
      <div
        className="font-data text-2xl tabular-nums text-color-accent text-glow-accent leading-none"
        aria-live="off"
      >
        {pad(t.totalHours, 4)}
        <span className="text-color-text-subtle">:</span>
        {pad(t.minutes)}
        <span className="text-color-text-subtle">:</span>
        {pad(t.seconds)}
      </div>
    </div>
  );
}
