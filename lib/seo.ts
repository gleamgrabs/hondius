const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com";

export function buildOgUrl(params: Record<string, string | number>): string {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  return `${SITE_URL}/api/og?${qs}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysSince(isoDate: string): number {
  const start = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}
