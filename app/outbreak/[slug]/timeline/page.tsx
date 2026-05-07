import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Timeline from "@/components/timeline/Timeline";
import { getOutbreakBySlug, getAllOutbreakSlugs } from "@/lib/outbreaks";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllOutbreakSlugs().map((slug) => ({ slug }));
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getOutbreakBySlug(params.slug);
  if (!data) return {};
  return {
    title: `${data.meta.title} — Full timeline`,
    description: `Complete timeline of all events in the ${data.meta.title}, compiled from WHO, Reuters, AP, and official sources.`,
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
