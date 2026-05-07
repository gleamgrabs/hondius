import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-color-bg/95 backdrop-blur-sm border-b border-color-rule">
      <div className="max-w-content mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 no-underline"
          aria-label="Hondius Watch — home"
        >
          <span className="font-data text-xs text-color-accent border border-color-accent px-1.5 py-0.5 leading-none">
            [H]
          </span>
          <span className="font-data text-sm tracking-widest uppercase text-color-text">
            Hondius Watch
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span className="live-dot" aria-hidden />
          <span className="font-data text-[11px] uppercase tracking-widest text-color-accent">
            Outbreak active
          </span>
        </div>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-5 list-none m-0 p-0">
            <li>
              <Link
                href="/"
                className="font-data text-xs uppercase tracking-wider text-color-text-muted hover:text-color-accent no-underline transition-colors"
              >
                Outbreaks
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="font-data text-xs uppercase tracking-wider text-color-text-muted hover:text-color-accent no-underline transition-colors"
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="divider-pulse" aria-hidden />
    </header>
  );
}
