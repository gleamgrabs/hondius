import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
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
    title:
      "MV Hondius — 23 Passengers Disembarked at Saint Helena, Hantavirus Exposure Risk",
    description:
      "On 24 April 2026, 23 passengers left MV Hondius at Saint Helena and flew to nine countries before the hantavirus outbreak was known. Country breakdown, confirmed cases, contact tracing status.",
    alternates: { canonical: `/outbreak/${params.slug}/disembarked` },
    openGraph: {
      type: "article",
      title:
        "MV Hondius — 23 Passengers Disembarked at Saint Helena",
      description:
        "Country breakdown of the 23 passengers who left the ship before the hantavirus outbreak became known. Contact tracing in progress.",
      publishedTime: "2026-04-24",
      modifiedTime: data.meta.lastUpdated,
    },
  };
}

export default function DisembarkedPage({ params }: Props) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) notFound();
  const { meta, disembarked } = data;

  const total = disembarked.reduce((s, d) => s + d.passengerCount, 0);
  const withCases = disembarked.filter((d) => d.hasConfirmedCase).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline:
      "MV Hondius — 23 Passengers Disembarked at Saint Helena, Hantavirus Exposure Risk",
    datePublished: "2026-04-24",
    dateModified: meta.lastUpdated,
    description:
      "23 passengers left MV Hondius at Saint Helena on 24 April 2026, before the hantavirus outbreak was known. Contact tracing across nine destination countries.",
    author: { "@type": "Organization", name: "Hondius Watch" },
    publisher: {
      "@type": "Organization",
      name: "Hondius Watch",
      url: "https://hondius-watch.com",
    },
    mainEntityOfPage: `https://hondius-watch.com/outbreak/${meta.slug}/disembarked`,
  };

  return (
    <>
      <Header />
      <main>
        <article className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <div className="mb-4">
            <Link
              href={`/outbreak/${meta.slug}`}
              className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
            >
              ← Back to overview
            </Link>
          </div>

          <header className="mb-8">
            <p className="font-data text-xs text-color-text-muted uppercase tracking-widest mb-3">
              Disembarked Passengers · 24 April 2026
            </p>
            <h1 className="text-display font-semibold text-color-text leading-tight uppercase mb-3">
              23 passengers left MV Hondius at Saint Helena
            </h1>
            <p className="text-base text-color-text-muted leading-relaxed max-w-3xl">
              Before the hantavirus outbreak became known on board, 23
              passengers disembarked at the British overseas territory of Saint
              Helena and dispersed to {disembarked.length} destination
              countries. Contact tracing through the 1–8 week incubation
              window is ongoing.
            </p>
            <p className="font-data text-[10px] text-color-text-subtle uppercase tracking-widest mt-3">
              » Last updated{" "}
              <time dateTime={meta.lastUpdated}>
                {formatDateTimeUtc(meta.lastUpdated)}
              </time>{" "}
              · Auto-monitored from WHO, ECDC, Reuters, AP
            </p>
          </header>

          <hr className="divider mb-8" />

          {/* Lead paragraphs */}
          <section className="prose-serif mb-10 max-w-prose">
            <p>
              The MV Hondius made a routine port call at{" "}
              <strong>Saint Helena</strong> on 24 April 2026 — a small volcanic
              island in the South Atlantic that historically serves as a
              waypoint for vessels travelling between Antarctica and Europe. At
              that point neither passengers, crew, nor port authorities knew
              that an Andes hantavirus outbreak had begun on board: the first
              Dutch passenger had developed symptoms 18 days earlier, on 6
              April, but the cluster pattern was not yet identified.
            </p>
            <p>
              Twenty-three passengers disembarked on the island and continued
              their travel by commercial flights through Johannesburg,
              Frankfurt, and London hubs to home destinations. By the time
              World Health Organization confirmed the outbreak on 4 May 2026
              and Cabo Verde refused docking on the same day, those 23
              passengers had already been integrated back into their home
              communities across {disembarked.length} countries.
            </p>
            <p>
              The Andes hantavirus has an unusually long incubation period —{" "}
              <strong>1 to 8 weeks</strong> — and is the only hantavirus strain
              with documented person-to-person transmission in close-contact
              settings. National health authorities in each destination
              country are now tracing the passengers&apos; contacts and monitoring
              for symptom onset through the maximum 8-week window.
            </p>
          </section>

          {/* Table */}
          <section className="mb-12">
            <h2 className="text-xl font-medium text-color-text mb-4 uppercase">
              » Destinations of the 23 passengers
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-color-rule-strong">
                    <th className="text-left py-3 pr-6 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Destination country
                    </th>
                    <th className="text-left py-3 pr-6 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Passengers
                    </th>
                    <th className="text-left py-3 pr-6 font-data text-xs uppercase tracking-wider text-color-text-muted">
                      Confirmed case in group
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-color-rule">
                  {disembarked.map((d) => (
                    <tr
                      key={d.countryCode}
                      className="hover:bg-color-bg-subtle transition-colors"
                    >
                      <td className="py-3 pr-6 font-medium">{d.country}</td>
                      <td className="py-3 pr-6 font-data tabular-nums">
                        {d.passengerCount}
                      </td>
                      <td className="py-3 pr-6">
                        {d.hasConfirmedCase ? (
                          <span className="text-color-accent font-data text-xs uppercase tracking-wider">
                            ✓ confirmed
                          </span>
                        ) : (
                          <span className="text-color-text-subtle font-data text-xs uppercase tracking-wider">
                            none reported
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-data text-xs uppercase tracking-wider bg-color-bg-subtle">
                    <td className="py-3 pr-6">Total</td>
                    <td className="py-3 pr-6 tabular-nums">{total}</td>
                    <td className="py-3 pr-6">
                      <span className="text-color-accent">
                        {withCases} of {disembarked.length} destinations
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-color-text-muted">
              Passenger counts compiled from Oceanwide Expeditions passenger
              manifest and WHO situation reports. «Confirmed case in group»
              indicates at least one passenger from the disembarked cohort in
              that country has tested positive — see the{" "}
              <Link
                href={`/outbreak/${meta.slug}/cases`}
                className="text-color-accent hover:underline"
              >
                Cases page
              </Link>{" "}
              for case-level detail.
            </p>
          </section>

          <hr className="divider mb-8" />

          {/* Why this matters */}
          <section className="max-w-prose mb-12">
            <h2 className="text-xl font-medium text-color-text mb-4 uppercase">
              » Why this matters
            </h2>
            <div className="prose-serif">
              <p>
                Conventional hantavirus outbreaks burn out quickly because
                most strains do not transmit between humans — exposure is
                tied to a specific rodent habitat. Andes hantavirus is
                different. Documented household and hospital clusters in
                Argentina and Chile through the 1990s and 2010s established
                that close-contact human-to-human transmission is possible,
                making secondary cases plausible weeks after a primary
                exposure.
              </p>
              <p>
                A cruise ship is essentially a contained close-contact
                environment for the duration of a voyage. The 23 passengers
                who left at Saint Helena spent up to 24 days on board with
                what was, by that point, an undeclared outbreak. Each of them
                represents a potential secondary-transmission node in their
                home country: spouses, family members, healthcare workers
                involved in their post-arrival care.
              </p>
              <p>
                National public health agencies in each destination country
                have therefore opened formal contact tracing, with{" "}
                <strong>42-day quarantine</strong> measures imposed by Spain
                on its repatriated nationals (from 6 May 2026) and similar
                monitoring protocols elsewhere. The World Health Organization
                has reiterated that the overall risk of international spread
                remains low and that no travel restrictions are required.
              </p>
            </div>
          </section>

          <hr className="divider mb-8" />

          {/* Sources / next steps */}
          <section className="max-w-prose">
            <h2 className="text-xl font-medium text-color-text mb-3 uppercase">
              » Further reading
            </h2>
            <ul className="space-y-2 font-data text-xs uppercase tracking-wider">
              <li>
                <Link
                  href={`/outbreak/${meta.slug}/cases`}
                  className="text-color-accent hover:underline"
                >
                  ▸ Cases page — confirmed and suspected cases by country
                </Link>
              </li>
              <li>
                <Link
                  href={`/outbreak/${meta.slug}/timeline`}
                  className="text-color-accent hover:underline"
                >
                  ▸ Full timeline — all events from departure through
                  evacuation
                </Link>
              </li>
              <li>
                <Link
                  href="/pathogen/hantavirus"
                  className="text-color-accent hover:underline"
                >
                  ▸ Pathogen guide — hantavirus strains, transmission,
                  incubation
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
