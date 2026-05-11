"use client";

import { useState } from "react";
import EventActionButtons from "./EventActionButtons";
import EventToCaseForm from "./EventToCaseForm";

interface Props {
  id: string;
  eventDate: string;
  eventDescription: string;
  eventSourceUrl?: string;
  currentStatus: string;
  outbreakSlug: string;
  token: string;
}

export default function EventCardActions({
  id,
  eventDate,
  eventDescription,
  eventSourceUrl,
  currentStatus,
  outbreakSlug,
  token,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <EventActionButtons
          id={id}
          outbreakSlug={outbreakSlug}
          token={token}
          currentStatus={currentStatus}
        />
      </div>
      <div className="text-right mt-1">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="font-data text-[10px] uppercase tracking-wider text-color-text-subtle hover:text-color-warning transition-colors"
          title="Manual override — only use if LLM auto-extraction missed a case from this article"
        >
          {showForm ? "× cancel manual" : "+ manual case (override)"}
        </button>
      </div>
      {showForm && (
        <EventToCaseForm
          eventId={id}
          eventDate={eventDate}
          eventDescription={eventDescription}
          eventSourceUrl={eventSourceUrl}
          outbreakSlug={outbreakSlug}
          token={token}
          onDone={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
