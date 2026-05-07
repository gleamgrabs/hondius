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
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional. If set, injects Plausible analytics script for that domain. Unset = no analytics |
| `INGEST_FORCE_PENDING` | Used only by `scripts/refresh-news.mjs`. If `1`, every parsed item is forced to `pending` regardless of authority — safety switch for shake-down or first-time runs |

Each `*_TOKEN` should be `openssl rand -hex 32`.

---

## Health & monitoring

`/api/health` returns extended status:

```json
{
  "ok": true,
  "ts": 1778181734739,
  "checks": {
    "db": "ok",
    "live_events_count": 12,
    "live_cases_count": 5,
    "subscribers_confirmed": 42,
    "last_ingest_at": 1778180000000,
    "last_broadcast_at": 1778100000000,
    "ingest_status": "ok"
  }
}
```

- `db: "error"` → HTTP 503 (DB unavailable)
- `ingest_status: "stale"` → no ingest in last 4 hours (cron broken)
- `ingest_status: "never"` → no live data yet (fresh deploy)

Recommended UptimeRobot setup (5min interval, free tier):

| Monitor | URL | Keyword |
|---|---|---|
| Site up | `https://hondius-watch.com/api/health` | `"ok":true` |
| Ingest fresh | `https://hondius-watch.com/api/health` | `"ingest_status":"ok"` |
| Page rendered | `https://hondius-watch.com/` | `Hondius Watch` |

The first catches DB failures (503). The second catches silent cron failures. The third catches `/api/health` working but the page render broken.

---

## Backup & restore (SQLite)

`deploy/scripts/backup-sqlite.sh` does an online consistent backup via `better-sqlite3`'s `backup()` (no DB lock), copies the file out of the container, gzips it, rotates 14 days.

Setup (one-time, on server):
```bash
chmod +x /opt/hondius/deploy/scripts/backup-sqlite.sh
# Run manually first to verify
/opt/hondius/deploy/scripts/backup-sqlite.sh
ls -lh /opt/hondius/backups/

# Then schedule via cron
crontab -e -u root
# Add:
# 0 3 * * * /opt/hondius/deploy/scripts/backup-sqlite.sh >> /var/log/hondius-backup.log 2>&1
```

### Restore from backup

```bash
ssh root@62.238.9.117
cd /opt/hondius

# Pick a backup
ls -lh backups/

# Stop the app (cloudflared stays up)
sudo -u hondius docker compose stop hondius-tracker

# Decompress to a temp file
gunzip -c backups/subscribers-YYYYMMDD-HHMMSS.db.gz > /tmp/restore.db

# Copy into the container's data volume
CID=$(sudo -u hondius docker compose ps -q hondius-tracker)
docker cp /tmp/restore.db "$CID:/app/data/subscribers.db.restore"
sudo -u hondius docker compose start hondius-tracker

# Inside the container, replace the DB and restart
sudo -u hondius docker compose exec -T hondius-tracker bash -c "mv /app/data/subscribers.db.restore /app/data/subscribers.db"
sudo -u hondius docker compose restart hondius-tracker

# Verify
curl -s https://hondius-watch.com/api/health
```

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
