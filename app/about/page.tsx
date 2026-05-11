import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "About — Outbreak Tracker",
  description:
    "What this project is, how we compile data, and how to report corrections or new outbreaks.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
          <header className="mb-8 max-w-2xl">
            <h1 className="text-display font-semibold text-color-text leading-tight mb-3">
              About this project
            </h1>
            <p className="text-lg text-color-text-muted leading-relaxed">
              An independent information resource tracking infectious disease
              outbreaks through structured data and verified sources.
            </p>
          </header>

          <hr className="divider mb-8" />

          <div className="prose-serif max-w-prose space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-color-text mb-3 font-sans">
                What this is
              </h2>
              <p>
                Outbreak Tracker is an independent, non-commercial information
                resource. It compiles publicly available data on infectious
                disease outbreaks into structured timelines, maps, and case
                tables. The goal is to present factual information clearly and
                without sensationalism, with every claim traceable to a primary
                or authoritative secondary source.
              </p>
              <p>
                This site is not affiliated with the World Health Organization,
                the Centers for Disease Control and Prevention, Oceanwide
                Expeditions, or any government agency. It does not give medical
                advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-color-text mb-3 font-sans">
                Methodology
              </h2>
              <p>
                For each outbreak, we compile data from the following source
                hierarchy:
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-2 mt-3">
                <li>
                  Official statements from the World Health Organization, ECDC,
                  CDC, and national health authorities.
                </li>
                <li>
                  Statements from directly involved parties (e.g., ship
                  operators, hospital systems).
                </li>
                <li>
                  Reporting from wire services (Reuters, AP) and established
                  international news organisations.
                </li>
              </ol>
              <p className="mt-4">
                We do not report case counts, deaths, or geographic spread
                without a source link. When figures conflict between sources,
                we use the most recent official figure and note the discrepancy.
                We do not speculate about unreported cases.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-color-text mb-3 font-sans">
                Update frequency
              </h2>
              <p>
                During an active outbreak, we aim to update case counts and the
                event timeline within 24 hours of new official information. The
                &quot;Last updated&quot; timestamp on each outbreak page reflects the
                most recent edit to any data on that page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-color-text mb-3 font-sans">
                Reporting corrections or new outbreaks
              </h2>
              <p>
                If you have found an error, have access to a primary source that
                contradicts our data, or wish to suggest a new outbreak for
                tracking, please open an issue on the project&apos;s GitHub
                repository or email the address listed there. We will review all
                submissions and update the data where warranted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-color-text mb-3 font-sans">
                Disclaimer
              </h2>
              <p>
                All information on this site is compiled from publicly available
                sources for educational and informational purposes only. It
                should not be used as a substitute for professional medical
                advice, diagnosis, or treatment. In a medical emergency, contact
                your local emergency services or healthcare provider.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-8 border-t border-color-rule">
            <Link
              href="/"
              className="font-data text-xs text-color-text-muted uppercase tracking-wider hover:text-color-accent transition-colors"
            >
              ← View all outbreaks
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
