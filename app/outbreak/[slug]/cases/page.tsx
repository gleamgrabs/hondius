"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getOutbreakBySlug } from "@/lib/outbreaks";
import { formatDate } from "@/lib/seo";
import type { CaseEntry, OutbreakData } from "@/lib/types";

type SortKey = keyof Pick<CaseEntry, "country" | "status" | "dateConfirmed" | "caseCount" | "deaths">;

function CasesTableInner({ data }: { data: OutbreakData }) {
  const { meta, cases, sources } = data;
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

  return (
    <>
      <Header />
      <main>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <div className="mb-4">
            <Link
              href={`/outbreak/${meta.slug}`}
              className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
            >
              ← Back to overview
            </Link>
          </div>

          <header className="mb-8">
            <p className="font-data text-xs text-color-text-muted uppercase tracking-widest mb-2">
              {meta.pathogen}
            </p>
            <h1 className="text-display font-semibold text-color-text leading-tight">
              Cases
            </h1>
            <p className="text-color-text-muted mt-2">
              {meta.title} · {cases.length} records
            </p>
          </header>

          <hr className="divider mb-8" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">
                Confirmed and suspected cases of {meta.pathogen} associated
                with {meta.title}
              </caption>
              <thead>
                <tr className="border-b-2 border-color-rule-strong">
                  <th
                    className={colClass}
                    onClick={() => handleSort("country")}
                  >
                    Country{" "}
                    {sortKey === "country"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    className={colClass}
                    onClick={() => handleSort("status")}
                  >
                    Status{" "}
                    {sortKey === "status"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    className={colClass}
                    onClick={() => handleSort("caseCount")}
                  >
                    Cases{" "}
                    {sortKey === "caseCount"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    className={colClass}
                    onClick={() => handleSort("deaths")}
                  >
                    Deaths{" "}
                    {sortKey === "deaths"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    className={colClass}
                    onClick={() => handleSort("dateConfirmed")}
                  >
                    Confirmed{" "}
                    {sortKey === "dateConfirmed"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
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
                        <span className="text-color-text-subtle text-xs">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-xs text-color-text-muted max-w-prose">
            Data compiled from WHO situation reports, national health
            authorities, and verified news reporting. Last updated:{" "}
            <time dateTime={meta.lastUpdated}>{formatDate(meta.lastUpdated)}</time>
            . Click column headers to sort.
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
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CasesPage({ params }: { params: { slug: string } }) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) {
    return (
      <>
        <Header />
        <main>
          <div className="max-w-content mx-auto px-4 sm:px-6 py-20 text-center">
            <h1 className="text-2xl font-semibold text-color-text">
              Outbreak not found
            </h1>
            <Link
              href="/"
              className="mt-4 inline-block text-color-text-muted hover:text-color-accent"
            >
              ← All outbreaks
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  return <CasesTableInner data={data} />;
}
