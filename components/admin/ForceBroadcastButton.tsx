"use client";

import { useState } from "react";

interface Props {
  outbreakSlug: string;
  token: string;
}

export default function ForceBroadcastButton({ outbreakSlug, token }: Props) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function trigger() {
    if (!confirm("Force broadcast all pending events now? This bypasses the 6h debounce.")) {
      return;
    }
    setPending(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/broadcast/maybe-trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ outbreakSlug, force: true }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        action?: string;
        sent?: number;
        recipientCount?: number;
        error?: string;
      };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setResult(
        json.action === "sent"
          ? `Sent to ${json.sent}/${json.recipientCount}`
          : json.action === "noop"
          ? "Nothing to send"
          : json.action ?? "ok"
      );
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="font-data text-xs uppercase tracking-wider px-4 py-2 border border-color-accent text-color-accent hover:bg-color-accent hover:text-color-bg disabled:opacity-30 transition-colors"
      >
        {pending ? "Sending..." : "[ Force broadcast now ]"}
      </button>
      {result && (
        <span className="font-data text-xs text-color-success">{result}</span>
      )}
      {err && (
        <span className="font-data text-xs text-color-accent" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
