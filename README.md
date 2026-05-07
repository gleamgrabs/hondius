# Outbreak Tracker

An independent, data-journalism-style website tracking infectious disease outbreaks. Current: hantavirus aboard MV Hondius (May 2026).

Built with Next.js 14, TypeScript, Tailwind CSS, Leaflet, and D3.

---

## Local development

```bash
git clone <your-repo-url>
cd hondius-tracker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Updating existing outbreak data

All outbreak data is plain TypeScript — no database, no CMS. Edit the file, commit, and Vercel redeploys automatically.

### Update case counts or add a new case

Edit `data/outbreaks/hondius-2026/cases.ts`. Each entry follows the `CaseEntry` type defined in `lib/types.ts`:

```ts
{
  id: "case-xx-01",
  country: "France",
  countryCode: "FR",
  coords: [48.85, 2.35],   // [lat, lng]
  caseCount: 1,
  deaths: 0,
  status: "confirmed",
  dateConfirmed: "2026-05-10",
  notes: "Brief factual note about the case.",
  sourceUrl: "https://example.com/source",
}
```

### Add a timeline event

Edit `data/outbreaks/hondius-2026/events.ts`. Severity options: `"info"` | `"warning"` | `"critical"`.

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

### Update the key stats

Edit `data/outbreaks/hondius-2026/meta.ts` — change `stats.cases`, `stats.deaths`, `stats.countries`.

---

## Adding a new outbreak

1. Create a new folder: `data/outbreaks/your-slug-2026/`
2. Copy and adapt the files from `hondius-2026/` (`meta.ts`, `events.ts`, `cases.ts`, `locations.ts`, `sources.ts`, `disembarked.ts`, `index.ts`)
3. Register it in `lib/outbreaks.ts`:
   ```ts
   import { yourOutbreak } from "@/data/outbreaks/your-slug-2026";
   const ALL_OUTBREAKS: OutbreakData[] = [hondiusOutbreak, yourOutbreak];
   ```
4. The route `/outbreak/your-slug-2026` generates automatically.

---

## Adding a new pathogen page

1. Add the slug to `PATHOGEN_SLUGS` in `app/pathogen/[slug]/page.tsx`.
2. Add the corresponding content object in that file.

---

## Deploying to Vercel

1. Push to a GitHub/GitLab repository.
2. Import in [vercel.com/new](https://vercel.com/new) — Vercel detects Next.js automatically.
3. Set the environment variable: `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

Sitemap is generated after each build via `postbuild` → `next-sitemap`. Update `siteUrl` in `next-sitemap.config.js` or use `NEXT_PUBLIC_SITE_URL`.

---

## Pre-publish checklist

- [ ] Custom domain connected in Vercel dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` environment variable set
- [ ] Plausible: replace `YOUR_DOMAIN` in `app/layout.tsx`
- [ ] OG image tested: `/api/og?cases=8&deaths=3&title=MV+Hondius+outbreak`
- [ ] OG preview verified via [opengraph.xyz](https://opengraph.xyz)
- [ ] Google Search Console: property added, sitemap submitted at `/sitemap.xml`
- [ ] `npm run build` passes without warnings

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Map | Leaflet + react-leaflet v4 |
| Charts | D3.js |
| Fonts | Inter, Source Serif 4, JetBrains Mono |
| Analytics | Plausible (placeholder) |
| Hosting | Vercel |
| Sitemap | next-sitemap |
| OG images | @vercel/og |
