import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StatusPill from "@/components/ui/StatusPill";
import KeyFactsStrip from "@/components/ui/KeyFactsStrip";
import HoursSinceCounter from "@/components/ui/HoursSinceCounter";
import ContainmentBar from "@/components/ui/ContainmentBar";
import OutbreakMap from "@/components/map/OutbreakMap";
import Timeline from "@/components/timeline/Timeline";
import {
  getAllOutbreaks,
  getAllOutbreakMetas,
  getOutbreakBySlug,
} from "@/lib/outbreaks";
import { formatDate } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hondius Watch — Hantavirus outbreak tracker",
  description:
    "Live tactical readout: hantavirus outbreak aboard MV Hondius. Cases, deaths, ship route, contact-tracing.",
};

// Force-dynamic: страница re-render на каждый запрос (читает merged data из SQLite).
// Cloudflare CDN кеширует 60s — см. headers в next.config.mjs.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const allOutbreaks = getAllOutbreaks();
  const allMetas = getAllOutbreakMetas();

  const featured =
    allOutbreaks.find((o) => o.meta.status === "active") ?? allOutbreaks[0];
  const featuredData = featured
    ? getOutbreakBySlug(featured.meta.slug)
    : undefined;

  return (
    <>
      <Header />
      <main>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-12">
          {/* 1. Editorial intro */}
          <section className="max-w-2xl mb-12">
            <p className="font-data text-[10px] uppercase tracking-widest text-color-text-muted mb-3">
              ▸ Surveillance feed · public health
            </p>
            <h1 className="text-display font-semibold text-color-text mb-4 leading-tight uppercase">
              Disease outbreaks, tracked
            </h1>
            <p className="text-color-text-muted leading-relaxed text-sm">
              Tactical surveillance of active infectious disease outbreaks —
              structured data, live maps, sourced timelines. Compiled from WHO,
              ECDC, CDC, and verified reporting.{" "}
              <Link
                href="/about"
                className="text-color-accent underline hover:text-glow-accent transition-colors"
              >
                ▸ About this readout
              </Link>
            </p>
          </section>

          <hr className="divider mb-10" />

          {/* 2. Featured outbreak block */}
          {featuredData && (
            <section aria-labelledby="featured-heading" className="mb-16">
              <header className="mb-0">
                <p className="font-data text-xs text-color-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="live-dot" aria-hidden />
                  {featuredData.meta.status === "active"
                    ? "Active outbreak · "
                    : ""}
                  {featuredData.meta.pathogen} · {featuredData.meta.location}
                </p>

                <div className="flex items-start gap-4 flex-wrap justify-between">
                  <div className="flex-1 min-w-0">
                    <h2
                      id="featured-heading"
                      className="text-display-sm sm:text-display font-semibold text-color-text leading-tight uppercase"
                    >
                      <Link
                        href={`/outbreak/${featuredData.meta.slug}`}
                        className="no-underline hover:text-color-accent transition-colors"
                      >
                        {featuredData.meta.title}
                      </Link>
                    </h2>
                    <p className="text-base text-color-text-muted mt-3 leading-relaxed max-w-3xl">
                      {featuredData.meta.summary}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-3 mt-2 flex-shrink-0">
                    <StatusPill status={featuredData.meta.status} />
                    <Link
                      href={`/outbreak/${featuredData.meta.slug}`}
                      className="font-data text-xs text-color-text-muted uppercase tracking-widest hover:text-color-accent transition-colors whitespace-nowrap"
                    >
                      ▸ Full readout
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-4">
                  <span className="font-data text-[10px] text-color-text-subtle uppercase tracking-widest">
                    » Started{" "}
                    <time dateTime={featuredData.meta.startDate}>
                      {formatDate(featuredData.meta.startDate)}
                    </time>
                  </span>
                  <span className="font-data text-[10px] text-color-text-subtle uppercase tracking-widest">
                    » Updated{" "}
                    <time dateTime={featuredData.meta.lastUpdated}>
                      {formatDate(featuredData.meta.lastUpdated)}
                    </time>
                  </span>
                </div>
              </header>

              {/* Live HUD row — counter + spread index */}
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <HoursSinceCounter
                  startIso={
                    featuredData.meta.stats.firstSymptomDate ??
                    featuredData.meta.startDate
                  }
                />
                <ContainmentBar
                  cases={featuredData.meta.stats.cases}
                  countries={featuredData.meta.stats.countries}
                />
              </div>

              {/* Key facts */}
              <KeyFactsStrip
                cases={featuredData.meta.stats.cases}
                deaths={featuredData.meta.stats.deaths}
                countries={featuredData.meta.stats.countries}
                disembarked={featuredData.meta.stats.disembarkedUnaware ?? 0}
                firstSymptomDate={
                  featuredData.meta.stats.firstSymptomDate ??
                  featuredData.meta.startDate
                }
              />

              {/* 3. Map */}
              <OutbreakMap
                cases={featuredData.cases}
                route={featuredData.route}
                date={formatDate(featuredData.meta.lastUpdated)}
                slug={featuredData.meta.slug}
              />

              {/* 4. Timeline preview */}
              <div className="mt-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-color-text uppercase">
                    » Latest events
                  </h3>
                  <Link
                    href={`/outbreak/${featuredData.meta.slug}/timeline`}
                    className="font-data text-xs text-color-text-muted uppercase tracking-widest hover:text-color-accent transition-colors"
                  >
                    Full timeline →
                  </Link>
                </div>
                <div className="max-w-2xl">
                  <Timeline
                    events={featuredData.events}
                    limit={5}
                    reverseChron={true}
                  />
                </div>
                <Link
                  href={`/outbreak/${featuredData.meta.slug}`}
                  className="inline-block mt-2 font-data text-xs text-color-text-muted uppercase tracking-widest hover:text-color-accent transition-colors"
                >
                  ▸ Continue to full readout
                </Link>
              </div>
            </section>
          )}

          <hr className="divider mb-10" />

          {/* 5. All tracked outbreaks */}
          <section aria-labelledby="all-outbreaks-heading" className="mb-16">
            <h2
              id="all-outbreaks-heading"
              className="text-display-sm font-medium text-color-text mb-6 uppercase"
            >
              » All tracked outbreaks
            </h2>
            <div className="grid gap-px bg-color-rule sm:grid-cols-2 lg:grid-cols-3 border border-color-rule">
              {allMetas.map((meta) => (
                <Link
                  key={meta.slug}
                  href={`/outbreak/${meta.slug}`}
                  className="group block bg-color-bg-subtle p-5 hover:bg-color-bg-elevated transition-colors no-underline"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="font-data text-[10px] text-color-text-muted uppercase tracking-widest">
                      ▣ {meta.pathogen}
                    </span>
                    <StatusPill status={meta.status} />
                  </div>

                  <h3 className="text-base font-semibold text-color-text group-hover:text-color-accent transition-colors leading-snug mb-2 uppercase">
                    {meta.title}
                  </h3>
                  <p className="text-xs text-color-text-muted mb-4 leading-relaxed">
                    {meta.location}
                  </p>

                  <div className="flex gap-6 border-t border-color-rule pt-4">
                    <div>
                      <div className="data-label mb-1">Cases</div>
                      <div className="font-data text-xl font-semibold text-color-accent text-glow-accent tabular-nums">
                        {meta.stats.cases}
                      </div>
                    </div>
                    <div>
                      <div className="data-label mb-1">Deaths</div>
                      <div className="font-data text-xl font-semibold text-color-accent text-glow-accent tabular-nums">
                        {meta.stats.deaths}
                      </div>
                    </div>
                    <div>
                      <div className="data-label mb-1">Countries</div>
                      <div className="font-data text-xl font-semibold text-color-text tabular-nums">
                        {meta.stats.countries}
                      </div>
                    </div>
                  </div>

                  <p className="font-data text-[10px] text-color-text-subtle mt-4 uppercase tracking-widest">
                    » Started {formatDate(meta.startDate)} · Updated{" "}
                    {formatDate(meta.lastUpdated)}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <hr className="divider mb-10" />

          {/* 6. Methodology footer */}
          <section
            aria-labelledby="methodology-heading"
            className="max-w-prose"
          >
            <h2
              id="methodology-heading"
              className="text-xl font-medium text-color-text mb-3 uppercase"
            >
              » Sources & methodology
            </h2>
            <p className="text-color-text-muted leading-relaxed mb-3 text-sm">
              Each outbreak record on this site is compiled from official
              statements (WHO, ECDC, CDC, national health authorities), wire
              services (Reuters, AP), and established international news
              reporting. Every fact is linked to a primary source. Case counts
              and timelines are updated within 24 hours of new official
              information during active events.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-4 list-none p-0 m-0">
              <li>
                <Link
                  href="/about"
                  className="font-data text-xs text-color-text-muted uppercase tracking-widest hover:text-color-accent transition-colors"
                >
                  ▸ Full methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/pathogen/hantavirus"
                  className="font-data text-xs text-color-text-muted uppercase tracking-widest hover:text-color-accent transition-colors"
                >
                  ▸ Pathogen guide: hantavirus
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
