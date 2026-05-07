# Hondius Watch

🟢 **Live:** https://hondius-watch.com

Independent tracker for infectious disease outbreaks. Current: hantavirus aboard MV Hondius (May 2026). Built with Next.js 14, TypeScript, Tailwind, Leaflet, D3, SQLite, Resend, and Cloudflare Tunnel.

---

## How updates work now

Two paths into the system. **TS files** = baseline (historical, frozen at deploy). **SQLite live overlay** = anything added after deploy.

```
                  ┌─────────────────── seeds ────────────────────┐
                  │  data/outbreaks/hondius-2026/*.ts (baseline) │
                  └──────────────┬───────────────────────────────┘
                                 ↓
   GH Action (every 2h)          ↓ merge
   refresh-news.mjs ───POST───→  /api/internal/ingest
       ↓                                ↓ writes into
   RSS WHO/ECDC                   SQLite live_events / live_cases
   Reuters/AP/Euronews                  ↓
                                 lib/live-data.mergeLiveData()
                                        ↓
                          getOutbreakBySlug() returns merged data
                                        ↓ ISR revalidate=60
                                 Pages on hondius-watch.com
                                        ↓ client-side polling 60s
                                 Map markers (live cases)
                                        ↓ debounced 6h
                            /api/broadcast/maybe-trigger
                                        ↓
                        digest email to subscribers (Resend)
```

### Authority routing (in `scripts/refresh-news.mjs`)

| Source authority | Status when matched |
|---|---|
| WHO, ECDC | `live` immediately |
| Reuters, AP | `live` if ≥2 Hondius keywords match, else `pending` |
| Euronews and other | always `pending` (admin review) |

A match requires `mv hondius` / `hondius` / `oceanwide expeditions` / `oceanwide cruise` in title+description. Plain `hantavirus` alone is rejected — too noisy (regular Argentina/Chile/USA reports).

### Severity classification

- `critical` — keywords: death, died, fatal, denied entry, confirmed outbreak, evacuat
- `warning` — keywords: case, confirmed, suspected, quarantine, isolation
- `info` — anything else relevant

### Broadcast debounce

Email digest goes out **at most once per 6 hours**. Multiple events in that window collapse into one digest. Forced send via `/admin?token=…`.

---

## Local development

```bash
git clone https://github.com/gleamgrabs/hondius.git
cd hondius
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). DB and emails won't work locally without `.env`.

---

## Manual data updates (still supported, takes precedence over auto)

For events/cases that you want frozen in baseline (audited, permanent), edit the TS files. For ephemeral / wire-fed updates, let the parser handle it — they go into SQLite, can be approved/rejected via `/admin?token=…`.

### Edit baseline timeline event
`data/outbreaks/hondius-2026/events.ts`
```ts
{
  id: "evt-11",
  date: "2026-05-09",
  title: "MV Hondius arrives at Tenerife",
  description: "The vessel docked at Santa Cruz de Tenerife.",
  severity: "info",
  sources: ["https://reuters.com/..."],
}
```

### Edit baseline case
`data/outbreaks/hondius-2026/cases.ts`
```ts
{
  id: "case-it-01",
  country: "Italy",
  countryCode: "IT",
  coords: [41.9, 12.5],   // [lat, lng]
  caseCount: 1,
  deaths: 0,
  status: "confirmed",
  dateConfirmed: "2026-05-10",
  notes: "Italian national hospitalised in Milan after returning from St Helena.",
  sourceUrl: "https://www.reuters.com/...",
}
```

After commit + push:
- ISR re-renders the page within 60s
- Map polls and updates within 60s

---

## Admin console

`https://hondius-watch.com/admin?token=<ADMIN_TOKEN>`

Server-side gated by `ADMIN_TOKEN` (defaults to `BROADCAST_ADMIN_TOKEN` if `ADMIN_TOKEN` not set).

- **Pending events** — approve / reject
- **Recent live events** — audit auto-published
- **Force broadcast now** — bypasses 6h debounce

---

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public canonical URL |
| `RESEND_API_KEY` | Resend (transactional + broadcast emails) |
| `EMAIL_FROM` | From-header for outbound mail |
| `BROADCAST_ADMIN_TOKEN` | `Authorization: Bearer …` for `/api/broadcast` |
| `INGEST_TOKEN` | `Authorization: Bearer …` for `/api/internal/ingest` |
| `ADMIN_TOKEN` | Token for `/admin?token=…` and `/api/admin/*` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel token (set on server only) |
| `DATABASE_PATH` | SQLite path (default `/app/data/subscribers.db` in container) |

Each `*_TOKEN` should be `openssl rand -hex 32`.

---

## API surface

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/api/health` | GET | none | `{"ok":true}` |
| `/api/og` | GET | none | Dynamic OG image |
| `/api/subscribe` | POST | none | Public — submits email, double opt-in |
| `/api/confirm/[token]` | GET | token in URL | Confirms subscription |
| `/api/unsubscribe/[token]` | GET | token in URL | Removes subscription |
| `/api/broadcast` | POST | `BROADCAST_ADMIN_TOKEN` | Manual broadcast (CLI) |
| `/api/broadcast/maybe-trigger` | POST | `INGEST_TOKEN` or `BROADCAST_ADMIN_TOKEN` | Debounced trigger; admin can `force:true` |
| `/api/internal/ingest` | POST | `INGEST_TOKEN` | Receives RSS-parsed candidates |
| `/api/admin/event-status` | POST | `ADMIN_TOKEN` | Approve / reject a live_event |
| `/api/outbreaks/[slug]/cases` | GET | none | Public live cases JSON, edge-cached 60s |

---

## GitHub Actions

| Workflow | Trigger | Action |
|---|---|---|
| `news-refresh.yml` | Cron (every 2h) + manual | Polls RSS, posts to `/api/internal/ingest` |
| `deploy-hetzner.yml` | Push to main | SSH to server, `git pull && docker compose up -d --build` |

Required GitHub secrets:
- `INGEST_TOKEN` — same as on server
- `SITE_URL` — optional override (defaults to https://hondius-watch.com)
- `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY` — for auto-deploy

---

## Adding a new outbreak

1. Create folder `data/outbreaks/<slug>/` with the same files as `hondius-2026/`
2. Register in `lib/outbreaks.ts`:
   ```ts
   import { newOutbreak } from "@/data/outbreaks/<slug>";
   const BASELINE: OutbreakData[] = [hondiusOutbreak, newOutbreak];
   ```
3. The parser still ingests for the new slug — you'll need to update keyword whitelist in `scripts/refresh-news.mjs`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (standalone output) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Map | Leaflet + react-leaflet v4 |
| Charts | D3.js |
| Fonts | Inter, Source Serif 4, JetBrains Mono |
| Validation | Zod |
| DB | SQLite (better-sqlite3, in Docker volume) |
| Email | Resend (REST) |
| Hosting | Hetzner CCX13 (Docker) |
| Edge / SSL | Cloudflare Tunnel |
| Analytics | Plausible (placeholder) |
| OG images | next/og (Node runtime) |
