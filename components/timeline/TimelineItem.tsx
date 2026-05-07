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

export default function TimelineItem({ event }: TimelineItemProps) {
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
          {event.sources.length > 0 && (
            <>
              {" "}
              <a
                href={event.sources[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-color-accent hover:underline"
                aria-label={`Source for: ${event.title}`}
              >
                Source ↗
              </a>
            </>
          )}
        </p>
        {event.location && (
          <p className="font-data text-xs text-color-text-subtle uppercase tracking-wider mt-1">
            {event.location}
          </p>
        )}
      </div>
    </article>
  );
}
