import { NextResponse } from "next/server";
import { sendBroadcast } from "@/lib/broadcast";
import { getOutbreakBySlug } from "@/lib/outbreaks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BroadcastBody {
  outbreakSlug: string;
  eventIds?: string[];
  dryRun?: boolean;
}

export async function POST(req: Request) {
  const adminToken = process.env.BROADCAST_ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { ok: false, error: "BROADCAST_ADMIN_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: BroadcastBody;
  try {
    body = (await req.json()) as BroadcastBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const data = getOutbreakBySlug(body.outbreakSlug);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Outbreak not found" },
      { status: 404 }
    );
  }

  const events = body.eventIds
    ? data.events.filter((e) => body.eventIds!.includes(e.id))
    : data.events.slice(0, 5);

  if (events.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No events selected" },
      { status: 400 }
    );
  }

  const result = await sendBroadcast({
    outbreakSlug: body.outbreakSlug,
    events,
    dryRun: body.dryRun,
  });

  if (body.dryRun) {
    return NextResponse.json({
      ok: result.ok,
      dryRun: true,
      wouldSendTo: result.recipientCount,
      eventCount: result.eventCount,
      preview: {
        events: events.map((e) => e.title),
      },
    });
  }

  return NextResponse.json({
    ok: result.ok,
    sent: result.sent,
    failed: result.failed,
    failures: result.failures,
  });
}
