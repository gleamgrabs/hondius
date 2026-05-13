import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getDb,
  insertLiveEvent,
  insertLiveCase,
  insertLiveSource,
  liveEventExists,
  getLiveEventsByDate,
  appendSourceToEvent,
} from "@/lib/db";
import { getAllOutbreakSlugs } from "@/lib/outbreaks";
import { normalizeEvent } from "@/lib/normalize-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Семантический dedup threshold — token-overlap ratio выше которого два события
// считаются «одной и той же новостью» из разных источников.
// Стартовое 0.5: половина значимых слов совпадает. Override через env.
const DEDUP_OVERLAP_THRESHOLD = (() => {
  const v = parseFloat(process.env.DEDUP_OVERLAP_THRESHOLD ?? "0.5");
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.5;
})();

const STOPWORDS = new Set([
  "after","again","also","amid","arrive","arrives","arrival","arrived",
  "before","being","both","cruise","docks","docked","docking","during",
  "from","have","into","just","more","most","much","over","said","says",
  "ship","ships","since","some","such","than","that","their","them","then",
  "there","these","they","this","those","through","under","until","very","ware",
  "watch","week","were","what","when","where","which","while","will","with",
  "would","your","about","above","after","again","against","alone","along",
  "among","another","because","before","below","could","every","first","further",
  "general","government","group","groups","health","including","just","later","like","made",
  "make","many","might","minister","ministry","much","much","national",
  "official","officials","other","others","passenger","passengers","people","person",
  "report","reported","reports","said","says","several","since","spain","spanish",
  "still","such","take","taken","takes","taking","tell","told","total",
  "today","tonight","tuesday","wednesday","thursday","friday","saturday","sunday","monday",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.min(a.size, b.size);
}

const SeverityEnum = z.enum(["info", "warning", "critical"]);
const PublishStatusEnum = z.enum(["live", "pending", "rejected"]);
const CaseStatusEnum = z.enum(["confirmed", "suspected", "evacuated", "deceased"]);

const EventCandidateSchema = z.object({
  type: z.literal("event"),
  outbreakSlug: z.string().min(1),
  payload: z.object({
    id: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(5000),
    severity: SeverityEnum,
    sources: z.array(z.string().url()).min(1).max(10),
  }),
  sourceUrl: z.string().url(),
  sourcePublisher: z.string().min(1).max(200),
  rawPayload: z.unknown().optional(),
  status: PublishStatusEnum.default("live"),
});

const CaseCandidateSchema = z.object({
  type: z.literal("case"),
  outbreakSlug: z.string().min(1),
  payload: z.object({
    id: z.string().min(1).max(200),
    country: z.string().min(1).max(200),
    countryCode: z.string().length(2),
    coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
    caseCount: z.number().int().min(0).max(100_000),
    deaths: z.number().int().min(0).max(100_000).default(0),
    status: CaseStatusEnum,
    dateConfirmed: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    notes: z.string().max(5000).optional(),
    sourceUrl: z.string().url().optional(),
  }),
  status: PublishStatusEnum.default("live"),
});

const SourceCandidateSchema = z.object({
  type: z.literal("source"),
  outbreakSlug: z.string().min(1),
  payload: z.object({
    id: z.string().min(1).max(200),
    title: z.string().min(1).max(500),
    publisher: z.string().min(1).max(200),
    url: z.string().url(),
    accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  }),
});

const CandidateSchema = z.discriminatedUnion("type", [
  EventCandidateSchema,
  CaseCandidateSchema,
  SourceCandidateSchema,
]);

const RequestSchema = z.object({
  candidates: z.array(CandidateSchema).min(1).max(50),
});

export async function POST(req: Request) {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "INGEST_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Force DB init.
  getDb();

  const validSlugs = new Set(getAllOutbreakSlugs());
  const inserted: Array<{ type: string; id: string; status?: string }> = [];
  const skipped: Array<{ type: string; id: string; reason: string }> = [];
  const merged: Array<{ id: string; mergedInto: string; overlap: number }> = [];
  const errors: Array<{ index: number; error: string }> = [];
  const slugsTouched = new Set<string>();

  const normalized: Array<{ id: string }> = [];
  const autoApproved: Array<{ id: string; confidence: number; reason: string }> = [];
  const autoRejected: Array<{ title: string; confidence: number; reason: string }> = [];
  const pendingForReview: Array<{ id: string; confidence: number; reason: string }> = [];
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const AUTO_APPROVE = parseFloat(
    process.env.LLM_AUTO_APPROVE_THRESHOLD ?? "0.7"
  );
  const AUTO_REJECT = parseFloat(
    process.env.LLM_AUTO_REJECT_THRESHOLD ?? "0.7"
  );

  for (let idx = 0; idx < parsed.data.candidates.length; idx++) {
    const cand = parsed.data.candidates[idx];

    if (!validSlugs.has(cand.outbreakSlug)) {
      errors.push({
        index: idx,
        error: `Unknown outbreak slug: ${cand.outbreakSlug}`,
      });
      continue;
    }

    try {
      if (cand.type === "event") {
        // Уровень 1: точный дубликат по id (стабильный hash от url+title)
        if (liveEventExists(cand.payload.id)) {
          skipped.push({
            type: "event",
            id: cand.payload.id,
            reason: "duplicate (exact id)",
          });
          continue;
        }

        // Уровень 2: семантический дубликат — та же дата, ≥threshold token overlap.
        // Используем raw title/description для матчинга (до нормализации) —
        // так дедупликация работает и тогда когда LLM не подключён.
        if (cand.status === "live") {
          const candTokens = tokenize(
            `${cand.payload.title} ${cand.payload.description}`
          );
          const existingSameDate = getLiveEventsByDate(
            cand.outbreakSlug,
            cand.payload.date
          );
          let bestMatch: { id: string; ratio: number } | null = null;
          for (const e of existingSameDate) {
            const existingTokens = tokenize(`${e.title} ${e.description}`);
            const r = overlap(candTokens, existingTokens);
            if (r >= DEDUP_OVERLAP_THRESHOLD && (!bestMatch || r > bestMatch.ratio)) {
              bestMatch = { id: e.id, ratio: r };
            }
          }
          if (bestMatch) {
            appendSourceToEvent(
              bestMatch.id,
              cand.sourceUrl,
              cand.sourcePublisher
            );
            merged.push({
              id: cand.payload.id,
              mergedInto: bestMatch.id,
              overlap: Number(bestMatch.ratio.toFixed(2)),
            });
            slugsTouched.add(cand.outbreakSlug);
            continue;
          }
        }

        // ─── LLM judgement: relevance + normalization ──────────────────
        // High-authority sources (WHO/ECDC) пропускают LLM judgement —
        // безусловно trusted, candidate.status уже "live".
        // Для остальных — LLM решает auto-approve / auto-reject / pending.
        let finalTitle = cand.payload.title;
        let finalDescription = cand.payload.description;
        let finalStatus: "live" | "pending" | "rejected" = cand.status;
        let approvedBy: string = finalStatus === "live" ? "auto" : "";
        let llmConfidence: number | null = null;
        let llmReason: string | null = null;

        const isHighAuthority =
          cand.sourcePublisher === "World Health Organization" ||
          cand.sourcePublisher ===
            "European Centre for Disease Prevention and Control";

        if (anthropicKey && !isHighAuthority) {
          const llm = await normalizeEvent(
            {
              title: cand.payload.title,
              description: cand.payload.description,
              publisher: cand.sourcePublisher,
              date: cand.payload.date,
              sourceUrl: cand.sourceUrl,
            },
            anthropicKey
          );

          if (llm.kind === "error") {
            // LLM down — fallback на изначальный candidate.status
            // (PRIMARY/SECONDARY rules в refresh-news.mjs уже отработали).
          } else if (llm.kind === "not-relevant" && llm.confidence >= AUTO_REJECT) {
            // Уверенный «не релевантно» — auto-reject, событие НЕ сохраняем.
            autoRejected.push({
              title: cand.payload.title.slice(0, 100),
              confidence: llm.confidence,
              reason: llm.reason,
            });
            continue;
          } else if (llm.kind === "not-relevant") {
            // Низкая уверенность что не релевантно — в pending.
            finalStatus = "pending";
            approvedBy = "";
            llmConfidence = llm.confidence;
            llmReason = llm.reason;
            pendingForReview.push({
              id: cand.payload.id,
              confidence: llm.confidence,
              reason: llm.reason,
            });
          } else if (llm.kind === "relevant" && llm.confidence >= AUTO_APPROVE) {
            // Уверенный «релевантно» — auto-approve в live + normalize text.
            finalTitle = llm.title;
            finalDescription = llm.description;
            finalStatus = "live";
            approvedBy = "auto-llm";
            llmConfidence = llm.confidence;
            llmReason = llm.reason;
            autoApproved.push({
              id: cand.payload.id,
              confidence: llm.confidence,
              reason: llm.reason,
            });
            normalized.push({ id: cand.payload.id });
          } else if (llm.kind === "relevant") {
            // Граничный (relevant но < AUTO_APPROVE) — в pending с нормализованным текстом.
            finalTitle = llm.title;
            finalDescription = llm.description;
            finalStatus = "pending";
            approvedBy = "";
            llmConfidence = llm.confidence;
            llmReason = llm.reason;
            pendingForReview.push({
              id: cand.payload.id,
              confidence: llm.confidence,
              reason: llm.reason,
            });
            normalized.push({ id: cand.payload.id });
          }
        }

        // Уникальный → INSERT
        insertLiveEvent({
          id: cand.payload.id,
          outbreak_slug: cand.outbreakSlug,
          date: cand.payload.date,
          title: finalTitle,
          description: finalDescription,
          severity: cand.payload.severity,
          source_ids: JSON.stringify(cand.payload.sources),
          status: finalStatus,
          source_url: cand.sourceUrl,
          source_publisher: cand.sourcePublisher,
          raw_payload: JSON.stringify(cand.rawPayload ?? null),
          approved_at: finalStatus === "live" ? Date.now() : null,
          approved_by: approvedBy || null,
          llm_confidence: llmConfidence,
          llm_reason: llmReason,
        });
        inserted.push({
          type: "event",
          id: cand.payload.id,
          status: finalStatus,
        });
        slugsTouched.add(cand.outbreakSlug);
      } else if (cand.type === "case") {
        insertLiveCase({
          id: cand.payload.id,
          outbreak_slug: cand.outbreakSlug,
          country: cand.payload.country,
          country_code: cand.payload.countryCode.toUpperCase(),
          lat: cand.payload.coords[0],
          lng: cand.payload.coords[1],
          case_count: cand.payload.caseCount,
          deaths: cand.payload.deaths,
          status: cand.payload.status,
          date_confirmed: cand.payload.dateConfirmed,
          notes: cand.payload.notes ?? null,
          source_url: cand.payload.sourceUrl ?? null,
          publish_status: cand.status,
        });
        inserted.push({
          type: "case",
          id: cand.payload.id,
          status: cand.status,
        });
        slugsTouched.add(cand.outbreakSlug);
      } else if (cand.type === "source") {
        insertLiveSource({
          id: cand.payload.id,
          outbreak_slug: cand.outbreakSlug,
          title: cand.payload.title,
          publisher: cand.payload.publisher,
          url: cand.payload.url,
          accessed: cand.payload.accessed,
          published_date: cand.payload.publishedDate ?? null,
        });
        inserted.push({ type: "source", id: cand.payload.id });
        slugsTouched.add(cand.outbreakSlug);
      }
    } catch (e) {
      errors.push({ index: idx, error: String(e) });
    }
  }

  // Триггерим ISR-revalidate всех страниц затронутой вспышки.
  for (const slug of slugsTouched) {
    try {
      revalidatePath(`/outbreak/${slug}`);
      revalidatePath(`/outbreak/${slug}/timeline`);
      revalidatePath(`/outbreak/${slug}/cases`);
      revalidatePath("/");
    } catch (e) {
      // revalidate может бросить в build-time — игнорим
      console.warn("[ingest] revalidatePath failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    merged,
    skipped_duplicates: skipped,
    errors,
    normalized,
    auto_approved: autoApproved,
    auto_rejected: autoRejected,
    pending_for_review: pendingForReview,
    dedupThreshold: DEDUP_OVERLAP_THRESHOLD,
    llmAutoApprove: AUTO_APPROVE,
    llmAutoReject: AUTO_REJECT,
    llmNormalization: anthropicKey ? "enabled" : "disabled",
  });
}
