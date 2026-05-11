"use client";

import { useState, useMemo } from "react";
import { COUNTRY_COORDS } from "@/lib/country-coords";

interface Props {
  eventId: string;
  eventDate: string; // ISO yyyy-mm-dd
  eventDescription: string;
  eventSourceUrl?: string;
  token: string;
  outbreakSlug?: string;
  onDone?: () => void;
}

type Status = "confirmed" | "suspected" | "evacuated" | "deceased";

export default function EventToCaseForm({
  eventId,
  eventDate,
  eventDescription,
  eventSourceUrl,
  token,
  outbreakSlug = "hondius-2026",
  onDone,
}: Props) {
  // Дефолтный stable id для кейса — производный от eventId.
  const defaultCaseId = useMemo(
    () => `case-from-${eventId.slice(0, 40)}`,
    [eventId]
  );

  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [caseCount, setCaseCount] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [status, setStatus] = useState<Status>("confirmed");
  const [dateConfirmed, setDateConfirmed] = useState(
    eventDate.slice(0, 10) || new Date().toISOString().slice(0, 10)
  );
  const [caseId, setCaseId] = useState(defaultCaseId);
  const [notes, setNotes] = useState(eventDescription.slice(0, 300));

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleCountryCodeChange(raw: string) {
    const code = raw.toUpperCase().slice(0, 2);
    setCountryCode(code);
    const lookup = COUNTRY_COORDS[code];
    if (lookup) {
      setCountryName(lookup.name);
      setLat(String(lookup.lat));
      setLng(String(lookup.lng));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setResult(null);

    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setErr("Lat/Lng must be numbers");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/event-to-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          outbreakSlug,
          approveEvent: true,
          case: {
            id: caseId,
            country: countryName || countryCode,
            countryCode,
            coords: [latN, lngN],
            caseCount,
            deaths,
            status,
            dateConfirmed,
            notes,
            sourceUrl: eventSourceUrl,
          },
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setResult("✓ Case added to map; event approved");
      setTimeout(() => onDone?.(), 1200);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "bg-color-bg border border-color-rule px-2 py-1 font-data text-xs text-color-text focus:border-color-accent focus:outline-none w-full";
  const labelCls =
    "font-data text-[9px] uppercase tracking-widest text-color-text-muted mb-0.5 block";

  return (
    <form
      onSubmit={onSubmit}
      className="hud-frame p-3 mt-2 bg-color-bg space-y-2"
    >
      <span className="hud-corner-tl" />
      <span className="hud-corner-br" />
      <div className="font-data text-[10px] uppercase tracking-widest text-color-accent mb-1">
        ▸ Add case from this event
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Country code (ISO-2)</label>
          <input
            className={inputCls}
            value={countryCode}
            onChange={(e) => handleCountryCodeChange(e.target.value)}
            placeholder="US"
            maxLength={2}
            required
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Country name (display)</label>
          <input
            className={inputCls}
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            placeholder="United States"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className={labelCls}>Lat</label>
          <input
            className={inputCls}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="38.9"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Lng</label>
          <input
            className={inputCls}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-77.0"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Cases</label>
          <input
            className={inputCls}
            type="number"
            min={0}
            value={caseCount}
            onChange={(e) => setCaseCount(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelCls}>Deaths</label>
          <input
            className={inputCls}
            type="number"
            min={0}
            value={deaths}
            onChange={(e) => setDeaths(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Status</label>
          <select
            className={inputCls}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="confirmed">confirmed</option>
            <option value="suspected">suspected</option>
            <option value="evacuated">evacuated</option>
            <option value="deceased">deceased</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Date confirmed</label>
          <input
            className={inputCls}
            type="date"
            value={dateConfirmed}
            onChange={(e) => setDateConfirmed(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Case id (stable)</label>
          <input
            className={inputCls}
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes (max 300 char shown)</label>
        <textarea
          className={inputCls + " min-h-[60px]"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="font-data text-xs uppercase tracking-widest bg-color-accent text-color-bg px-3 py-1 hover:opacity-90 disabled:opacity-30 transition-opacity"
        >
          {submitting ? "..." : "[ Add case + approve event ]"}
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
    </form>
  );
}
