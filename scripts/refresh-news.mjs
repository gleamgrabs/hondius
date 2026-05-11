#!/usr/bin/env node
/**
 * Опрашивает whitelisted RSS-фиды, фильтрует по Hondius-привязке,
 * классифицирует severity, проставляет publish_status (live/pending) по
 * authority score источника, и шлёт POST на /api/internal/ingest.
 *
 * Usage:
 *   node scripts/refresh-news.mjs --dry-run   # печатает план, не INSERT
 *   INGEST_TOKEN=xxx SITE_URL=https://hondius-watch.com \
 *     node scripts/refresh-news.mjs --ingest  # реально отправляет на сервер
 */

import crypto from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { extractCases } from "./extract-cases.mjs";

const SLUG = "hondius-2026";

const FEEDS = [
  {
    // WHO retired the dedicated DON RSS in 2023. The general news feed
    // includes DON items — Hondius keyword filter will keep only relevant ones.
    name: "WHO News (English)",
    url: "https://www.who.int/rss-feeds/news-english.xml",
    publisher: "World Health Organization",
    authority: "high",
  },
  {
    name: "ECDC Communicable Disease Threats",
    url: "https://www.ecdc.europa.eu/en/taxonomy/term/3083/feed",
    publisher: "European Centre for Disease Prevention and Control",
    authority: "high",
  },
  {
    // Reuters retired public RSS in 2020. To re-enable: subscribe to Reuters
    // Connect or another paid feed, drop disabled flag, replace url.
    name: "Reuters Health",
    url: "https://www.reutersagency.com/feed/?best-topics=health&post_type=best",
    publisher: "Reuters",
    authority: "medium",
    disabled: true,
    disabledReason: "No public RSS as of 2024+; requires paid Reuters Connect feed",
  },
  {
    // AP closed their public RSS feeds. Available only through licensed partner programs.
    name: "AP World",
    url: "https://feeds.apnews.com/rss/apf-topnews",
    publisher: "AP News",
    authority: "medium",
    disabled: true,
    disabledReason: "No public RSS; requires AP partner license",
  },
  {
    name: "Euronews",
    url: "https://www.euronews.com/rss?level=theme&name=news",
    publisher: "Euronews",
    authority: "low",
  },
];

// Минимум одно совпадение этих ключей в title+description, иначе отбрасывем.
// "hantavirus" сам по себе НЕ пропускаем — много шума про Аргентину/Чили/США.
const HONDIUS_KEYWORDS = [
  "mv hondius",
  "hondius",
  "oceanwide expeditions",
  "oceanwide cruise",
];

// severity routing
const CRITICAL_KW = [
  "death",
  "died",
  "fatal",
  "fatality",
  "denied entry",
  "confirmed outbreak",
  "evacuat",
];
const WARNING_KW = ["case", "confirmed", "suspected", "quarantine", "isolation"];

// ─── argv ────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const INGEST_MODE = args.has("--ingest");

const SITE_URL = process.env.SITE_URL ?? "https://hondius-watch.com";
const INGEST_TOKEN = process.env.INGEST_TOKEN ?? "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
// Safety switch для первого боевого прогона: всё пишется со status='pending',
// игнорируя authority. Оператор ревьюит в /admin перед публикацией.
const FORCE_PENDING = process.env.INGEST_FORCE_PENDING === "1";

if (INGEST_MODE && !INGEST_TOKEN) {
  console.error("INGEST_TOKEN env required for --ingest mode");
  process.exit(1);
}
if (!DRY_RUN && !INGEST_MODE) {
  console.error("Specify --dry-run OR --ingest");
  process.exit(1);
}

if (FORCE_PENDING) {
  console.log("⚠ INGEST_FORCE_PENDING=1 — все items получат status='pending' независимо от authority\n");
}

// ─── XML helpers (no deps) ───────────────────────────────────────────
function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
function stripCdata(s) {
  return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}
function extractTags(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function getOne(raw, tag) {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(raw);
  if (!m) return "";
  return unescapeXml(stripCdata(m[1]));
}
function stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRss(xml) {
  // RSS 2.0 <item> или Atom <entry>
  const isAtom = xml.includes("<feed");
  const tag = isAtom ? "entry" : "item";
  return extractTags(xml, tag).map((raw) => {
    const title = stripHtml(getOne(raw, "title"));
    const link = isAtom
      ? (raw.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "")
      : getOne(raw, "link");
    const description = stripHtml(
      getOne(raw, "description") ||
        getOne(raw, "summary") ||
        getOne(raw, "content")
    );
    const pubDate =
      getOne(raw, "pubDate") || getOne(raw, "published") || getOne(raw, "updated");
    return { title, link, description, pubDate };
  });
}

// ─── routing logic ───────────────────────────────────────────────────
function isHondiusRelevant(text) {
  const lower = text.toLowerCase();
  return HONDIUS_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifySeverity(text) {
  const lower = text.toLowerCase();
  if (CRITICAL_KW.some((kw) => lower.includes(kw))) return "critical";
  if (WARNING_KW.some((kw) => lower.includes(kw))) return "warning";
  return "info";
}

function countMatches(text, kwList) {
  const lower = text.toLowerCase();
  return kwList.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
}

function publishStatusForFeed(feed, text) {
  // Safety override — все items в pending, оператор разбирает.
  if (FORCE_PENDING) return "pending";

  // high authority → live сразу
  if (feed.authority === "high") return "live";
  // medium: live только если ≥2 keyword из Hondius-привязки совпало
  if (feed.authority === "medium") {
    return countMatches(text, HONDIUS_KEYWORDS) >= 2 ? "live" : "pending";
  }
  // low: всегда pending
  return "pending";
}

function stableId(url, title) {
  const hash = crypto
    .createHash("sha256")
    .update(`${url}\n${title}`)
    .digest("hex")
    .slice(0, 16);
  return `auto-${hash}`;
}

function isoDate(pubDate) {
  if (!pubDate) return new Date().toISOString().slice(0, 10);
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// ─── fetching ────────────────────────────────────────────────────────
async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "user-agent":
          "Hondius-Watch-NewsBot/1.0 (+https://hondius-watch.com; contact: updates@hondius-watch.com)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[${feed.name}] HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRss(xml).filter((i) => {
      const text = `${i.title}\n${i.description}`;
      return isHondiusRelevant(text);
    });
    return items.map((i) => ({ ...i, feed }));
  } catch (err) {
    console.error(`[${feed.name}] error:`, err.message);
    return [];
  }
}

// ─── main ────────────────────────────────────────────────────────────
async function main() {
  const all = [];
  for (const feed of FEEDS) {
    if (feed.disabled) {
      console.log(
        `▸ ${feed.name} [${feed.authority}]: DISABLED (${feed.disabledReason ?? "no reason"})`
      );
      continue;
    }
    const items = await fetchFeed(feed);
    console.log(
      `▸ ${feed.name} [${feed.authority}]: ${items.length} Hondius-relevant items`
    );
    all.push(...items);
    await delay(500); // быть вежливым к источникам
  }

  // Дедупликация по link
  const seen = new Set();
  const unique = all.filter((i) => {
    if (!i.link || seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });

  if (unique.length === 0) {
    console.log("▸ No new candidates.");
    process.exit(0);
  }

  const candidates = unique.map((it) => {
    const text = `${it.title}\n${it.description}`;
    const id = stableId(it.link, it.title);
    const severity = classifySeverity(text);
    const status = publishStatusForFeed(it.feed, text);

    const desc =
      it.description.length > 800
        ? it.description.slice(0, 800).replace(/\s\S*$/, "") + "…"
        : it.description;

    return {
      type: "event",
      outbreakSlug: SLUG,
      payload: {
        id,
        date: isoDate(it.pubDate),
        title: it.title.slice(0, 500),
        description: desc || it.title,
        severity,
        sources: [it.link],
      },
      sourceUrl: it.link,
      sourcePublisher: it.feed.publisher,
      rawPayload: {
        feed: it.feed.name,
        pubDate: it.pubDate ?? null,
      },
      status,
    };
  });

  console.log(`\n▸ ${candidates.length} candidate(s):`);
  for (const c of candidates) {
    console.log(
      `   [${c.status.toUpperCase()}] ${c.payload.severity.padEnd(8)} ${c.sourcePublisher.padEnd(40)} ${c.payload.title.slice(0, 80)}`
    );
  }

  if (DRY_RUN) {
    console.log("\n▸ Dry run — not sending to ingest.");
    process.exit(0);
  }

  // INGEST mode — POST events to /api/internal/ingest
  const url = `${SITE_URL}/api/internal/ingest`;
  console.log(`\n▸ POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify({ candidates }),
  });
  const text = await res.text();
  console.log(`  status: ${res.status}`);
  console.log(`  body:   ${text}`);
  if (!res.ok) process.exit(1);

  let ingestResult;
  try { ingestResult = JSON.parse(text); } catch { ingestResult = { inserted: [] }; }
  const newlyInsertedIds = new Set(
    (ingestResult.inserted ?? []).filter((x) => x.type === "event").map((x) => x.id)
  );

  // ─── LLM case extraction для всех newly-inserted events ─────────────
  // Дубликаты (skipped) уже обрабатывались — пропускаем чтобы не дублить.
  if (ANTHROPIC_API_KEY && newlyInsertedIds.size > 0) {
    console.log(`\n▸ LLM extraction: ${newlyInsertedIds.size} new event(s) → Claude Haiku`);
    const caseCandidates = [];
    for (const c of candidates) {
      if (!newlyInsertedIds.has(c.payload.id)) continue;
      // Only run extraction on warning/critical (info events usually background)
      if (c.payload.severity === "info") {
        console.log(`   skip [info] ${c.payload.title.slice(0, 60)}`);
        continue;
      }
      const extracted = await extractCases(
        {
          id: c.payload.id,
          title: c.payload.title,
          description: c.payload.description,
          sourceUrl: c.sourceUrl,
          sourcePublisher: c.sourcePublisher,
          date: c.payload.date,
        },
        ANTHROPIC_API_KEY
      );
      if (extracted.length > 0) {
        console.log(`   ✓ ${c.payload.title.slice(0, 60)} → ${extracted.length} case(s)`);
        for (const e of extracted) {
          console.log(`      [${e.payload.status}] ${e.payload.country} ×${e.payload.caseCount}`);
          caseCandidates.push(e);
        }
      } else {
        console.log(`   — ${c.payload.title.slice(0, 60)} → no cases`);
      }
      await delay(400); // быть вежливыми к Anthropic API
    }

    if (caseCandidates.length > 0) {
      console.log(`\n▸ POST ${caseCandidates.length} extracted case(s) to /api/internal/ingest`);
      const caseRes = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({ candidates: caseCandidates }),
      });
      console.log(`  status: ${caseRes.status}`);
      console.log(`  body:   ${await caseRes.text()}`);
    } else {
      console.log("▸ LLM found no extractable cases in this batch");
    }
  } else if (!ANTHROPIC_API_KEY) {
    console.log("\n▸ ANTHROPIC_API_KEY not set — skipping LLM case extraction");
  }

  // After ingest — try to trigger debounced broadcast
  const triggerUrl = `${SITE_URL}/api/broadcast/maybe-trigger`;
  console.log(`\n▸ POST ${triggerUrl}`);
  const triggerRes = await fetch(triggerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify({ outbreakSlug: SLUG }),
  });
  console.log(`  status: ${triggerRes.status}`);
  console.log(`  body:   ${await triggerRes.text()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
