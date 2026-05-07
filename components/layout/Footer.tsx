import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-color-rule mt-16">
      <div className="divider-pulse" aria-hidden />
      <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="live-dot" aria-hidden />
          <span className="font-data text-[10px] uppercase tracking-widest text-color-accent">
            Signal nominal · feed active
          </span>
        </div>
        <p className="text-xs text-color-text-muted max-w-prose leading-relaxed mb-4">
          Independent informational resource compiled from publicly available
          sources. Not affiliated with WHO, Oceanwide Expeditions, or any
          government health authority. For medical guidance, consult official
          sources or a healthcare professional.
        </p>
        <div className="flex flex-wrap gap-4 font-data text-[10px] uppercase tracking-widest text-color-text-subtle">
          <Link href="/" className="hover:text-color-accent transition-colors">
            ▸ Outbreaks
          </Link>
          <Link
            href="/about"
            className="hover:text-color-accent transition-colors"
          >
            ▸ Methodology
          </Link>
          <span>{"// Data: WHO · CDC · ECDC · Reuters · AP"}</span>
        </div>
      </div>
    </footer>
  );
}
