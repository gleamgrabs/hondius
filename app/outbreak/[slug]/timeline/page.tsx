import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Timeline from "@/components/timeline/Timeline";
import { getOutbreakBySlug, getAllOutbreakSlugs } from "@/lib/outbreaks";
import { formatDateTimeUtc } from "@/lib/seo";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllOutbreakSlugs().map((slug) => ({ slug }));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getOutbreakBySlug(params.slug);
  if (!data) return {};
  const { monthYear } = await import("@/lib/seo");
  const my = monthYear();
  const n = data.events.length;
  return {
    title: `MV Hondius Hantavirus Outbreak — Complete Event Timeline (${my})`,
    description: `Day-by-day timeline of the MV Hondius hantavirus outbreak from April 2026: first symptoms, port denials, deaths, evacuation. ${n} documented events with source links.`,
    alternates: { canonical: `/outbreak/${data.meta.slug}/timeline` },
    openGraph: {
      type: "article",
      publishedTime: data.meta.startDate,
      modifiedTime: data.meta.lastUpdated,
    },
  };
}

export default function TimelinePage({ params }: Props) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) notFound();

  const { meta, events } = data;

  return (
    <>
      <Header />
      <main>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <div className="mb-4">
            <Link
              href={`/outbreak/${meta.slug}`}
              className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
            >
              ← Back to overview
            </Link>
          </div>

          <header className="mb-8">
            <p className="font-data text-xs text-color-text-muted uppercase tracking-widest mb-2">
              {meta.pathogen}
            </p>
            <h1 className="text-display font-semibold text-color-text leading-tight">
              Full timeline
            </h1>
            <p className="text-color-text-muted mt-2">
              {meta.title} · {events.length} events
            </p>
            <div className="hud-frame px-4 py-2 mt-4 inline-flex items-center gap-3 flex-wrap">
              <span className="hud-corner-tl" />
              <span className="hud-corner-br" />
              <span className="font-data text-[10px] uppercase tracking-widest text-color-text-muted">
                Last updated
              </span>
              <time
                dateTime={meta.lastUpdated}
                className="font-data text-sm text-color-text tabular-nums"
              >
                {formatDateTimeUtc(meta.lastUpdated)}
              </time>
              <span className="font-data text-[10px] uppercase tracking-widest text-color-text-subtle">
                · Auto-monitored from WHO · ECDC · Reuters · AP
              </span>
            </div>
          </header>

          <hr className="divider mb-8" />

          <div className="max-w-2xl">
            <Timeline events={events} reverseChron={true} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
