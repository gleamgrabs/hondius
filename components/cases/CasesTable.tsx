"use client";

import { useState } from "react";
import type { CaseEntry, OutbreakData, SourceEntry } from "@/lib/types";
import { formatDate } from "@/lib/seo";

type SortKey = keyof Pick<
  CaseEntry,
  "country" | "status" | "dateConfirmed" | "caseCount" | "deaths"
>;

interface CasesTableProps {
  cases: CaseEntry[];
  meta: OutbreakData["meta"];
  sources: SourceEntry[];
}

export default function CasesTable({ cases, meta, sources }: CasesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dateConfirmed");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...cases].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const colClass =
    "text-left py-3 pr-6 font-data text-xs uppercase tracking-wider text-color-text-muted cursor-pointer hover:text-color-text transition-colors select-none";

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">
            Confirmed and suspected cases of {meta.pathogen} associated with{" "}
            {meta.title}
          </caption>
          <thead>
            <tr className="border-b-2 border-color-rule-strong">
              <th className={colClass} onClick={() => handleSort("country")}>
                Country {arrow("country")}
              </th>
              <th className={colClass} onClick={() => handleSort("status")}>
                Status {arrow("status")}
              </th>
              <th className={colClass} onClick={() => handleSort("caseCount")}>
                Cases {arrow("caseCount")}
              </th>
              <th className={colClass} onClick={() => handleSort("deaths")}>
                Deaths {arrow("deaths")}
              </th>
              <th
                className={colClass}
                onClick={() => handleSort("dateConfirmed")}
              >
                Confirmed {arrow("dateConfirmed")}
              </th>
              <th className="text-left py-3 pr-6 font-data text-xs uppercase tracking-wider text-color-text-muted">
                Notes
              </th>
              <th className="text-left py-3 font-data text-xs uppercase tracking-wider text-color-text-muted">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-color-rule">
            {sorted.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-color-bg-subtle transition-colors"
              >
                <td className="py-3 pr-6 font-medium">{c.country}</td>
                <td className="py-3 pr-6 capitalize">
                  <span
                    className={
                      c.status === "confirmed" || c.status === "deceased"
                        ? "text-color-accent"
                        : "text-color-text-muted"
                    }
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-6 font-data">{c.caseCount}</td>
                <td className="py-3 pr-6 font-data">
                  {c.deaths > 0 ? (
                    <span className="text-color-accent">{c.deaths}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 pr-6 text-color-text-muted">
                  {c.dateConfirmed ? (
                    <time dateTime={c.dateConfirmed}>
                      {formatDate(c.dateConfirmed)}
                    </time>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 pr-6 text-color-text-muted text-xs max-w-xs">
                  {c.notes}
                </td>
                <td className="py-3">
                  {c.sourceUrl ? (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-data text-xs text-color-accent hover:underline uppercase tracking-wider"
                    >
                      Source ↗
                    </a>
                  ) : (
                    <span className="text-color-text-subtle text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-color-text-muted max-w-prose">
        Data compiled from WHO situation reports, national health authorities, and
        verified news reporting. Last updated:{" "}
        <time dateTime={meta.lastUpdated}>{formatDate(meta.lastUpdated)}</time>.
        Click column headers to sort.
      </p>

      <div className="mt-8 pt-6 border-t border-color-rule">
        <h2 className="text-sm font-medium text-color-text mb-3">
          Sources used on this page
        </h2>
        <ol className="space-y-2 text-xs text-color-text-muted">
          {sources.slice(0, 5).map((s) => (
            <li key={s.id}>
              <span className="font-data">[{s.id}]</span>{" "}
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-color-accent hover:underline"
              >
                {s.title}
              </a>{" "}
              — {s.publisher}. Accessed {formatDate(s.accessed)}.
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
