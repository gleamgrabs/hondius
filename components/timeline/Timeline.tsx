import type { OutbreakEvent } from "@/lib/types";
import TimelineItem from "./TimelineItem";

interface TimelineProps {
  events: OutbreakEvent[];
  limit?: number;
  reverseChron?: boolean;
}

export default function Timeline({
  events,
  limit,
  reverseChron = true,
}: TimelineProps) {
  const sorted = [...events].sort((a, b) =>
    reverseChron
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const displayed = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div aria-label="Event timeline">
      {displayed.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}
