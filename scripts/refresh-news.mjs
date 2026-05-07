#!/usr/bin/env node
/**
 * Polls WHO Disease Outbreak News RSS for items mentioning hantavirus or
 * MV Hondius. Writes a JSON digest to .github/news-candidates.json which the
 * accompanying GitHub Action turns into a PR for human review.
 *
 * No automatic data mutation — every source change must go through code review.
 *
 * Usage:
 *   node scripts/refresh-news.mjs
 */

import fs from "fs/promises";
import path from "path";

const FEEDS = [
  {
    name: "WHO Disease Outbreak News",
    url: "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
  },
  {
    name: "ECDC Communicable Disease Threats",
    url: "https://www.ecdc.europa.eu/en/taxonomy/term/3083/feed",
  },
];

const KEYWORDS = ["hantavirus", "andes", "hondius", "oceanwide"];

const OUT_PATH = path.resolve(".github/news-candidates.json");

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTags(xml, tag) {
  const items = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let m;
  while ((m = re.exec(xml))) items.push(m[1]);
  return items;
}

function parseRss(xml) {
  const items = extractTags(xml, "item").map((raw) => {
    const get = (tag) => {
      const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(raw);
      if (!m) return "";
      return unescapeXml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
    };
    return {
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description"),
    };
  });
  return items;
}

function relevant(item) {
  const haystack = (item.title + " " + item.description).toLowerCase();
  return KEYWORDS.some((k) => haystack.includes(k));
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": "Outbreak-Tracker-NewsBot/0.1 (+https://github.com)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[${feed.name}] ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRss(xml).filter(relevant);
    return items.map((i) => ({ ...i, source: feed.name }));
  } catch (err) {
    console.error(`[${feed.name}]`, err.message);
    return [];
  }
}

async function main() {
  const all = [];
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    console.log(`▸ ${feed.name}: ${items.length} relevant items`);
    all.push(...items);
  }

  // Deduplicate by link
  const seen = new Set();
  const unique = all.filter((i) => {
    if (seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(
    OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), items: unique }, null, 2)
  );

  console.log(`▸ wrote ${unique.length} items to ${OUT_PATH}`);
  console.log(unique.length > 0 ? "  (PR will be opened by GH Action)" : "  (no PR — no items)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
