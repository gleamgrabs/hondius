import { NextResponse } from "next/server";
import { getDb, type Subscriber } from "@/lib/db";
import { sendEmail, broadcastEmailHtml } from "@/lib/email";
import { getOutbreakBySlug } from "@/lib/outbreaks";
import { formatDate } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com";

interface BroadcastBody {
  outbreakSlug: string;
  eventIds?: string[]; // if omitted: send all events newer than last broadcast
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
    return NextResponse.json({ ok: false, error: "Outbreak not found" }, { status: 404 });
  }

  const events = body.eventIds
    ? data.events.filter((e) => body.eventIds!.includes(e.id))
    : data.events.slice(0, 5); // last 5

  if (events.length === 0) {
    return NextResponse.json({ ok: false, error: "No events selected" }, { status: 400 });
  }

  const db = getDb();
  const subscribers = db
    .prepare("SELECT * FROM subscribers WHERE confirmed = 1")
    .all() as Subscriber[];

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldSendTo: subscribers.length,
      eventCount: events.length,
      preview: { subject: subjectFor(data.meta.title), events: events.map((e) => e.title) },
    });
  }

  const subject = subjectFor(data.meta.title);
  const outbreakUrl = `${SITE_URL}/outbreak/${data.meta.slug}`;
  const formattedEvents = events.map((e) => ({
    date: formatDate(e.date).toUpperCase(),
    title: e.title,
    description: e.description,
  }));

  let sent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const sub of subscribers) {
    const html = broadcastEmailHtml({
      outbreakTitle: data.meta.title,
      outbreakUrl,
      events: formattedEvents,
      unsubscribeToken: sub.unsubscribe_token,
    });
    const r = await sendEmail({ to: sub.email, subject, html });
    if (r.ok) {
      sent++;
      db.prepare("UPDATE subscribers SET last_emailed_at = ? WHERE id = ?").run(
        Date.now(),
        sub.id
      );
    } else {
      failed++;
      failures.push(`${sub.email}: ${r.error}`);
    }
  }

  db.prepare(
    `INSERT INTO broadcasts (subject, body, sent_at, recipient_count) VALUES (?, ?, ?, ?)`
  ).run(subject, JSON.stringify(events.map((e) => e.id)), Date.now(), sent);

  return NextResponse.json({ ok: true, sent, failed, failures: failures.slice(0, 5) });
}

function subjectFor(title: string): string {
  return `[Update] ${title}`;
}
