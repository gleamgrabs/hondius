import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StatusPill from "@/components/ui/StatusPill";
import { getOutbreaksByPathogen } from "@/lib/outbreaks";
import { formatDate } from "@/lib/seo";

const PATHOGEN_SLUGS = ["hantavirus"];

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return PATHOGEN_SLUGS.map((slug) => ({ slug }));
}

const hantavirusContent = {
  title: "Hantavirus",
  subtitle: "A family of RNA viruses carried by rodents, capable of causing severe respiratory and renal disease in humans.",
  description: `
Hantaviruses are a family of negative-sense, single-stranded RNA viruses in the order *Bunyavirales*. They are maintained in nature by specific rodent reservoir hosts, with each strain typically associated with a single host species. Humans become infected primarily through inhalation of aerosolised particles from rodent excreta — urine, faeces, and saliva.

Two major disease syndromes are associated with hantavirus infection in humans: **hantavirus pulmonary syndrome (HPS)** and **haemorrhagic fever with renal syndrome (HFRS)**. HPS predominates in the Americas; HFRS is the more common presentation in Europe and Asia.

**The Andes strain** (genus *Orthohantavirus*, South America) is notable for two reasons: it is among the most lethal known hantaviruses, with historical case fatality rates approaching 40%, and it is the only hantavirus strain for which sustained person-to-person transmission has been documented — though this requires prolonged close contact, typically within households or among caregivers.

**Historical outbreaks of note:**
- *Four Corners, United States (1993)* — The first recognition of HPS as a distinct syndrome. A cluster of unexplained respiratory deaths in the American Southwest was traced to the Sin Nombre hantavirus carried by deer mice (*Peromyscus maniculatus*). Thirty-three of the initial 53 confirmed cases were fatal.
- *Andes hantavirus, Argentina and Chile (1995–present)* — The Andes strain has caused repeated outbreaks in southern South America, including clusters demonstrating person-to-person transmission within families.
- *MV Hondius outbreak, North Atlantic (2026)* — The first documented cluster of Andes hantavirus infection aboard a cruise vessel, with subsequent international spread to passengers who disembarked before the outbreak was recognised.

**Transmission:** Contact with infected rodents or their excreta, either directly or through aerosol inhalation. The Andes strain additionally transmits through close personal contact with an infected individual, though this mode requires prolonged exposure.

**Incubation period:** 1–8 weeks (most cases present 2–4 weeks after exposure).

**Symptoms:** Fever, myalgia, and fatigue in the early phase (3–7 days), followed by rapid onset of respiratory distress with pulmonary oedema in HPS. The transition from prodrome to cardiopulmonary phase can occur within 24 hours.

**Treatment:** No specific antiviral treatment is approved. Management is supportive — early intensive care, oxygen supplementation, and in severe cases extracorporeal membrane oxygenation (ECMO). Early transfer to an ICU is associated with improved outcomes.

**Prognosis:** Case fatality rates vary by strain. Sin Nombre: approximately 36%. Andes: up to 40% in some outbreaks. Puumala (HFRS, Europe): less than 1%.
  `,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!PATHOGEN_SLUGS.includes(params.slug)) return {};
  return {
    title: `${hantavirusContent.title} — Pathogen guide`,
    description: hantavirusContent.subtitle,
    openGraph: {
      title: `${hantavirusContent.title} — Pathogen guide`,
      description: hantavirusContent.subtitle,
    },
  };
}

export default function PathogenPage({ params }: Props) {
  if (!PATHOGEN_SLUGS.includes(params.slug)) notFound();

  const outbreaks = getOutbreaksByPathogen(params.slug);

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: hantavirusContent.title,
    description: hantavirusContent.subtitle,
    code: {
      "@type": "MedicalCode",
      codeValue: "B33.4",
      codingSystem: "ICD-10",
    },
    infectiousAgent: "Hantavirus (Andes strain)",
    transmissionMethod: "Aerosol inhalation of rodent excreta; person-to-person (Andes strain only)",
  };

  const paragraphs = hantavirusContent.description
    .trim()
    .split("\n\n")
    .filter(Boolean);

  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <div className="mb-4">
            <Link
              href="/"
              className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
            >
              ← All outbreaks
            </Link>
          </div>

          <header className="mb-8 max-w-3xl">
            <p className="font-data text-xs text-color-text-muted uppercase tracking-widest mb-2">
              Pathogen guide
            </p>
            <h1 className="text-display font-semibold text-color-text leading-tight mb-3">
              {hantavirusContent.title}
            </h1>
            <p className="text-lg text-color-text-muted leading-relaxed">
              {hantavirusContent.subtitle}
            </p>
          </header>

          <hr className="divider mb-8" />

          <div className="grid lg:grid-cols-[1fr_280px] gap-12">
            <article>
              <div className="prose-serif">
                {paragraphs.map((para, i) => {
                  const isList = para.startsWith("-");

                  if (isList) {
                    const items = para
                      .split("\n")
                      .filter((l) => l.startsWith("-"))
                      .map((l) => l.slice(2));
                    return (
                      <ul key={i} className="list-disc list-outside pl-5 space-y-2 mb-5">
                        {items.map((item, j) => (
                          <li key={j} className="text-color-text-muted text-base leading-relaxed">
                            <span dangerouslySetInnerHTML={{
                              __html: item
                                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                            }} />
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p
                      key={i}
                      className="mb-5"
                      dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                      }}
                    />
                  );
                })}
              </div>
            </article>

            <aside>
              <div className="sticky top-20">
                <h2 className="font-data text-xs uppercase tracking-wider text-color-text-muted mb-4">
                  Quick reference
                </h2>
                <dl className="space-y-4 text-sm">
                  {[
                    ["Family", "Hantaviridae"],
                    ["Genus", "Orthohantavirus"],
                    ["Strain (this outbreak)", "Andes hantavirus"],
                    ["Reservoir", "Rodents"],
                    ["Incubation", "1–8 weeks"],
                    ["CFR (Andes strain)", "Up to 40%"],
                    ["Treatment", "Supportive care"],
                    ["Person-to-person", "Yes (Andes only)"],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-color-rule pb-3">
                      <dt className="data-label mb-0.5">{label}</dt>
                      <dd className="text-color-text">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 pt-6 border-t border-color-rule">
                  <h3 className="font-data text-xs uppercase tracking-wider text-color-text-muted mb-3">
                    Authoritative sources
                  </h3>
                  <ul className="space-y-2 text-xs">
                    {[
                      ["CDC — Hantavirus", "https://www.cdc.gov/hantavirus/"],
                      ["WHO — Hantavirus", "https://www.who.int/news-room/fact-sheets/detail/hantavirus-disease"],
                      ["ECDC", "https://www.ecdc.europa.eu/en/hantavirus-infection"],
                    ].map(([label, url]) => (
                      <li key={url as string}>
                        <a
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-color-text-muted hover:text-color-accent hover:underline transition-colors"
                        >
                          {label as string} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>

          <hr className="divider mt-12 mb-8" />

          {/* Tracked outbreaks */}
          <section aria-labelledby="tracked-outbreaks-heading">
            <h2
              id="tracked-outbreaks-heading"
              className="text-display-sm font-medium text-color-text mb-6"
            >
              Tracked outbreaks — {hantavirusContent.title}
            </h2>
            <div className="grid gap-px bg-color-rule sm:grid-cols-2 lg:grid-cols-3 border border-color-rule">
              {outbreaks.map(({ meta }) => (
                <Link
                  key={meta.slug}
                  href={`/outbreak/${meta.slug}`}
                  className="group block bg-color-bg p-5 hover:bg-color-bg-subtle transition-colors no-underline"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <span className="font-data text-xs text-color-text-muted uppercase tracking-wider">
                      {formatDate(meta.startDate)}
                    </span>
                    <StatusPill status={meta.status} />
                  </div>
                  <h3 className="font-semibold text-base text-color-text group-hover:text-color-accent transition-colors leading-snug">
                    {meta.title}
                  </h3>
                  <p className="text-sm text-color-text-muted mt-1">
                    {meta.stats.cases} cases · {meta.stats.deaths} deaths
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
