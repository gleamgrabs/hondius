import { getDb, type Subscriber } from "@/lib/db";
import { sendEmail, broadcastEmailHtml } from "@/lib/email";
import { getOutbreakBySlug } from "@/lib/outbreaks";
import { formatDate } from "@/lib/seo";
import type { OutbreakEvent } from "@/lib/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com";

export interface BroadcastResult {
  ok: boolean;
  sent: number;
  failed: number;
  failures: string[];
  recipientCount: number;
  eventCount: number;
}

export interface BroadcastOptions {
  outbreakSlug: string;
  events: OutbreakEvent[];
  /** Optional override of the subject line. */
  subjectOverride?: string;
  /** If true, no emails sent — return what would be sent. */
  dryRun?: boolean;
}

/**
 * Отправляет дайджест выбранных events всем подтверждённым подписчикам.
 * Сохраняет запись в `broadcasts` с sent_event_ids для дедупликации.
 */
export async function sendBroadcast(
  opts: BroadcastOptions
): Promise<BroadcastResult> {
  const data = getOutbreakBySlug(opts.outbreakSlug);
  if (!data) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      failures: [`Outbreak not found: ${opts.outbreakSlug}`],
      recipientCount: 0,
      eventCount: 0,
    };
  }

  const events = opts.events;
  if (events.length === 0) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      failures: ["No events to broadcast"],
      recipientCount: 0,
      eventCount: 0,
    };
  }

  const db = getDb();
  const subscribers = db
    .prepare("SELECT * FROM subscribers WHERE confirmed = 1")
    .all() as Subscriber[];

  const subject = opts.subjectOverride ?? subjectFor(data.meta.title, events.length);

  if (opts.dryRun) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      failures: [],
      recipientCount: subscribers.length,
      eventCount: events.length,
    };
  }

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
    `INSERT INTO broadcasts (subject, body, sent_at, recipient_count, sent_event_ids)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    subject,
    JSON.stringify(events.map((e) => e.id)),
    Date.now(),
    sent,
    JSON.stringify(events.map((e) => e.id))
  );

  return {
    ok: true,
    sent,
    failed,
    failures: failures.slice(0, 10),
    recipientCount: subscribers.length,
    eventCount: events.length,
  };
}

function subjectFor(title: string, eventCount: number): string {
  if (eventCount === 1) return `[Update] ${title}`;
  return `[Update] ${title} — ${eventCount} new events`;
}
