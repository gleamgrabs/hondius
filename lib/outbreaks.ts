import type { OutbreakData, OutbreakMeta } from "@/lib/types";
import { hondiusOutbreak } from "@/data/outbreaks/hondius-2026";
import { mergeLiveData } from "@/lib/live-data";

const BASELINE: OutbreakData[] = [hondiusOutbreak];

function withLive(data: OutbreakData): OutbreakData {
  return mergeLiveData(data, data.meta.slug);
}

export function getAllOutbreaks(): OutbreakData[] {
  return BASELINE.map(withLive);
}

export function getAllOutbreakMetas(): OutbreakMeta[] {
  return getAllOutbreaks().map((o) => o.meta);
}

export function getOutbreakBySlug(slug: string): OutbreakData | undefined {
  const baseline = BASELINE.find((o) => o.meta.slug === slug);
  return baseline ? withLive(baseline) : undefined;
}

export function getOutbreaksByPathogen(pathogenSlug: string): OutbreakData[] {
  return getAllOutbreaks().filter((o) => o.meta.pathogenSlug === pathogenSlug);
}

export function getAllOutbreakSlugs(): string[] {
  return BASELINE.map((o) => o.meta.slug);
}
