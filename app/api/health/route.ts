import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_INGEST_MS = 4 * 60 * 60 * 1000; // 4 часа

interface HealthChecks {
  db: "ok" | "error";
  live_events_count: number | null;
  live_cases_count: number | null;
  subscribers_confirmed: number | null;
  last_ingest_at: number | null;
  last_broadcast_at: number | null;
  ingest_status: "ok" | "stale" | "never";
}

export async function GET() {
  const ts = Date.now();
  const checks: HealthChecks = {
    db: "ok",
    live_events_count: null,
    live_cases_count: null,
    subscribers_confirmed: null,
    last_ingest_at: null,
    last_broadcast_at: null,
    ingest_status: "never",
  };

  let httpStatus = 200;

  try {
    const db = getDb();
    db.prepare("SELECT 1").get();

    const liveEventsRow = db
      .prepare("SELECT COUNT(*) AS n FROM live_events")
      .get() as { n: number };
    checks.live_events_count = liveEventsRow.n;

    const liveCasesRow = db
      .prepare("SELECT COUNT(*) AS n FROM live_cases")
      .get() as { n: number };
    checks.live_cases_count = liveCasesRow.n;

    const subsRow = db
      .prepare("SELECT COUNT(*) AS n FROM subscribers WHERE confirmed = 1")
      .get() as { n: number };
    checks.subscribers_confirmed = subsRow.n;

    // Самый свежий timestamp из live_events / live_cases.
    const latestEvent = db
      .prepare("SELECT MAX(created_at) AS t FROM live_events")
      .get() as { t: number | null };
    const latestCase = db
      .prepare("SELECT MAX(updated_at) AS t FROM live_cases")
      .get() as { t: number | null };
    const lastIngest = Math.max(latestEvent.t ?? 0, latestCase.t ?? 0);
    checks.last_ingest_at = lastIngest > 0 ? lastIngest : null;

    const latestBroadcast = db
      .prepare("SELECT MAX(sent_at) AS t FROM broadcasts")
      .get() as { t: number | null };
    checks.last_broadcast_at =
      latestBroadcast.t && latestBroadcast.t > 0 ? latestBroadcast.t : null;

    // Stale-ingest: если cron бежит каждые 2h, ingest должен быть ≤4h назад.
    if (!checks.last_ingest_at) {
      checks.ingest_status = "never";
    } else if (ts - checks.last_ingest_at > STALE_INGEST_MS) {
      checks.ingest_status = "stale";
    } else {
      checks.ingest_status = "ok";
    }
  } catch (err) {
    checks.db = "error";
    httpStatus = 503;
    console.error("[health] DB check failed:", err);
  }

  return NextResponse.json(
    { ok: checks.db === "ok", ts, checks },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, must-revalidate" },
    }
  );
}
