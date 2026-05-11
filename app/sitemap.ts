import type { MetadataRoute } from "next";
import { getAllOutbreaks } from "@/lib/outbreaks";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com";

/**
 * Динамический sitemap. `lastModified` для outbreak-страниц берётся из
 * merged data (TS baseline + SQLite live overlay), так что отражает реальный
 * последний update в БД, а не build-time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const outbreaks = getAllOutbreaks();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: latestUpdate(outbreaks),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date("2026-05-07"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/pathogen/hantavirus`,
      lastModified: latestUpdate(outbreaks),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const outbreakPages: MetadataRoute.Sitemap = [];
  for (const o of outbreaks) {
    const base = `${SITE_URL}/outbreak/${o.meta.slug}`;
    const lm = new Date(o.meta.lastUpdated);
    outbreakPages.push(
      {
        url: base,
        lastModified: lm,
        changeFrequency: "hourly",
        priority: 0.95,
      },
      {
        url: `${base}/timeline`,
        lastModified: lm,
        changeFrequency: "hourly",
        priority: 0.85,
      },
      {
        url: `${base}/cases`,
        lastModified: lm,
        changeFrequency: "hourly",
        priority: 0.85,
      },
      {
        url: `${base}/disembarked`,
        lastModified: lm,
        changeFrequency: "weekly",
        priority: 0.75,
      }
    );
  }

  return [...staticPages, ...outbreakPages];
}

function latestUpdate(outbreaks: ReturnType<typeof getAllOutbreaks>): Date {
  const ts = outbreaks.reduce((m, o) => {
    const t = new Date(o.meta.lastUpdated).getTime();
    return t > m ? t : m;
  }, 0);
  return ts > 0 ? new Date(ts) : new Date();
}
