import Link from "next/link";
import { getAllOutbreakMetas } from "@/lib/outbreaks";

export default function Header() {
  // Берём актуальный статус первой активной/contained вспышки. Если все resolved — silent.
  const metas = getAllOutbreakMetas();
  const featured =
    metas.find((m) => m.status === "active") ??
    metas.find((m) => m.status === "contained") ??
    metas[0];

  const statusBadge = featured
    ? statusToBadge(featured.status)
    : null;

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

        {statusBadge && (
          <div className="hidden sm:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            {statusBadge.pulse && (
              <span className="live-dot" aria-hidden />
            )}
            <span
              className="font-data text-[11px] uppercase tracking-widest"
              style={{ color: `var(--${statusBadge.colorVar})` }}
            >
              {statusBadge.label}
            </span>
          </div>
        )}

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
      {/* Pulse-разделитель только при active. Иначе тихая линия. */}
      {featured?.status === "active" ? (
        <div className="divider-pulse" aria-hidden />
      ) : null}
    </header>
  );
}

function statusToBadge(status: "active" | "contained" | "resolved") {
  switch (status) {
    case "active":
      return { label: "Outbreak active", colorVar: "color-accent", pulse: true };
    case "contained":
      return {
        label: "Outbreak contained · monitoring",
        colorVar: "color-warning",
        pulse: false,
      };
    case "resolved":
      return { label: "Resolved", colorVar: "color-success", pulse: false };
  }
}
