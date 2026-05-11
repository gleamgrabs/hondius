import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CasesTable from "@/components/cases/CasesTable";
import { getOutbreakBySlug, getAllOutbreakSlugs } from "@/lib/outbreaks";

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
    title: `${data.meta.title} — Case list`,
    description: `All known confirmed, suspected and deceased cases for ${data.meta.title}. Sortable table with source links.`,
    alternates: { canonical: `/outbreak/${data.meta.slug}/cases` },
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
          </header>

          <hr className="divider mb-8" />

          <CasesTable cases={cases} meta={meta} sources={sources} />
        </div>
      </main>
      <Footer />
    </>
  );
}
