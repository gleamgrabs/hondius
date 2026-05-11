import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, insertLiveCase, setEventStatus, liveEventExists } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  eventId: z.string().min(1).optional(), // Опционально — если кейс не привязан к event
  outbreakSlug: z.string().min(1).default("hondius-2026"),
  approveEvent: z.boolean().default(true), // Если событие было pending — пометить live
  case: z.object({
    id: z.string().min(1).max(200),
    country: z.string().min(1).max(200),
    countryCode: z.string().length(2),
    coords: z.tuple([
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
    ]),
    caseCount: z.number().int().min(0).max(100_000),
    deaths: z.number().int().min(0).max(100_000).default(0),
    status: z.enum(["confirmed", "suspected", "evacuated", "deceased"]),
    dateConfirmed: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    notes: z.string().max(5000).optional(),
    sourceUrl: z.string().url().optional(),
  }),
});

export async function POST(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? process.env.BROADCAST_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { eventId, outbreakSlug, approveEvent, case: c } = parsed.data;

  getDb();

  // Insert (or upsert) live_case
  try {
    insertLiveCase({
      id: c.id,
      outbreak_slug: outbreakSlug,
      country: c.country,
      country_code: c.countryCode.toUpperCase(),
      lat: c.coords[0],
      lng: c.coords[1],
      case_count: c.caseCount,
      deaths: c.deaths,
      status: c.status,
      date_confirmed: c.dateConfirmed,
      notes: c.notes ?? null,
      source_url: c.sourceUrl ?? null,
      publish_status: "live",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Insert failed", detail: String(e) },
      { status: 500 }
    );
  }

  // Approve linked event if pending
  let eventUpdated = false;
  if (eventId && approveEvent) {
    if (liveEventExists(eventId)) {
      eventUpdated = setEventStatus(eventId, "live", "admin");
    }
  }

  try {
    revalidatePath(`/outbreak/${outbreakSlug}`);
    revalidatePath(`/outbreak/${outbreakSlug}/timeline`);
    revalidatePath(`/outbreak/${outbreakSlug}/cases`);
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    case: { id: c.id, status: "live" },
    event: eventId ? { id: eventId, approved: eventUpdated } : null,
  });
}
