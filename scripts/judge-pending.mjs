#!/usr/bin/env node
/**
 * Прогон существующих pending events через LLM judge (новый промпт фазы 18).
 * Auto-approve / auto-reject / keep-pending согласно confidence threshold.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=… node scripts/judge-pending.mjs --slug=hondius-2026 --dry-run
 *   ANTHROPIC_API_KEY=… node scripts/judge-pending.mjs --slug=hondius-2026 --execute
 *
 * Запускается ВНУТРИ контейнера hondius-tracker:
 *   docker compose exec -T hondius-tracker \
 *     node /app/scripts/judge-pending.mjs --slug=hondius-2026 --execute
 */

import { normalizeEvent } from "./normalize-event.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => {
      const m = a.match(/^--([^=]+)(?:=(.*))?$/);
      return m ? [m[1], m[2] ?? true] : null;
    })
    .filter(Boolean)
);

const SLUG = args.slug ?? "hondius-2026";
const DRY_RUN = !!args["dry-run"];
const EXECUTE = !!args.execute;
const DB_PATH = process.env.DATABASE_PATH ?? "/app/data/subscribers.db";
const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const AUTO_APPROVE = parseFloat(process.env.LLM_AUTO_APPROVE_THRESHOLD ?? "0.7");
const AUTO_REJECT = parseFloat(process.env.LLM_AUTO_REJECT_THRESHOLD ?? "0.7");

if (!DRY_RUN && !EXECUTE) {
  console.error("Specify --dry-run OR --execute");
  process.exit(1);
}
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY required");
  process.exit(1);
}

const { default: Database } = await import("better-sqlite3");
const db = new Database(DB_PATH);

const rows = db
  .prepare(
    `SELECT id, date, title, description, source_publisher, source_url
     FROM live_events
     WHERE outbreak_slug = ? AND status = 'pending'
     ORDER BY date ASC`
  )
  .all(SLUG);

console.log(`▸ ${rows.length} pending events for slug=${SLUG}`);
console.log(`▸ thresholds: auto-approve ≥ ${AUTO_APPROVE}, auto-reject ≥ ${AUTO_REJECT}`);
console.log(`▸ mode: ${DRY_RUN ? "DRY-RUN" : "EXECUTE"}`);
console.log();

const updateStmt = db.prepare(
  `UPDATE live_events
   SET status = ?, title = ?, description = ?, approved_at = ?, approved_by = ?,
       llm_confidence = ?, llm_reason = ?
   WHERE id = ?`
);

let approved = 0;
let rejected = 0;
let kept = 0;
let errored = 0;
let estTokens = 0;

for (const r of rows) {
  console.log(`[${r.id}] ${r.date}`);
  console.log(`  OLD title: ${r.title.slice(0, 110)}`);

  const result = await normalizeEvent(
    {
      title: r.title,
      description: r.description,
      publisher: r.source_publisher,
      date: r.date,
      sourceUrl: r.source_url,
    },
    API_KEY
  );
  estTokens += Math.ceil((r.title.length + r.description.length) / 4) + 400;

  if (result.kind === "error") {
    console.log(`  → LLM error: ${result.error} (kept as pending)`);
    errored++;
  } else if (result.kind === "not-relevant" && result.confidence >= AUTO_REJECT) {
    console.log(
      `  → auto-REJECT (confidence ${result.confidence.toFixed(2)}): ${result.reason}`
    );
    if (EXECUTE) {
      updateStmt.run(
        "rejected",
        r.title,
        r.description,
        Date.now(),
        "auto-llm-judge",
        result.confidence,
        result.reason,
        r.id
      );
    }
    rejected++;
  } else if (result.kind === "relevant" && result.confidence >= AUTO_APPROVE) {
    console.log(
      `  → auto-APPROVE (confidence ${result.confidence.toFixed(2)}): ${result.reason}`
    );
    console.log(`  NEW title: ${result.title}`);
    console.log(`  NEW desc:  ${result.description.slice(0, 150)}${result.description.length > 150 ? "…" : ""}`);
    if (EXECUTE) {
      updateStmt.run(
        "live",
        result.title,
        result.description,
        Date.now(),
        "auto-llm-judge",
        result.confidence,
        result.reason,
        r.id
      );
    }
    approved++;
  } else {
    const c = result.kind === "error" ? "—" : result.confidence.toFixed(2);
    const reason =
      result.kind === "error"
        ? "(no decision)"
        : `(confidence ${c} below threshold)`;
    console.log(`  → KEEP pending ${reason}`);
    if (result.kind !== "error") {
      // Сохраним confidence/reason даже если не меняем status, для audit
      if (EXECUTE) {
        db.prepare(
          "UPDATE live_events SET llm_confidence = ?, llm_reason = ? WHERE id = ?"
        ).run(result.confidence, result.reason, r.id);
      }
    }
    kept++;
  }
  console.log();
  await new Promise((r) => setTimeout(r, 400));
}

console.log("─".repeat(60));
console.log(`Summary:`);
console.log(`  auto-approved:    ${approved}`);
console.log(`  auto-rejected:    ${rejected}`);
console.log(`  kept pending:     ${kept}`);
console.log(`  LLM errors:       ${errored}`);
console.log(`  est. tokens:      ~${estTokens} (≈ $${(estTokens * 0.000003).toFixed(4)})`);
console.log(`  mode:             ${DRY_RUN ? "DRY-RUN — no DB writes" : "EXECUTE — DB updated"}`);
