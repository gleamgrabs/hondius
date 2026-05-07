#!/usr/bin/env node
/**
 * Trigger an outbreak update broadcast to confirmed subscribers.
 *
 * Usage:
 *   BROADCAST_ADMIN_TOKEN=xxx SITE_URL=https://hondius-watch.com \
 *     node scripts/broadcast.mjs hondius-2026 [--dry-run] [--events evt-10,evt-09]
 *
 * Run on the Hetzner host (or any machine that can reach the site).
 */

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/broadcast.mjs <outbreak-slug> [--dry-run] [--events id1,id2]");
  process.exit(1);
}

const slug = args[0];
const dryRun = args.includes("--dry-run");
const eventsIdx = args.indexOf("--events");
const eventIds =
  eventsIdx >= 0 && args[eventsIdx + 1]
    ? args[eventsIdx + 1].split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

const siteUrl = process.env.SITE_URL ?? "https://hondius-watch.com";
const token = process.env.BROADCAST_ADMIN_TOKEN;

if (!token) {
  console.error("BROADCAST_ADMIN_TOKEN not set in env");
  process.exit(1);
}

const url = `${siteUrl}/api/broadcast`;
const body = { outbreakSlug: slug, eventIds, dryRun };

console.log(`▸ POST ${url}`);
console.log(`  payload:`, JSON.stringify(body));

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`  status: ${res.status}`);
console.log(`  body:   ${text}`);
process.exit(res.ok ? 0 : 1);
