/**
 * Country code → [lat, lng] для авто-заполнения координат в admin Add-case форме.
 * Координаты ≈ столица / геометрический центр. Админ может вручную переписать.
 *
 * Для конкретного города (Аликанте, Барселона и т.п.) — заполнять руками.
 */
export const COUNTRY_COORDS: Record<string, { name: string; lat: number; lng: number }> = {
  // Already affected
  NL: { name: "Netherlands", lat: 52.37, lng: 4.9 },
  CH: { name: "Switzerland", lat: 46.95, lng: 7.45 },
  GB: { name: "United Kingdom", lat: 51.5, lng: -0.12 },
  DE: { name: "Germany", lat: 52.52, lng: 13.4 },
  ES: { name: "Spain", lat: 40.42, lng: -3.7 },
  US: { name: "United States", lat: 38.9, lng: -77.0 },
  FR: { name: "France", lat: 48.85, lng: 2.35 },

  // Disembark unaware destinations
  AU: { name: "Australia", lat: -33.87, lng: 151.21 },
  TW: { name: "Taiwan", lat: 25.03, lng: 121.56 },
  IT: { name: "Italy", lat: 41.9, lng: 12.5 },

  // Other plausible countries
  AR: { name: "Argentina", lat: -34.6, lng: -58.4 },
  CL: { name: "Chile", lat: -33.45, lng: -70.67 },
  ZA: { name: "South Africa", lat: -33.92, lng: 18.42 },
  PT: { name: "Portugal", lat: 38.72, lng: -9.13 },
  BE: { name: "Belgium", lat: 50.85, lng: 4.35 },
  IE: { name: "Ireland", lat: 53.35, lng: -6.26 },
  NO: { name: "Norway", lat: 59.91, lng: 10.75 },
  SE: { name: "Sweden", lat: 59.33, lng: 18.07 },
  FI: { name: "Finland", lat: 60.17, lng: 24.94 },
  DK: { name: "Denmark", lat: 55.68, lng: 12.57 },
  AT: { name: "Austria", lat: 48.21, lng: 16.37 },
  PL: { name: "Poland", lat: 52.23, lng: 21.01 },
  CA: { name: "Canada", lat: 45.42, lng: -75.7 },
  BR: { name: "Brazil", lat: -15.8, lng: -47.86 },
  MX: { name: "Mexico", lat: 19.43, lng: -99.13 },
  JP: { name: "Japan", lat: 35.68, lng: 139.69 },
  KR: { name: "South Korea", lat: 37.57, lng: 126.98 },
  SG: { name: "Singapore", lat: 1.35, lng: 103.82 },
  CN: { name: "China", lat: 39.9, lng: 116.4 },
  IN: { name: "India", lat: 28.61, lng: 77.21 },
  NZ: { name: "New Zealand", lat: -41.29, lng: 174.78 },
  IS: { name: "Iceland", lat: 64.15, lng: -21.94 },

  // Special — on board / international waters
  XS: { name: "Aboard MV Hondius", lat: 15, lng: -25 },
};

export function coordsForCountry(code: string): { lat: number; lng: number } | undefined {
  const c = COUNTRY_COORDS[code.toUpperCase()];
  return c ? { lat: c.lat, lng: c.lng } : undefined;
}

export function nameForCountry(code: string): string | undefined {
  return COUNTRY_COORDS[code.toUpperCase()]?.name;
}
