"use client";

import { useState } from "react";

interface Props {
  id: string;
  outbreakSlug: string;
  token: string;
  currentStatus: string;
}

export default function EventActionButtons({
  id,
  outbreakSlug,
  token,
  currentStatus,
}: Props) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function set(status: "live" | "rejected") {
    setPending(status === "live" ? "approve" : "reject");
    setErr(null);
    try {
      const res = await fetch("/api/admin/event-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status, outbreakSlug }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setDone(status);
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(null);
    }
  }

  if (done) {
    return (
      <span className="font-data text-xs text-color-success uppercase tracking-wider">
        ✓ {done}
      </span>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        type="button"
        onClick={() => set("live")}
        disabled={pending !== null || currentStatus === "live"}
        className="font-data text-xs uppercase tracking-wider px-3 py-1 border border-color-success text-color-success hover:bg-color-success hover:text-color-bg disabled:opacity-30 transition-colors"
      >
        {pending === "approve" ? "..." : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => set("rejected")}
        disabled={pending !== null}
        className="font-data text-xs uppercase tracking-wider px-3 py-1 border border-color-accent text-color-accent hover:bg-color-accent hover:text-color-bg disabled:opacity-30 transition-colors"
      >
        {pending === "reject" ? "..." : "Reject"}
      </button>
      {err && (
        <span className="font-data text-xs text-color-accent ml-2" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
