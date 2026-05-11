import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CasesTable from "@/components/cases/CasesTable";
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
  return {
    title: `MV Hondius Hantavirus — Confirmed Cases by Country`,
    description: `Detailed case-by-case data for the MV Hondius hantavirus outbreak: country, status, confirmation date, source. ${data.meta.stats.cases} confirmed cases across ${data.meta.stats.countries} countries.`,
    alternates: { canonical: `/outbreak/${data.meta.slug}/cases` },
    openGraph: {
      type: "article",
      modifiedTime: data.meta.lastUpdated,
    },
  };
}

export default function CasesPage({ params }: Props) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) notFound();

  const { meta, cases, sources } = data;

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
              Cases
            </h1>
            <p className="text-color-text-muted mt-2">
              {meta.title} · {cases.length} records
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

          <CasesTable cases={cases} meta={meta} sources={sources} />
        </div>
      </main>
      <Footer />
    </>
  );
}
