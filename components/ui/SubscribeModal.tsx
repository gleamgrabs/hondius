"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hondius:subscribe-dismissed";

type State = "idle" | "submitting" | "success" | "error";

export default function SubscribeModal() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const id = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(id);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setState("error");
        setErrorMsg(json.error ?? "Something went wrong");
        return;
      }
      setState("success");
      setTimeout(close, 3500);
    } catch (err) {
      setState("error");
      setErrorMsg(String(err));
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-title"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-flicker"
      onClick={close}
    >
      <div
        className="hud-frame max-w-md w-full p-6 relative bg-color-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hud-corner-tl" />
        <span className="hud-corner-br" />

        <div className="flex items-center gap-2 mb-3">
          <span className="live-dot" aria-hidden />
          <span className="font-data text-[10px] uppercase tracking-widest text-color-accent">
            Outbreak alerts
          </span>
        </div>

        <h2
          id="subscribe-title"
          className="font-data text-lg uppercase tracking-wider text-color-text mb-2"
        >
          Subscribe to outbreak updates
        </h2>
        <p className="text-sm text-color-text-muted leading-relaxed mb-4">
          Receive case-count updates and timeline events for the MV Hondius
          outbreak by email. Double opt-in — we send a confirmation link first.
          Unsubscribe at any time.
        </p>

        {state === "success" ? (
          <div
            className="font-data text-xs uppercase tracking-widest text-color-success py-3 px-2 text-center border border-color-rule"
            role="status"
          >
            ✓ Check your inbox to confirm
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              name="email"
              type="email"
              required
              placeholder="you@domain.tld"
              aria-label="Email address"
              disabled={state === "submitting"}
              className="w-full bg-color-bg border border-color-rule px-3 py-2 font-data text-sm text-color-text placeholder:text-color-text-subtle focus:border-color-accent focus:outline-none disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={state === "submitting"}
                className="flex-1 font-data text-xs uppercase tracking-widest bg-color-accent text-color-bg px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {state === "submitting" ? "[ Sending… ]" : "[ Subscribe ]"}
              </button>
              <button
                type="button"
                onClick={close}
                className="font-data text-xs uppercase tracking-widest text-color-text-muted px-4 py-2 border border-color-rule hover:text-color-text hover:border-color-text-muted transition-colors"
              >
                Dismiss
              </button>
            </div>
            {state === "error" && (
              <p className="text-xs text-color-accent" role="alert">
                Error: {errorMsg}
              </p>
            )}
          </form>
        )}

        <p className="text-[10px] text-color-text-subtle mt-4 leading-relaxed">
          Your email is stored only to send these updates. No tracking. Unsubscribe link in every email.
        </p>
      </div>
    </div>
  );
}
