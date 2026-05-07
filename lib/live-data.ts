import type {
  OutbreakData,
  OutbreakEvent,
  CaseEntry,
  SourceEntry,
} from "@/lib/types";
import {
  getLiveEvents,
  getLiveCases,
  getLiveSources,
  type LiveEventRow,
  type LiveCaseRow,
  type LiveSourceRow,
} from "@/lib/db";

/**
 * Объединяет TS-baseline (исторические данные до момента деплоя) с live-overlay
 * из SQLite (события и кейсы добавленные парсером после деплоя).
 *
 * Правила:
 *  - Live event с тем же id, что у baseline event — переписывает baseline.
 *  - Live case с тем же id — то же самое.
 *  - Live source с тем же id — то же самое (нумерация продолжается с max baseline.id+1).
 *  - meta.stats пересчитываются из объединённого набора cases:
 *      cases   = sum(caseCount) — не количество записей, а сумма случаев
 *      deaths  = sum(deaths)
 *      countries = number of distinct countryCode (исключая 'XS' = on-board)
 *  - meta.lastUpdated = max(baseline.lastUpdated, max(live updated_at, live created_at))
 */
export function mergeLiveData(
  baseline: OutbreakData,
  slug: string
): OutbreakData {
  let liveEvents: LiveEventRow[] = [];
  let liveCases: LiveCaseRow[] = [];
  let liveSources: LiveSourceRow[] = [];

  try {
    liveEvents = getLiveEvents(slug, { status: "live" });
    liveCases = getLiveCases(slug, { publishStatus: "live" });
    liveSources = getLiveSources(slug);
  } catch (err) {
    // БД может не существовать на момент билда — возвращаем baseline без overlay.
    console.warn("[live-data] failed to read DB, using baseline only:", err);
    return baseline;
  }

  // ── Events ────────────────────────────────────────────────────────
  const eventsById = new Map<string, OutbreakEvent>();
  for (const e of baseline.events) eventsById.set(e.id, e);
  for (const le of liveEvents) {
    eventsById.set(le.id, liveRowToEvent(le));
  }
  const mergedEvents = Array.from(eventsById.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // ── Cases ─────────────────────────────────────────────────────────
  const casesById = new Map<string, CaseEntry>();
  for (const c of baseline.cases) casesById.set(c.id, c);
  for (const lc of liveCases) {
    casesById.set(lc.id, liveRowToCase(lc));
  }
  const mergedCases = Array.from(casesById.values());

  // ── Sources ───────────────────────────────────────────────────────
  const sourcesById = new Map<string | number, SourceEntry>();
  for (const s of baseline.sources) sourcesById.set(s.id, s);
  // Live sources получают id, продолжающие baseline нумерацию.
  let nextId =
    baseline.sources.reduce((m, s) => Math.max(m, s.id), 0) + 1;
  for (const ls of liveSources) {
    if (sourcesById.has(ls.id)) continue;
    sourcesById.set(ls.id, {
      id: nextId++,
      title: ls.title,
      publisher: ls.publisher,
      url: ls.url,
      accessed: ls.accessed,
      publishedDate: ls.published_date ?? undefined,
    });
  }
  const mergedSources = Array.from(sourcesById.values());

  // ── Stats ─────────────────────────────────────────────────────────
  const totalCases = mergedCases.reduce((sum, c) => sum + c.caseCount, 0);
  const totalDeaths = mergedCases.reduce((sum, c) => sum + c.deaths, 0);
  const countrySet = new Set(
    mergedCases
      .filter((c) => c.countryCode !== "XS") // 'XS' = on-board, не считаем как страну
      .map((c) => c.countryCode)
  );

  // ── Last updated ──────────────────────────────────────────────────
  const baselineLU = new Date(baseline.meta.lastUpdated).getTime();
  const liveLU = Math.max(
    0,
    ...liveEvents.map((e) => e.created_at),
    ...liveCases.map((c) => c.updated_at)
  );
  const lastUpdated =
    liveLU > baselineLU
      ? new Date(liveLU).toISOString().slice(0, 10)
      : baseline.meta.lastUpdated;

  return {
    ...baseline,
    meta: {
      ...baseline.meta,
      lastUpdated,
      stats: {
        ...baseline.meta.stats,
        cases: totalCases,
        deaths: totalDeaths,
        countries: countrySet.size,
      },
    },
    events: mergedEvents,
    cases: mergedCases,
    sources: mergedSources,
  };
}

function liveRowToEvent(r: LiveEventRow): OutbreakEvent {
  let sources: string[];
  try {
    const parsed = JSON.parse(r.source_ids);
    sources = Array.isArray(parsed) ? parsed.map(String) : [r.source_url];
  } catch {
    sources = [r.source_url];
  }
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    description: r.description,
    severity: r.severity,
    sources,
  };
}

function liveRowToCase(r: LiveCaseRow): CaseEntry {
  return {
    id: r.id,
    country: r.country,
    countryCode: r.country_code,
    coords: [r.lat, r.lng],
    caseCount: r.case_count,
    deaths: r.deaths,
    status: r.status,
    dateConfirmed: r.date_confirmed,
    notes: r.notes ?? "",
    sourceUrl: r.source_url ?? undefined,
  };
}
