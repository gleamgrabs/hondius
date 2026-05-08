import { NextResponse } from "next/server";
import { getShipPosition, getDb } from "@/lib/db";
import { getOutbreakBySlug } from "@/lib/outbreaks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_MS = 6 * 60 * 60 * 1000; // 6 часов = можно доверять как "свежее"

// Маппинг outbreak slug → MMSI основного судна. Сейчас один кейс,
// но при добавлении новых вспышек можно расширить.
const SHIP_MMSI: Record<string, string | undefined> = {
  "hondius-2026": process.env.MV_HONDIUS_MMSI,
};

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Outbreak not found" },
      { status: 404 }
    );
  }

  const mmsi = SHIP_MMSI[params.slug];
  if (!mmsi) {
    // MMSI не сконфигурирован → клиент использует fallback анимацию.
    return NextResponse.json(
      {
        ok: true,
        slug: params.slug,
        position: null,
        reason: "MMSI not configured",
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }

  getDb();
  const pos = getShipPosition(mmsi);
  if (!pos) {
    return NextResponse.json(
      {
        ok: true,
        slug: params.slug,
        mmsi,
        position: null,
        reason: "no AIS data received yet",
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }

  const now = Date.now();
  const ageMs = now - pos.timestamp_received;
  const stale = ageMs > STALE_MS;

  return NextResponse.json(
    {
      ok: true,
      slug: params.slug,
      mmsi: pos.mmsi,
      shipName: pos.ship_name,
      position: {
        lat: pos.lat,
        lng: pos.lng,
        speedKnots: pos.speed_knots,
        courseDeg: pos.course_deg,
        headingDeg: pos.heading_deg,
        timestamp: pos.timestamp_received,
        ageMinutes: Math.round(ageMs / 60_000),
        stale,
        source: pos.source,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
