import type { OutbreakData } from "@/lib/types";
import { formatDate } from "@/lib/seo";

interface Props {
  data: OutbreakData;
}

/**
 * FAQ блок для hondius-2026 с заполнением из live OutbreakData.
 * Для других вспышек — пустой блок (можно расширить когда появятся новые кейсы).
 */
export default function OutbreakFAQ({ data }: Props) {
  if (data.meta.slug !== "hondius-2026") return null;

  const { meta, cases, disembarked } = data;

  const breakdown = cases
    .filter((c) => c.caseCount > 0)
    .map(
      (c) =>
        `${c.country} (${c.caseCount} ${c.status === "deceased" ? "deceased" : c.status})`
    )
    .join(", ");

  const disembarkCountries = disembarked
    .map((d) => d.country)
    .join(", ");

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `How many hantavirus cases were confirmed in the MV Hondius outbreak?`,
      a: `${meta.stats.cases} confirmed cases with ${meta.stats.deaths} deaths across ${meta.stats.countries} countries as of ${formatDate(meta.lastUpdated)}. Breakdown: ${breakdown || "see the Cases page for the live list"}.`,
    },
    {
      q: `What strain of hantavirus was identified?`,
      a: `Andes hantavirus (Orthohantavirus, family Hantaviridae). This is the South American strain notable for being the only hantavirus with documented person-to-person transmission in close-contact settings. Historical case fatality rate: up to 40%.`,
    },
    {
      q: `What happened to the 23 passengers who disembarked at Saint Helena?`,
      a: `On 24 April 2026, 23 passengers left the ship at Saint Helena and flew to multiple destinations including ${disembarkCountries || "the Netherlands, United States, Switzerland, Australia, UK, Spain, Taiwan, and Germany"}. Several developed symptoms after returning home. See the Cases page for confirmed positive cases among this group.`,
    },
    {
      q: `What was the MV Hondius route?`,
      a: `Departure from Ushuaia, Argentina on 1 April 2026. Route: Drake Passage → Antarctic Peninsula → South Georgia → Saint Helena (disembark) → Cape Verde (denied entry 4 May) → Canary Islands (denied entry 7 May) → Tenerife (evacuation destination, docked 10 May 2026).`,
    },
    {
      q: `Can hantavirus spread between people?`,
      a: `Most hantavirus strains transmit only via aerosolised rodent excreta. Andes hantavirus is the exception — it has documented human-to-human transmission in close-contact settings (households, hospitals). This makes a cruise ship environment a particular concern for clustering.`,
    },
    {
      q: `What is the incubation period?`,
      a: `1 to 8 weeks from exposure to symptom onset. This wide window means new cases among disembarked passengers and crew can continue to appear months after the initial exposure on board.`,
    },
    {
      q: `Did the WHO issue travel restrictions?`,
      a: `No. WHO assessed the risk of international spread as low. Andes hantavirus is significantly less transmissible than respiratory pathogens like SARS-CoV-2. No travel restrictions or border measures were issued by WHO.`,
    },
    {
      q: `Where can I find primary sources?`,
      a: `All data on this site is linked to WHO situation reports, ECDC threat reports, Reuters, AP, Euronews, and official Oceanwide Expeditions statements. See the Sources section at the bottom of the outbreak page for full numbered citations.`,
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section
      aria-labelledby="faq-heading"
      className="mt-12 pt-8 border-t border-color-rule"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h2
        id="faq-heading"
        className="text-xl font-medium text-color-text mb-6 uppercase"
      >
        » Frequently asked questions
      </h2>
      <div className="space-y-5">
        {faqs.map((f, i) => (
          <details
            key={i}
            open={i < 3}
            className="hud-frame p-4"
          >
            <span className="hud-corner-tl" />
            <span className="hud-corner-br" />
            <summary className="cursor-pointer font-data text-sm uppercase tracking-wider text-color-text leading-snug list-none">
              <span className="text-color-accent mr-2">▸</span>
              {f.q}
            </summary>
            <p className="prose-serif mt-3 mb-0 max-w-prose">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
