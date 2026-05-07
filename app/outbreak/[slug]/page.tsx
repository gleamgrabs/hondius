import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StatusPill from "@/components/ui/StatusPill";
import KeyFactsStrip from "@/components/ui/KeyFactsStrip";
import HoursSinceCounter from "@/components/ui/HoursSinceCounter";
import ContainmentBar from "@/components/ui/ContainmentBar";
import OutbreakMap from "@/components/map/OutbreakMap";
import MapTable from "@/components/map/MapTable";
import Timeline from "@/components/timeline/Timeline";
import CasesChart from "@/components/chart/CasesChart";
import { getOutbreakBySlug, getAllOutbreakSlugs } from "@/lib/outbreaks";
import { formatDate, buildOgUrl } from "@/lib/seo";

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
  const { meta } = data;
  const description = `${meta.stats.cases} confirmed cases, ${meta.stats.deaths} deaths across ${meta.stats.countries} countries. ${meta.summary}`;
  const ogImageUrl = buildOgUrl({
    cases: meta.stats.cases,
    deaths: meta.stats.deaths,
    title: meta.title,
  });
  return {
    title: `${meta.title} — Cases, map and timeline`,
    description,
    openGraph: {
      title: meta.title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
  };
}

export default function OutbreakPage({ params }: Props) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) notFound();

  const { meta, events, cases, route, sources, disembarked } = data;

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: meta.title,
    description: meta.summary,
    datePublished: meta.startDate,
    dateModified: meta.lastUpdated,
    author: {
      "@type": "Organization",
      name: "Outbreak Tracker",
    },
    citation: sources.map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: s.url,
      publisher: { "@type": "Organization", name: s.publisher },
    })),
  };

  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
        />

        <article>
          <div className="max-w-content mx-auto px-4 sm:px-6 pt-10 pb-16">
            {/* Editorial header */}
            <header className="mb-0">
              <p className="font-data text-xs text-color-text-muted uppercase tracking-widest mb-3">
                {meta.pathogen} · {meta.location}
              </p>

              <div className="flex items-start gap-4 flex-wrap">
                <h1 className="text-display font-semibold text-color-text leading-tight flex-1">
                  {meta.title}
                </h1>
                <div className="mt-2">
                  <StatusPill status={meta.status} />
                </div>
              </div>

              <p className="text-lg text-color-text-muted mt-3 leading-relaxed max-w-3xl">
                {meta.summary}
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-4">
                <span className="text-sm text-color-text-muted">
                  Compiled from WHO, Reuters, AP
                </span>
                <span className="font-data text-xs text-color-text-subtle uppercase tracking-wider">
                  Published{" "}
                  <time dateTime={meta.startDate}>
                    {formatDate(meta.startDate)}
                  </time>
                </span>
                <span className="font-data text-xs text-color-text-subtle uppercase tracking-wider">
                  Updated{" "}
                  <time dateTime={meta.lastUpdated}>
                    {formatDate(meta.lastUpdated)}
                  </time>
                </span>
              </div>
            </header>

            {/* Live HUD row */}
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <HoursSinceCounter
                startIso={meta.stats.firstSymptomDate ?? meta.startDate}
              />
              <ContainmentBar
                cases={meta.stats.cases}
                countries={meta.stats.countries}
              />
            </div>

            {/* Key facts */}
            <KeyFactsStrip
              cases={meta.stats.cases}
              deaths={meta.stats.deaths}
              countries={meta.stats.countries}
              disembarked={meta.stats.disembarkedUnaware ?? 0}
              firstSymptomDate={meta.stats.firstSymptomDate ?? meta.startDate}
            />

            {/* Lead text */}
            <div className="prose-serif mb-8 max-w-prose">
              <p>
                The MV Hondius, a polar expedition vessel operated by Oceanwide
                Expeditions, departed Ushuaia, Argentina on 1 April 2026 with
                approximately 150 people aboard — 89 passengers and 61 crew.
                <sup>
                  <a
                    href="#source-5"
                    className="text-color-accent hover:underline"
                    aria-label="Source 5: Oceanwide Expeditions"
                  >
                    [5]
                  </a>
                </sup>{" "}
                On 6 April, the first passenger developed symptoms consistent
                with hantavirus infection. The pathogen — the Andes strain of
                hantavirus — is known to cause hantavirus pulmonary syndrome
                with a historical case fatality rate of up to 40%.
                <sup>
                  <a
                    href="#source-7"
                    className="text-color-accent hover:underline"
                    aria-label="Source 7: CDC"
                  >
                    [7]
                  </a>
                </sup>
              </p>
              <p>
                On 24 April, the ship made a scheduled stop at St Helena island
                in the South Atlantic. Twenty-three passengers disembarked and
                departed for their home countries, unaware that an outbreak was
                developing on board.
                <sup>
                  <a
                    href="#source-2"
                    className="text-color-accent hover:underline"
                    aria-label="Source 2: Reuters"
                  >
                    [2]
                  </a>
                </sup>{" "}
                The incubation period for the Andes strain ranges from one to
                eight weeks, meaning exposed individuals may not develop
                symptoms for some time after departing the ship.
              </p>
              <p>
                By 7 May 2026, eight cases had been confirmed and three people
                had died. Both Cabo Verde and the Canary Islands refused to
                allow the ship to dock.
                <sup>
                  <a
                    href="#source-1"
                    className="text-color-accent hover:underline"
                    aria-label="Source 1: WHO"
                  >
                    [1]
                  </a>
                </sup>{" "}
                The vessel was redirected to Tenerife, with an estimated arrival
                of 9 May. The World Health Organization assessed the risk of
                wider international spread as low, given the limited
                transmissibility of the Andes strain compared with respiratory
                pathogens such as SARS-CoV-2.
              </p>
            </div>

            {/* Map */}
            <OutbreakMap
              cases={cases}
              route={route}
              date={formatDate(meta.lastUpdated)}
              slug={meta.slug}
            />
            <MapTable cases={cases} route={route} />

            <hr className="divider my-10" />

            {/* Timeline */}
            <section aria-labelledby="timeline-heading">
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="timeline-heading"
                  className="text-display-sm font-medium text-color-text"
                >
                  Timeline of events
                </h2>
                <Link
                  href={`/outbreak/${meta.slug}/timeline`}
                  className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
                >
                  View full timeline →
                </Link>
              </div>
              <Timeline events={events} limit={7} reverseChron={true} />
              <Link
                href={`/outbreak/${meta.slug}/timeline`}
                className="inline-block mt-2 font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
              >
                View all {events.length} events →
              </Link>
            </section>

            <hr className="divider my-10" />

            {/* Cases chart */}
            <CasesChart />

            <hr className="divider my-10" />

            {/* Disembarked passengers */}
            <section aria-labelledby="disembarked-heading">
              <h2
                id="disembarked-heading"
                className="text-display-sm font-medium text-color-text mb-2"
              >
                Where 23 unaware passengers travelled
              </h2>
              <p className="text-color-text-muted text-sm leading-relaxed max-w-prose mb-6">
                When MV Hondius stopped at St Helena on 24 April, 23 passengers
                disembarked and flew home before the outbreak was formally
                identified. The Andes strain has an incubation period of one to
                eight weeks, meaning those individuals could develop symptoms
                weeks after their departure. Health authorities in several
                countries have initiated contact-tracing programmes.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse max-w-xl">
                  <thead>
                    <tr className="border-b border-color-rule">
                      <th className="text-left py-2 pr-8 font-data text-xs uppercase tracking-wider text-color-text-muted">
                        Destination
                      </th>
                      <th className="text-left py-2 pr-8 font-data text-xs uppercase tracking-wider text-color-text-muted">
                        Passengers
                      </th>
                      <th className="text-left py-2 font-data text-xs uppercase tracking-wider text-color-text-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-color-rule">
                    {disembarked.map((d) => (
                      <tr key={d.countryCode}>
                        <td className="py-2 pr-8">{d.country}</td>
                        <td className="py-2 pr-8 font-data">{d.passengerCount}</td>
                        <td className="py-2">
                          {d.hasConfirmedCase ? (
                            <span className="text-color-accent font-medium text-xs">
                              Case confirmed
                            </span>
                          ) : (
                            <span className="text-color-text-muted text-xs">
                              Under monitoring
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <hr className="divider my-10" />

            {/* WHO assessment */}
            <section aria-labelledby="who-heading">
              <h2
                id="who-heading"
                className="text-display-sm font-medium text-color-text mb-4"
              >
                WHO risk assessment
              </h2>
              <blockquote className="border-l-2 border-color-rule pl-6 max-w-prose">
                <p className="text-color-text-muted leading-relaxed">
                  The World Health Organization has assessed the risk of
                  significant international spread as low. The Andes hantavirus
                  is considerably less transmissible than respiratory pathogens
                  such as SARS-CoV-2: it is not spread via casual contact or
                  airborne droplets in typical settings, and person-to-person
                  transmission, while documented for the Andes strain, requires
                  prolonged close contact. WHO has not issued any travel
                  restrictions or trade advisories related to this event.
                </p>
                <footer className="mt-3">
                  <cite className="font-data text-xs text-color-text-subtle uppercase tracking-wider not-italic">
                    World Health Organization, May 2026 —{" "}
                    <a
                      href="https://www.who.int/emergencies/disease-outbreak-news/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-color-accent hover:underline"
                    >
                      Source ↗
                    </a>
                  </cite>
                </footer>
              </blockquote>
            </section>

            <hr className="divider my-10" />

            {/* About hantavirus */}
            <section aria-labelledby="about-pathogen-heading">
              <h2
                id="about-pathogen-heading"
                className="text-display-sm font-medium text-color-text mb-3"
              >
                About hantavirus
              </h2>
              <p className="text-color-text-muted leading-relaxed max-w-prose mb-3">
                Hantaviruses are a family of RNA viruses carried primarily by
                rodents. The Andes strain, found in South America, causes
                hantavirus pulmonary syndrome — a severe respiratory illness
                with a historical case fatality rate of up to 40%. Unlike most
                other hantavirus strains, the Andes strain is the only one
                known to spread from person to person, though this requires
                close, prolonged contact.
              </p>
              <Link
                href="/pathogen/hantavirus"
                className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
              >
                Read full guide on hantavirus →
              </Link>
            </section>

            <hr className="divider my-10" />

            {/* Sources */}
            <section aria-labelledby="sources-heading">
              <h2
                id="sources-heading"
                className="text-display-sm font-medium text-color-text mb-4"
              >
                Sources
              </h2>
              <ol className="space-y-3 text-sm max-w-prose">
                {sources.map((s) => (
                  <li key={s.id} id={`source-${s.id}`} className="flex gap-3">
                    <span className="font-data text-xs text-color-text-muted flex-shrink-0 mt-0.5">
                      [{s.id}]
                    </span>
                    <div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-color-text hover:text-color-accent hover:underline"
                      >
                        {s.title}
                      </a>
                      <span className="text-color-text-muted">
                        {" "}
                        — {s.publisher}.
                      </span>
                      {s.publishedDate && (
                        <time
                          dateTime={s.publishedDate}
                          className="text-color-text-subtle"
                        >
                          {" "}
                          Published {formatDate(s.publishedDate)}.
                        </time>
                      )}
                      <span className="text-color-text-subtle">
                        {" "}
                        Accessed {formatDate(s.accessed)}.
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Disclaimer */}
            <div className="mt-12 pt-8 border-t border-color-rule">
              <p className="text-xs text-color-text-muted leading-relaxed max-w-prose">
                This is an independent informational resource compiled from
                publicly available sources. It is not affiliated with the World
                Health Organization, Oceanwide Expeditions, or any government
                health authority. For medical guidance, consult official sources
                or a healthcare professional.
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
