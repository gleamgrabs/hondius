// LLM-extraction of structured case data из текста новости (Claude Haiku 4.5).
// Используется из scripts/refresh-news.mjs.
//
// Принципы:
//  - Консервативный промпт: только явно подтверждённые случаи. Никаких спекуляций.
//  - Возвращает [] если не уверены.
//  - Stable id для каждого кейса (чтобы повторный extract из того же event не дублировал).
//  - Координаты берутся из локальной таблицы (только страны в таблице — иначе skip).

import crypto from "node:crypto";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// Карта стран → [lat, lng]. Дублирует lib/country-coords.ts но для .mjs runtime.
const COUNTRY_COORDS = {
  NL: { name: "Netherlands", lat: 52.37, lng: 4.9 },
  CH: { name: "Switzerland", lat: 46.95, lng: 7.45 },
  GB: { name: "United Kingdom", lat: 51.5, lng: -0.12 },
  DE: { name: "Germany", lat: 52.52, lng: 13.4 },
  ES: { name: "Spain", lat: 40.42, lng: -3.7 },
  US: { name: "United States", lat: 38.9, lng: -77.0 },
  FR: { name: "France", lat: 48.85, lng: 2.35 },
  AU: { name: "Australia", lat: -33.87, lng: 151.21 },
  TW: { name: "Taiwan", lat: 25.03, lng: 121.56 },
  IT: { name: "Italy", lat: 41.9, lng: 12.5 },
  AR: { name: "Argentina", lat: -34.6, lng: -58.4 },
  CL: { name: "Chile", lat: -33.45, lng: -70.67 },
  ZA: { name: "South Africa", lat: -33.92, lng: 18.42 },
  PT: { name: "Portugal", lat: 38.72, lng: -9.13 },
  BE: { name: "Belgium", lat: 50.85, lng: 4.35 },
  IE: { name: "Ireland", lat: 53.35, lng: -6.26 },
  NO: { name: "Norway", lat: 59.91, lng: 10.75 },
  SE: { name: "Sweden", lat: 59.33, lng: 18.07 },
  FI: { name: "Finland", lat: 60.17, lng: 24.94 },
  DK: { name: "Denmark", lat: 55.68, lng: 12.57 },
  AT: { name: "Austria", lat: 48.21, lng: 16.37 },
  PL: { name: "Poland", lat: 52.23, lng: 21.01 },
  CA: { name: "Canada", lat: 45.42, lng: -75.7 },
  BR: { name: "Brazil", lat: -15.8, lng: -47.86 },
  MX: { name: "Mexico", lat: 19.43, lng: -99.13 },
  JP: { name: "Japan", lat: 35.68, lng: 139.69 },
  KR: { name: "South Korea", lat: 37.57, lng: 126.98 },
  SG: { name: "Singapore", lat: 1.35, lng: 103.82 },
  CN: { name: "China", lat: 39.9, lng: 116.4 },
  IN: { name: "India", lat: 28.61, lng: 77.21 },
  NZ: { name: "New Zealand", lat: -41.29, lng: 174.78 },
  IS: { name: "Iceland", lat: 64.15, lng: -21.94 },
};

const SYSTEM_PROMPT = `You read a news article about the MV Hondius hantavirus outbreak (May 2026).
Extract per-country case data ONLY when the article EXPLICITLY states a confirmed or suspected case.

Output strict JSON — an array of objects, no markdown, no commentary:
[
  {
    "countryCode": "ISO 3166-1 alpha-2 (e.g. US, FR, ES)",
    "country": "Human-readable country name in English",
    "caseCount": <number, default 1>,
    "deaths": <number, default 0>,
    "status": "confirmed" | "suspected" | "deceased",
    "rationale": "1-sentence quote/paraphrase from the article justifying this case"
  }
]

RULES:
- Output [] if no explicit case info. Most general/background articles return [].
- ONLY extract when the article says someone tested positive, is hospitalised as suspected, or died from this outbreak.
- DO NOT extract from historical background ("hantavirus was first identified in...") or general disease info.
- DO NOT speculate or extrapolate. If article says "passenger may have", skip. If says "tested positive", include.
- One row per country. If article says "5 US cases", output one row with caseCount=5.
- For deaths: status="deceased" AND deaths=N AND caseCount=N (deaths are also cases).
- For evacuations alone (no positive test), skip.
- Articles about THE SHIP location (docking, arrival) without per-passenger case info → [].
- Articles about quarantine measures alone → [].`;

function stableCaseId(eventId, countryCode) {
  const hash = crypto
    .createHash("sha256")
    .update(`${eventId}\n${countryCode}`)
    .digest("hex")
    .slice(0, 10);
  return `case-auto-${countryCode.toLowerCase()}-${hash}`;
}

/**
 * Вытаскивает структурированные cases из текста новости.
 * @param {Object} event { id, title, description, sourceUrl, sourcePublisher, date }
 * @param {string} apiKey ANTHROPIC_API_KEY
 * @returns {Promise<Array>} массив case-candidates в формате /api/internal/ingest или [] если ничего
 */
export async function extractCases(event, apiKey) {
  if (!apiKey) return [];

  const userMessage = [
    `Title: ${event.title}`,
    `Date: ${event.date}`,
    `Publisher: ${event.sourcePublisher ?? "unknown"}`,
    `URL: ${event.sourceUrl ?? ""}`,
    "",
    `Article text:`,
    event.description ?? "",
  ].join("\n");

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    console.error("[extract] fetch error:", err.message);
    return [];
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[extract] HTTP ${res.status}: ${errText.slice(0, 200)}`);
    return [];
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return [];
  }

  const text = body.content?.[0]?.text?.trim() ?? "";
  if (!text) return [];

  // Robust JSON parse — ищем первый [...] блок
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const candidates = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const code = String(item.countryCode ?? "").toUpperCase().slice(0, 2);
    const coords = COUNTRY_COORDS[code];
    if (!coords) {
      console.error(`[extract] skipping unknown country code: ${code}`);
      continue;
    }
    const status = ["confirmed", "suspected", "deceased"].includes(item.status)
      ? item.status
      : "suspected"; // safety fallback
    const caseCount = Number.isFinite(item.caseCount) && item.caseCount > 0
      ? Math.min(100_000, Math.floor(item.caseCount))
      : 1;
    const deaths = Number.isFinite(item.deaths) && item.deaths >= 0
      ? Math.min(caseCount, Math.floor(item.deaths))
      : 0;
    const notes =
      (item.rationale ?? "").toString().slice(0, 280) ||
      `${event.title.slice(0, 150)} — auto-extracted via LLM`;

    candidates.push({
      type: "case",
      outbreakSlug: "hondius-2026",
      payload: {
        id: stableCaseId(event.id, code),
        country: item.country || coords.name,
        countryCode: code,
        coords: [coords.lat, coords.lng],
        caseCount,
        deaths,
        status,
        dateConfirmed: event.date.slice(0, 10),
        notes,
        sourceUrl: event.sourceUrl,
      },
      status: "live",
    });
  }
  return candidates;
}
