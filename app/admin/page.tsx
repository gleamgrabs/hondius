import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EventCardActions from "@/components/admin/EventCardActions";
import ForceBroadcastButton from "@/components/admin/ForceBroadcastButton";
import {
  getDb,
  getLiveEvents,
  getBroadcastState,
  type LiveEventRow,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Не индексируем admin: ни с токеном (служебка), ни без (404).
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

interface SearchParams {
  searchParams: { token?: string };
}

const DEFAULT_SLUG = "hondius-2026";

export default async function AdminPage({ searchParams }: SearchParams) {
  const expected = process.env.ADMIN_TOKEN ?? process.env.BROADCAST_ADMIN_TOKEN;
  const token = searchParams.token ?? "";

  if (!expected || !token || token !== expected) {
    return notFound();
  }

  // Force DB init
  getDb();

  const pending = getLiveEvents(DEFAULT_SLUG, { status: "pending" });
  const recentLive = getLiveEvents(DEFAULT_SLUG, { status: "live" }).slice(0, 20);
  const broadcastState = getBroadcastState(DEFAULT_SLUG);

  return (
    <>
      <Header />
      <main>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" aria-hidden />
            <span className="font-data text-[10px] uppercase tracking-widest text-color-accent">
              Admin console
            </span>
          </div>
          <h1 className="text-display-sm font-semibold text-color-text mb-2 uppercase">
            Hondius Watch — Admin
          </h1>
          <p className="text-color-text-muted text-sm mb-8">
            Outbreak: <code className="font-data">{DEFAULT_SLUG}</code> · Pending:{" "}
            <span className="text-color-accent font-data">{pending.length}</span>{" "}
            · Recent live:{" "}
            <span className="font-data">{recentLive.length}</span>
          </p>

          <hr className="divider mb-8" />

          {/* Broadcast control */}
          <section className="mb-12">
            <h2 className="text-xl font-medium text-color-text mb-3 uppercase">
              » Broadcast
            </h2>
            <div className="hud-frame p-4 mb-4">
              <span className="hud-corner-tl" />
              <span className="hud-corner-br" />
              <div className="font-data text-xs text-color-text-muted">
                Last broadcast:{" "}
                {broadcastState && broadcastState.last_sent_at > 0 ? (
                  <span className="text-color-text">
                    {new Date(broadcastState.last_sent_at).toISOString()}
                  </span>
                ) : (
                  <span className="text-color-text-subtle">never</span>
                )}
              </div>
              <div className="font-data text-xs text-color-text-muted mt-1">
                Pending event ids:{" "}
                <span className="text-color-text">
                  {broadcastState
                    ? JSON.parse(broadcastState.pending_event_ids).length
                    : 0}
                </span>
              </div>
            </div>
            <ForceBroadcastButton outbreakSlug={DEFAULT_SLUG} token={token} />
          </section>

          <hr className="divider mb-8" />

          {/* Pending events */}
          <section className="mb-12">
            <h2 className="text-xl font-medium text-color-text mb-3 uppercase">
              » Pending events ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-color-text-muted text-sm">
                No events waiting for review.
              </p>
            ) : (
              <ul className="space-y-4">
                {pending.map((e) => (
                  <li key={e.id}>
                    <EventCard
                      event={e}
                      slug={DEFAULT_SLUG}
                      token={token}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="divider mb-8" />

          {/* Recent live */}
          <section>
            <h2 className="text-xl font-medium text-color-text mb-3 uppercase">
              » Recent live events ({recentLive.length})
            </h2>
            <p className="text-color-text-muted text-xs mb-4 max-w-prose">
              Auto-published events (high-authority sources). Listed for audit —
              you can reject any of them; a rejected event disappears from the
              site within ~60 seconds (ISR revalidate).
            </p>
            {recentLive.length === 0 ? (
              <p className="text-color-text-muted text-sm">No live events.</p>
            ) : (
              <ul className="space-y-3">
                {recentLive.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} slug={DEFAULT_SLUG} token={token} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function EventCard({
  event,
  slug,
  token,
}: {
  event: LiveEventRow;
  slug: string;
  token: string;
}) {
  return (
    <div className="hud-frame p-4">
      <span className="hud-corner-tl" />
      <span className="hud-corner-br" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-data text-[10px] uppercase tracking-widest text-color-text-muted">
              {event.date}
            </span>
            <span
              className="font-data text-[10px] uppercase tracking-widest"
              style={{
                color:
                  event.severity === "critical"
                    ? "var(--color-accent)"
                    : event.severity === "warning"
                    ? "var(--color-warning)"
                    : "var(--color-text-muted)",
              }}
            >
              [{event.severity}]
            </span>
            <span className="font-data text-[10px] uppercase tracking-widest text-color-text-subtle">
              {event.source_publisher}
            </span>
            <span className="font-data text-[10px] uppercase tracking-widest text-color-text-subtle">
              status: {event.status}
            </span>
          </div>
          <h3 className="text-base font-semibold text-color-text leading-snug mb-1">
            {event.title}
          </h3>
          <p className="text-sm text-color-text-muted leading-relaxed">
            {event.description}
          </p>
          {typeof event.llm_confidence === "number" && (
            <p className="font-data text-[10px] mt-2 text-color-text-subtle uppercase tracking-wider">
              <span
                style={{
                  color:
                    event.llm_confidence >= 0.85
                      ? "var(--color-success)"
                      : event.llm_confidence >= 0.7
                      ? "var(--color-warning)"
                      : "var(--color-accent)",
                }}
              >
                LLM {event.approved_by === "auto-llm" || event.approved_by === "auto-llm-judge"
                  ? "auto-approve"
                  : "judgement"}
                {" · "}confidence {event.llm_confidence.toFixed(2)}
              </span>
              {event.llm_reason && (
                <span className="text-color-text-subtle ml-2 normal-case tracking-normal">
                  · &ldquo;{event.llm_reason}&rdquo;
                </span>
              )}
            </p>
          )}
          <p className="font-data text-[10px] mt-2">
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-color-accent hover:underline uppercase tracking-wider"
            >
              ▸ Source
            </a>
            <span className="text-color-text-subtle ml-3">
              id: <code>{event.id}</code>
            </span>
          </p>
        </div>
        <div className="flex-shrink-0 min-w-[260px]">
          <EventCardActions
            id={event.id}
            eventDate={event.date}
            eventDescription={event.description}
            eventSourceUrl={event.source_url}
            currentStatus={event.status}
            outbreakSlug={slug}
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
