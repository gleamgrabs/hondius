import { NextResponse } from "next/server";
import {
  getDb,
  getLiveEvents,
  getBroadcastState,
  updateBroadcastState,
  appendPendingEvent,
  getAllSentEventIds,
} from "@/lib/db";
import { getOutbreakBySlug } from "@/lib/outbreaks";
import { sendBroadcast } from "@/lib/broadcast";
import type { OutbreakEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEBOUNCE_MS = 6 * 60 * 60 * 1000; // 6 часов
const SEVERITY_THRESHOLD = new Set(["warning", "critical"]);

interface MaybeTriggerBody {
  outbreakSlug: string;
  /** Если true — игнорить дебаунс. Используется только админом. */
  force?: boolean;
}

/**
 * Дебаунсится: не чаще одного раза в 6 часов.
 * Если есть pending-события и прошло >=6h — отправляет дайджест-письмо.
 * Если меньше — добавляет новые event_id в pending_event_ids.
 */
export async function POST(req: Request) {
  const ingestToken = process.env.INGEST_TOKEN;
  const adminToken = process.env.BROADCAST_ADMIN_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const matchesIngest = ingestToken && auth === `Bearer ${ingestToken}`;
  const matchesAdmin = adminToken && auth === `Bearer ${adminToken}`;
  if (!matchesIngest && !matchesAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: MaybeTriggerBody;
  try {
    body = (await req.json()) as MaybeTriggerBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.outbreakSlug) {
    return NextResponse.json(
      { ok: false, error: "outbreakSlug required" },
      { status: 400 }
    );
  }
  // force allowed only with admin token
  const force = !!body.force && !!matchesAdmin;

  // Force DB init
  getDb();

  const data = getOutbreakBySlug(body.outbreakSlug);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Outbreak not found" },
      { status: 404 }
    );
  }

  // Все live-events этой вспышки
  const liveRows = getLiveEvents(body.outbreakSlug, { status: "live" });

  // Уже разосланные ранее event-id (из всех broadcasts)
  const alreadySent = getAllSentEventIds();

  // Кандидаты на рассылку: severity ≥ warning, не отправлены ранее
  const candidates = liveRows.filter(
    (r) =>
      SEVERITY_THRESHOLD.has(r.severity) &&
      !alreadySent.has(r.id)
  );

  // Текущие pending из state
  const state = getBroadcastState(body.outbreakSlug);
  const pendingFromState: string[] = state
    ? JSON.parse(state.pending_event_ids)
    : [];

  // Полный список pending: из state + новые candidates
  const pendingSet = new Set<string>(pendingFromState);
  for (const c of candidates) pendingSet.add(c.id);

  if (pendingSet.size === 0) {
    return NextResponse.json({
      ok: true,
      action: "noop",
      reason: "no qualifying events",
    });
  }

  const lastSent = state?.last_sent_at ?? 0;
  const now = Date.now();
  const elapsed = now - lastSent;

  if (!force && elapsed < DEBOUNCE_MS && lastSent > 0) {
    // В дебаунс-окне — добавляем кандидаты в pending, не шлём
    for (const c of candidates) appendPendingEvent(body.outbreakSlug, c.id);
    return NextResponse.json({
      ok: true,
      action: "deferred",
      reason: "within 6h debounce window",
      pending: Array.from(pendingSet),
      nextEligibleAt: new Date(lastSent + DEBOUNCE_MS).toISOString(),
    });
  }

  // Готовим events для рассылки — берём из merged data, чтобы получить полный объект OutbreakEvent
  const eventsToSend: OutbreakEvent[] = data.events.filter((e) =>
    pendingSet.has(e.id)
  );

  if (eventsToSend.length === 0) {
    // Все pending больше не существуют (например, status изменился на rejected) — очистим pending
    updateBroadcastState(body.outbreakSlug, lastSent, []);
    return NextResponse.json({
      ok: true,
      action: "noop",
      reason: "pending events no longer present in merged data",
    });
  }

  const result = await sendBroadcast({
    outbreakSlug: body.outbreakSlug,
    events: eventsToSend,
  });

  if (result.ok) {
    updateBroadcastState(body.outbreakSlug, now, []);
  }

  return NextResponse.json({
    ok: result.ok,
    action: "sent",
    sent: result.sent,
    failed: result.failed,
    eventCount: result.eventCount,
    recipientCount: result.recipientCount,
    eventIds: eventsToSend.map((e) => e.id),
  });
}
