"use client";

import { useState } from "react";
import type { CaseEntry, RouteWaypoint } from "@/lib/types";
import { formatDate } from "@/lib/seo";

interface MapTableProps {
  cases: CaseEntry[];
  route: RouteWaypoint[];
}

export default function MapTable({ cases, route }: MapTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="font-data text-xs uppercase tracking-wider text-color-text-muted hover:text-color-text transition-colors"
        aria-expanded={expanded}
        aria-controls="map-data-table"
      >
        {expanded ? "Hide" : "View"} map data as table
      </button>

      {expanded && (
        <div id="map-data-table" className="mt-4 space-y-6">
          <section>
            <h3 className="font-data text-xs uppercase tracking-wider text-color-text-muted mb-3">
              Cases by location
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-color-rule">
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Country / Location
                    </th>
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Cases
                    </th>
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Deaths
                    </th>
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Status
                    </th>
                    <th className="text-left py-2 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Confirmed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-color-rule">
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4">{c.country}</td>
                      <td className="py-2 pr-4 font-data">{c.caseCount}</td>
                      <td className="py-2 pr-4 font-data">
                        {c.deaths > 0 ? (
                          <span className="text-color-accent">{c.deaths}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-2 pr-4 capitalize">{c.status}</td>
                      <td className="py-2 text-color-text-muted">
                        {c.dateConfirmed ? formatDate(c.dateConfirmed) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="font-data text-xs uppercase tracking-wider text-color-text-muted mb-3">
              Ship route waypoints
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-color-rule">
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Location
                    </th>
                    <th className="text-left py-2 pr-4 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Type
                    </th>
                    <th className="text-left py-2 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-color-rule">
                  {route.map((wp) => (
                    <tr key={wp.name}>
                      <td className="py-2 pr-4">{wp.name}</td>
                      <td className="py-2 pr-4 capitalize">{wp.type}</td>
                      <td className="py-2 text-color-text-muted">
                        {wp.date ? formatDate(wp.date) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
