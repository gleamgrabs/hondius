/**
 * Server-side LLM normalization для /api/internal/ingest.
 * Conservative: возвращает либо нормализованный {title,description}, либо null
 * (skip — статья не годится), либо undefined (API недоступен — caller использует raw).
 *
 * Зеркало scripts/normalize-event.mjs (один и тот же промпт, та же логика).
 * Дублируем чтобы избежать межязыковых импортов в Next.js standalone.
 */

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

export interface NormalizeInput {
  title: string;
  description: string;
  publisher?: string;
  date?: string;
  sourceUrl?: string;
}

export interface NormalizedOutput {
  title: string;
  description: string;
}

/**
 * @returns
 *   - `{title, description}` — нормализованный текст
 *   - `null` — статья не годится (caller отправит в pending для admin review)
 *   - `undefined` — API ошибка / fallback (caller использует raw как есть)
 */
export async function normalizeEvent(
  raw: NormalizeInput,
  apiKey: string | undefined
): Promise<NormalizedOutput | null | undefined> {
  if (!apiKey) return undefined;

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
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[normalize] fetch error:", err);
    return undefined;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[normalize] HTTP ${res.status}: ${text.slice(0, 200)}`);
    return undefined;
  }

  let body: { content?: Array<{ text?: string }> };
  try {
    body = (await res.json()) as { content?: Array<{ text?: string }> };
  } catch {
    return undefined;
  }

  const text = (body.content?.[0]?.text ?? "").trim();
  if (!text) return undefined;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return undefined;

  let parsed: { title?: unknown; description?: unknown };
  try {
    parsed = JSON.parse(match[0]) as typeof parsed;
  } catch {
    return undefined;
  }

  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string"
  ) {
    return undefined;
  }

  const title = parsed.title.trim();
  const description = parsed.description.trim();

  if (title === "" && description === "") return null;
  if (title === "" || description === "") return undefined;

  return { title, description };
}
