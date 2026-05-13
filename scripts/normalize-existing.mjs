#!/usr/bin/env node
/**
 * Бэкфилл LLM-нормализации для существующих live_events в БД.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=… node scripts/normalize-existing.mjs --slug=hondius-2026 --dry-run
 *   ANTHROPIC_API_KEY=… node scripts/normalize-existing.mjs --slug=hondius-2026 --execute
 *
 * Запускается ВНУТРИ контейнера hondius-tracker (имеет доступ к better-sqlite3 и /app/data/subscribers.db):
 *   docker compose exec -T -e ANTHROPIC_API_KEY=… hondius-tracker \
 *     node /app/scripts/normalize-existing.mjs --slug=hondius-2026 --execute
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
     WHERE outbreak_slug = ? AND status = 'live'
     ORDER BY date ASC`
  )
  .all(SLUG);

console.log(`▸ ${rows.length} live events for slug=${SLUG}`);
console.log(`▸ mode: ${DRY_RUN ? "DRY-RUN" : "EXECUTE (UPDATE)"}`);
console.log();

const stmt = db.prepare(
  `UPDATE live_events SET title = ?, description = ? WHERE id = ?`
);

let normalized = 0;
let unchanged = 0;
let skipped = 0;
let fellBack = 0;
let estTokens = 0;

for (const r of rows) {
  console.log(`[${r.id}] ${r.date}`);
  console.log(`  OLD title: ${r.title.slice(0, 120)}`);
  console.log(`  OLD desc:  ${r.description.slice(0, 150)}${r.description.length > 150 ? "…" : ""}`);

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
    console.log(`  → API/fallback: ${result.error} (left unchanged)`);
    fellBack++;
  } else if (result.kind === "not-relevant") {
    console.log(
      `  → LLM marked NOT relevant (confidence ${result.confidence.toFixed(2)}): ${result.reason}`
    );
    console.log("    (skip; backfill leaves status unchanged — use judge-pending for that)");
    skipped++;
  } else if (
    result.title === r.title &&
    result.description === r.description
  ) {
    console.log("  → already canonical (no change)");
    unchanged++;
  } else {
    console.log(`  NEW title: ${result.title}`);
    console.log(`  NEW desc:  ${result.description}`);
    if (EXECUTE) {
      stmt.run(result.title, result.description, r.id);
      console.log("  ✓ UPDATED in DB");
    }
    normalized++;
  }
  console.log();
  // Маленькая задержка чтобы не лупить Anthropic API
  await new Promise((r) => setTimeout(r, 400));
}

console.log("─".repeat(60));
console.log(`Summary:`);
console.log(`  normalized:        ${normalized}`);
console.log(`  unchanged:         ${unchanged}`);
console.log(`  fell-back (raw):   ${fellBack}`);
console.log(`  marked-not-useful: ${skipped}`);
console.log(`  est. tokens used:  ~${estTokens} (≈ $${(estTokens * 0.000003).toFixed(4)})`);
console.log(`  mode:              ${DRY_RUN ? "DRY-RUN — no DB writes" : "EXECUTE — DB updated"}`);
