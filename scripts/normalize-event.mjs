// LLM-нормализация title+description нового RSS-события в редакционный текст.
// Claude Haiku 4.5 через fetch. Conservative output: либо нормализованный {title,
// description}, либо null если статья не годится для timeline (skip), либо raw
// при ошибке/недоступности API (fallback).
//
// Используется:
//   - в /api/internal/ingest перед INSERT (forward path)
//   - в scripts/normalize-existing.mjs для бэкфилла существующих БД-записей

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an editor for an outbreak tracker website. You receive a news article about a disease outbreak event and produce a concise, factual summary for a structured timeline entry.

Rules:
- Output JSON only: {"title": string, "description": string}
- Title: 8-14 words, factual, no "WATCH:", "BREAKING:", "URGENT:" prefixes, no questions, no clickbait, no exclamation marks
- Description: 2-3 sentences, ~40-80 words, include specific numbers/locations/organisations when present in the source
- Use neutral journalistic tone, present tense for ongoing situations, past tense for completed events
- Preserve technical accuracy: case counts, death counts, lab confirmations, dates, organisation names
- NEVER invent facts not in the source
- NEVER include hyperlinks or markdown
- If the source article does not contain enough concrete factual content to write a useful timeline entry (e.g. it's an opinion piece, a tangentially related background article, or a duplicate of an earlier event) — return {"title": "", "description": ""} and the event will be skipped or sent to admin review`;

const TIMEOUT_MS = 15_000;

/**
 * @param {{ title: string, description: string, publisher?: string, date?: string, sourceUrl?: string }} raw
 * @param {string} apiKey ANTHROPIC_API_KEY
 * @returns {Promise<{title: string, description: string} | null | undefined>}
 *   - `{title, description}` — нормализованный текст для использования
 *   - `null` — статья не годится (skip / send to admin review)
 *   - `undefined` — API недоступен / ошибка / парс fail — caller использует raw как есть
 */
export async function normalizeEvent(raw, apiKey) {
  if (!apiKey) return undefined; // нет ключа → caller использует raw

  const userMessage = [
    `Source title: ${raw.title ?? ""}`,
    `Source description: ${raw.description ?? ""}`,
    `Publisher: ${raw.publisher ?? "unknown"}`,
    `Date: ${raw.date ?? ""}`,
    raw.sourceUrl ? `URL: ${raw.sourceUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[normalize] fetch error:", err.message);
    return undefined;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[normalize] HTTP ${res.status}: ${text.slice(0, 200)}`);
    return undefined;
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return undefined;
  }

  const text = (body.content?.[0]?.text ?? "").trim();
  if (!text) return undefined;

  // Find first {...} block
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return undefined;

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return undefined;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string"
  ) {
    return undefined;
  }

  const title = parsed.title.trim();
  const description = parsed.description.trim();

  // Empty pair → skip signal
  if (title === "" && description === "") return null;
  // Half-empty → invalid (fallback to raw)
  if (title === "" || description === "") return undefined;

  return { title, description };
}

// ─── CLI self-test ──────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not set");
      process.exit(1);
    }
    const result = await normalizeEvent(
      {
        title:
          "WATCH: Passengers evacuated from hantavirus-hit cruise ship in Tenerife",
        description:
          "Passengers from the hantavirus-hit cruise ship MV Hondius were evacuated on Sunday after the vessel docked at Granadilla Port in Tenerife. The first flight took off in the afternoon carrying Spanish nationals home.",
        publisher: "Euronews",
        date: "2026-05-10",
        sourceUrl: "https://www.euronews.com/...",
      },
      apiKey
    );
    console.log("self-test result:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(result === undefined ? 1 : 0);
  }
  console.log("Usage: ANTHROPIC_API_KEY=… node scripts/normalize-event.mjs --self-test");
}
