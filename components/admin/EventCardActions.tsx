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
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="font-data text-xs uppercase tracking-wider px-3 py-1 border border-color-warning text-color-warning hover:bg-color-warning hover:text-color-bg transition-colors"
        >
          {showForm ? "Cancel" : "Add case"}
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
