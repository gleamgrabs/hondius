/**
 * LLM editor + relevance classifier для /api/internal/ingest.
 *
 * Расширен по сравнению с предыдущей версией: теперь возвращает
 *   { isRelevant, confidence, reason, title?, description? }
 *
 * - isRelevant=true + confidence ≥ AUTO_APPROVE_THRESHOLD → ingest auto-approves в live
 * - isRelevant=false + confidence ≥ AUTO_REJECT_THRESHOLD → ingest auto-rejects (не сохраняем)
 * - граничные случаи → в pending для admin review
 * - error → fallback: caller использует raw без изменений
 *
 * Зеркало scripts/normalize-event.mjs (один промпт, одна логика).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an editor and topic classifier for an outbreak tracker website focused on the MV Hondius hantavirus outbreak (April-May 2026, cruise ship from Ushuaia to Tenerife, operated by Oceanwide Expeditions).

You receive a news article and produce a JSON object:

{
  "is_relevant": boolean,
  "confidence": number (0.0 - 1.0),
  "reason": string (1 sentence, why relevant/not),
  "title": string (only if is_relevant=true; 8-14 words, factual, no clickbait, no "WATCH:"/"BREAKING:"/"URGENT:" prefixes),
  "description": string (only if is_relevant=true; 2-3 sentences, ~40-80 words, factual, with concrete numbers/locations/organisations from source)
}

RELEVANCE CRITERIA (set is_relevant=true if ANY apply):
- Mentions MV Hondius or Oceanwide Expeditions by name
- About hantavirus cases linked to a cruise ship in Atlantic/Tenerife/Saint Helena/Cape Verde/Canary Islands (mid-2026 timeframe)
- About passengers from MV Hondius being repatriated/quarantined in any country
- About contact tracing from MV Hondius outbreak
- About WHO/CDC/ECDC response to the cruise ship outbreak specifically
- About Andes virus cases in passengers from this outbreak

SET is_relevant=false (NOT relevant) if:
- General hantavirus background article without cruise ship context
- Hantavirus cases in Argentina/Chile/US Four Corners not linked to MV Hondius
- Other unrelated outbreaks (other diseases, other ships)
- Pure opinion/editorial without factual content about the outbreak

CONFIDENCE LEVELS:
- 0.9-1.0: explicit mention of MV Hondius or "this cruise ship" outbreak
- 0.7-0.89: clear context (Tenerife + cruise + hantavirus, or evacuation + passengers + hantavirus)
- 0.5-0.69: probable but ambiguous (could be this outbreak, could be tangential)
- 0.3-0.49: weak signal, mostly background
- 0.0-0.29: clearly not about this outbreak

RULES:
- Output JSON only, no preamble
- If is_relevant=false, set title="" and description=""
- Use neutral journalistic tone in title/description
- NEVER invent facts not in the source
- Preserve dates, numbers, organisation names exactly as in source`;

const TIMEOUT_MS = 20_000;

export interface NormalizeInput {
  title: string;
  description: string;
  publisher?: string;
  date?: string;
  sourceUrl?: string;
}

export type NormalizeResult =
  | {
      kind: "relevant";
      isRelevant: true;
      confidence: number;
      reason: string;
      title: string;
      description: string;
    }
  | {
      kind: "not-relevant";
      isRelevant: false;
      confidence: number;
      reason: string;
    }
  | { kind: "error"; error: string };

export async function normalizeEvent(
  raw: NormalizeInput,
  apiKey: string | undefined
): Promise<NormalizeResult> {
  if (!apiKey) return { kind: "error", error: "no API key" };

  const userMessage = [
    `Source title: ${raw.title}`,
    `Source description: ${raw.description}`,
    `Publisher: ${raw.publisher ?? "unknown"}`,
    `Date: ${raw.date ?? ""}`,
    raw.sourceUrl ? `URL: ${raw.sourceUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let res: Response;
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
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[normalize] fetch error:", err);
    return { kind: "error", error: String(err) };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[normalize] HTTP ${res.status}: ${text.slice(0, 200)}`);
    return { kind: "error", error: `HTTP ${res.status}` };
  }

  let body: { content?: Array<{ text?: string }> };
  try {
    body = (await res.json()) as { content?: Array<{ text?: string }> };
  } catch {
    return { kind: "error", error: "response JSON parse failed" };
  }

  const text = (body.content?.[0]?.text ?? "").trim();
  if (!text) return { kind: "error", error: "empty LLM response" };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { kind: "error", error: "no JSON in response" };

  let parsed: {
    is_relevant?: unknown;
    confidence?: unknown;
    reason?: unknown;
    title?: unknown;
    description?: unknown;
  };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { kind: "error", error: "JSON.parse failed" };
  }

  const isRelevant =
    typeof parsed.is_relevant === "boolean" ? parsed.is_relevant : null;
  const confidenceRaw =
    typeof parsed.confidence === "number" ? parsed.confidence : null;
  const reason =
    typeof parsed.reason === "string" ? parsed.reason.slice(0, 300) : "";

  if (isRelevant === null || confidenceRaw === null) {
    return { kind: "error", error: "missing is_relevant or confidence" };
  }

  const confidence = Math.max(0, Math.min(1, confidenceRaw));

  if (isRelevant) {
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const description =
      typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (!title || !description) {
      // LLM сказал relevant но не дал текст — это inconsistency, считаем error
      return { kind: "error", error: "relevant=true but empty title/description" };
    }
    return {
      kind: "relevant",
      isRelevant: true,
      confidence,
      reason,
      title,
      description,
    };
  }

  return {
    kind: "not-relevant",
    isRelevant: false,
    confidence,
    reason,
  };
}
