import { daysSince } from "@/lib/seo";

interface Fact {
  value: string | number;
  label: string;
  accent?: boolean;
}

interface KeyFactsStripProps {
  cases: number;
  deaths: number;
  countries: number;
  disembarked: number;
  firstSymptomDate: string;
}

export default function KeyFactsStrip({
  cases,
  deaths,
  countries,
  disembarked,
  firstSymptomDate,
}: KeyFactsStripProps) {
  const days = daysSince(firstSymptomDate);

  const facts: Fact[] = [
    { value: cases, label: "Confirmed cases", accent: true },
    { value: deaths, label: "Deaths", accent: true },
    { value: countries, label: "Countries affected" },
    { value: days, label: "Days since first symptom" },
    { value: disembarked, label: "Disembarked unaware" },
  ];

  return (
    <div
      className="hud-frame grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 my-8"
      role="region"
      aria-label="Key outbreak statistics"
    >
      <span className="hud-corner-tl" />
      <span className="hud-corner-br" />
      {facts.map((fact, i) => (
        <div
          key={fact.label}
          className={`px-5 py-4 ${
            i > 0 ? "border-l border-color-rule" : ""
          }`}
        >
          <div className="data-label mb-1.5 flex items-center gap-1.5">
            {fact.accent && (
              <span className="live-dot" aria-hidden style={{ width: 6, height: 6 }} />
            )}
            {fact.label}
          </div>
          <div
            className={`font-data text-3xl font-semibold tabular-nums leading-none ${
              fact.accent ? "text-color-accent text-glow-accent" : "text-color-text"
            }`}
          >
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  );
}
