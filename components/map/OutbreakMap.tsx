"use client";

import dynamic from "next/dynamic";
import type { CaseEntry, RouteWaypoint } from "@/lib/types";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-color-bg-subtle"
      style={{ height: "100%" }}
      aria-busy="true"
      aria-label="Loading map"
    >
      <span className="font-data text-xs text-color-text-muted uppercase tracking-wider">
        Loading map…
      </span>
    </div>
  ),
});

interface OutbreakMapProps {
  cases: CaseEntry[];
  route: RouteWaypoint[];
  date: string;
  /** Outbreak slug — enables client-side polling of /api/outbreaks/{slug}/cases. */
  slug?: string;
}

export default function OutbreakMap({ cases, route, date, slug }: OutbreakMapProps) {
  return (
    <figure className="my-8">
      <div
        className="border border-color-rule overflow-hidden"
        style={{ height: "clamp(360px, 45vw, 560px)" }}
      >
        <MapInner cases={cases} route={route} outbreakSlug={slug} />
      </div>
      <figcaption className="mt-3 text-xs text-color-text-muted max-w-prose">
        Map showing the route of MV Hondius and confirmed cases by country as of{" "}
        {date}. Proportional circles indicate case counts. Sources: WHO, national
        health authorities, Oceanwide Expeditions.
      </figcaption>
    </figure>
  );
}
