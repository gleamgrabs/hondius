export type OutbreakStatus = "active" | "contained" | "resolved";
export type EventSeverity = "info" | "warning" | "critical";
export type CaseStatus = "confirmed" | "suspected" | "evacuated" | "deceased";

export interface OutbreakMeta {
  id: string;
  slug: string;
  title: string;
  pathogen: string;
  pathogenSlug: string;
  location: string;
  status: OutbreakStatus;
  startDate: string; // ISO date
  lastUpdated: string; // ISO date
  summary: string;
  stats: {
    cases: number;
    deaths: number;
    countries: number;
    disembarkedUnaware?: number;
    firstSymptomDate?: string; // ISO date for "days since" calc
  };
}

export interface OutbreakEvent {
  id: string;
  date: string; // ISO date
  title: string;
  description: string;
  severity: EventSeverity;
  location?: string;
  sources: string[];
}

export interface CaseEntry {
  id: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  coords: [number, number]; // [lat, lng]
  caseCount: number;
  deaths: number;
  status: CaseStatus;
  dateConfirmed?: string; // ISO date
  notes: string;
  sourceUrl?: string;
}

export interface RouteWaypoint {
  name: string;
  coords: [number, number]; // [lat, lng]
  date?: string; // ISO date
  type: "origin" | "waypoint" | "denied" | "destination" | "disembark";
  notes?: string;
}

export interface RouteSegment {
  from: string;
  to: string;
  style: "solid" | "dashed";
  waypoints: Array<[number, number]>;
}

export interface SourceEntry {
  id: number;
  title: string;
  publisher: string;
  url: string;
  accessed: string; // ISO date
  publishedDate?: string; // ISO date
}

export interface DisembarkedDestination {
  country: string;
  countryCode: string;
  passengerCount: number;
  hasConfirmedCase: boolean;
}

export interface OutbreakData {
  meta: OutbreakMeta;
  events: OutbreakEvent[];
  cases: CaseEntry[];
  route: RouteWaypoint[];
  sources: SourceEntry[];
  disembarked: DisembarkedDestination[];
}
