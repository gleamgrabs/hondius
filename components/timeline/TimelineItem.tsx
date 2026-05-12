import type { OutbreakEvent, EventSeverity } from "@/lib/types";
import { formatDate } from "@/lib/seo";

const severityColor: Record<EventSeverity, string> = {
  info: "bg-color-text-subtle",
  warning: "bg-[#b8860b]",
  critical: "bg-color-accent",
};

interface TimelineItemProps {
  event: OutbreakEvent;
}

/**
 * Возвращает читаемую метку для URL: publisher name из домена.
 * Не идеально (cnn.com→CNN, edition.cnn.com→Edition.cnn), но достаточно
 * для компактного списка под событием.
 */
function labelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    // Известные публикаторы — короткие имена.
    const known: Record<string, string> = {
      "who.int": "WHO",
      "ecdc.europa.eu": "ECDC",
      "cdc.gov": "CDC",
      "reuters.com": "Reuters",
      "reutersagency.com": "Reuters",
      "apnews.com": "AP",
      "bbc.com": "BBC",
      "bbc.co.uk": "BBC",
      "edition.cnn.com": "CNN",
      "cnn.com": "CNN",
      "cnbc.com": "CNBC",
      "nbcnews.com": "NBC",
      "abcnews.go.com": "ABC",
      "abc7chicago.com": "ABC7",
      "npr.org": "NPR",
      "aljazeera.com": "Al Jazeera",
      "euronews.com": "Euronews",
      "rtve.es": "RTVE",
      "elmundo.es": "El Mundo",
      "theguardian.com": "Guardian",
      "diariodeavisos.elespanol.com": "Diario de Avisos",
      "news.un.org": "UN News",
      "meduza.io": "Meduza",
      "oceanwide-expeditions.com": "Oceanwide",
      "nytimes.com": "NYT",
    };
    if (known[host]) return known[host];
    // Fallback: первая часть домена.
    return host.split(".")[0];
  } catch {
    return "Source";
  }
}

export default function TimelineItem({ event }: TimelineItemProps) {
  // Дедуплицируем URLs и берём все источники.
  const sources = Array.from(new Set(event.sources)).filter(Boolean);

  return (
    <article className="flex gap-6 sm:gap-8">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${severityColor[event.severity]}`}
          aria-hidden
        />
        <div className="w-px flex-1 bg-color-rule mt-2" aria-hidden />
      </div>
      <div className="pb-8 min-w-0">
        <time
          dateTime={event.date}
          className="font-data text-xs text-color-text-muted uppercase tracking-wider block mb-1"
        >
          {formatDate(event.date)}
        </time>
        <h3 className="font-semibold text-base text-color-text mb-1 leading-snug">
          {event.title}
        </h3>
        <p className="text-sm text-color-text-muted leading-relaxed">
          {event.description}
        </p>
        {sources.length > 0 && (
          <p className="font-data text-[10px] uppercase tracking-wider text-color-text-subtle mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-color-text-muted">Sources:</span>
            {sources.map((url, i) => (
              <span key={url} className="inline-flex items-center">
                {i > 0 && (
                  <span className="text-color-text-subtle mr-2" aria-hidden>
                    ·
                  </span>
                )}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-color-accent hover:underline"
                  aria-label={`${labelFromUrl(url)} — source for: ${event.title}`}
                >
                  {labelFromUrl(url)} ↗
                </a>
              </span>
            ))}
          </p>
        )}
        {event.location && (
          <p className="font-data text-xs text-color-text-subtle uppercase tracking-wider mt-1">
            {event.location}
          </p>
        )}
      </div>
    </article>
  );
}
