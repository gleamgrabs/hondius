import type { OutbreakData, OutbreakMeta } from "@/lib/types";
import { hondiusOutbreak } from "@/data/outbreaks/hondius-2026";

const ALL_OUTBREAKS: OutbreakData[] = [hondiusOutbreak];

export function getAllOutbreaks(): OutbreakData[] {
  return ALL_OUTBREAKS;
}

export function getAllOutbreakMetas(): OutbreakMeta[] {
  return ALL_OUTBREAKS.map((o) => o.meta);
}

export function getOutbreakBySlug(slug: string): OutbreakData | undefined {
  return ALL_OUTBREAKS.find((o) => o.meta.slug === slug);
}

export function getOutbreaksByPathogen(pathogenSlug: string): OutbreakData[] {
  return ALL_OUTBREAKS.filter((o) => o.meta.pathogenSlug === pathogenSlug);
}

export function getAllOutbreakSlugs(): string[] {
  return ALL_OUTBREAKS.map((o) => o.meta.slug);
}
