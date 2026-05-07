"use client";

import { useEffect } from "react";

export default function ConsoleEgg() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as unknown as { __egg?: boolean }).__egg) return;
    (window as unknown as { __egg: boolean }).__egg = true;

    const banner = [
      "%c┌─────────────────────────────────────────────┐",
      "%c│  HONDIUS WATCH — CDC TACTICAL READOUT v0.1  │",
      "%c│  »  signal acquired ·  link nominal         │",
      "%c│  »  the world is now disease-free... almost │",
      "%c│  »  cf. Plague Inc. — Ndemic Creations      │",
      "%c│  »  cf. Contagion (2011) · 28 Days Later    │",
      "%c└─────────────────────────────────────────────┘",
    ].join("\n");
    const style = "color:#ff3b30;font-family:JetBrains Mono,monospace;font-size:11px";
    // eslint-disable-next-line no-console
    console.log(
      banner,
      style, style, style, style, style, style, style
    );
  }, []);

  return null;
}
