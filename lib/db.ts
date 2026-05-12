import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "subscribers.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      confirm_token TEXT UNIQUE,
      unsubscribe_token TEXT UNIQUE NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      confirmed_at INTEGER,
      last_emailed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_subscribers_confirmed
      ON subscribers(confirmed);

    CREATE TABLE IF NOT EXISTS broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      recipient_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_events (
      id TEXT PRIMARY KEY,
      outbreak_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      source_ids TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'live',
      source_url TEXT NOT NULL,
      source_publisher TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      approved_at INTEGER,
      approved_by TEXT
    );

    CREATE TABLE IF NOT EXISTS live_cases (
      id TEXT PRIMARY KEY,
      outbreak_slug TEXT NOT NULL,
      country TEXT NOT NULL,
      country_code TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      case_count INTEGER NOT NULL,
      deaths INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      date_confirmed TEXT NOT NULL,
      notes TEXT,
      source_url TEXT,
      publish_status TEXT NOT NULL DEFAULT 'live',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_sources (
      id TEXT PRIMARY KEY,
      outbreak_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      publisher TEXT NOT NULL,
      url TEXT NOT NULL,
      accessed TEXT NOT NULL,
      published_date TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_live_events_outbreak
      ON live_events(outbreak_slug, status);
    CREATE INDEX IF NOT EXISTS idx_live_cases_outbreak
      ON live_cases(outbreak_slug, publish_status);

    CREATE TABLE IF NOT EXISTS broadcast_state (
      outbreak_slug TEXT PRIMARY KEY,
      last_sent_at INTEGER NOT NULL,
      pending_event_ids TEXT NOT NULL DEFAULT '[]'
    );

    -- Положения судов через AIS (AISStream.io или другой источник).
    -- Для каждого MMSI храним последнее принятое положение.
    -- История не сохраняется — только latest по MMSI (UPSERT).
    CREATE TABLE IF NOT EXISTS ship_positions (
      mmsi TEXT PRIMARY KEY,
      ship_name TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed_knots REAL,
      course_deg REAL,
      heading_deg REAL,
      timestamp_received INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'aisstream',
      raw_payload TEXT
    );
  `);

  // Идемпотентная миграция: добавить sent_event_ids в broadcasts если её нет.
  const broadcastCols = db
    .prepare("PRAGMA table_info(broadcasts)")
    .all() as Array<{ name: string }>;
  const hasSentEventIds = broadcastCols.some((c) => c.name === "sent_event_ids");
  if (!hasSentEventIds) {
    db.exec(
      `ALTER TABLE broadcasts ADD COLUMN sent_event_ids TEXT NOT NULL DEFAULT '[]'`
    );
  }

  _db = db;
  return db;
}

// ─── Subscribers (existing) ──────────────────────────────────────────
export interface Subscriber {
  id: number;
  email: string;
  confirm_token: string | null;
  unsubscribe_token: string;
  confirmed: number;
  created_at: number;
  confirmed_at: number | null;
  last_emailed_at: number | null;
}

// ─── Live data row types ─────────────────────────────────────────────
export interface LiveEventRow {
  id: string;
  outbreak_slug: string;
  date: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  source_ids: string; // JSON array
  status: "live" | "pending" | "rejected";
  source_url: string;
  source_publisher: string;
  raw_payload: string;
  created_at: number;
  approved_at: number | null;
  approved_by: string | null;
}

export interface LiveCaseRow {
  id: string;
  outbreak_slug: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  case_count: number;
  deaths: number;
  status: "confirmed" | "suspected" | "evacuated" | "deceased";
  date_confirmed: string;
  notes: string | null;
  source_url: string | null;
  publish_status: "live" | "pending" | "rejected";
  created_at: number;
  updated_at: number;
}

export interface LiveSourceRow {
  id: string;
  outbreak_slug: string;
  title: string;
  publisher: string;
  url: string;
  accessed: string;
  published_date: string | null;
  created_at: number;
}

export interface BroadcastStateRow {
  outbreak_slug: string;
  last_sent_at: number;
  pending_event_ids: string; // JSON array
}

// ─── Live events helpers ─────────────────────────────────────────────
export function getLiveEvents(
  slug: string,
  opts: { status?: LiveEventRow["status"] | "all" } = {}
): LiveEventRow[] {
  const db = getDb();
  const status = opts.status ?? "live";
  if (status === "all") {
    return db
      .prepare("SELECT * FROM live_events WHERE outbreak_slug = ? ORDER BY date DESC")
      .all(slug) as LiveEventRow[];
  }
  return db
    .prepare(
      "SELECT * FROM live_events WHERE outbreak_slug = ? AND status = ? ORDER BY date DESC"
    )
    .all(slug, status) as LiveEventRow[];
}

export function insertLiveEvent(row: Omit<LiveEventRow, "created_at"> & { created_at?: number }): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO live_events
     (id, outbreak_slug, date, title, description, severity, source_ids, status, source_url, source_publisher, raw_payload, created_at, approved_at, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.outbreak_slug,
    row.date,
    row.title,
    row.description,
    row.severity,
    row.source_ids,
    row.status,
    row.source_url,
    row.source_publisher,
    row.raw_payload,
    row.created_at ?? Date.now(),
    row.approved_at ?? null,
    row.approved_by ?? null
  );
}

export function setEventStatus(
  id: string,
  status: LiveEventRow["status"],
  approvedBy: string
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE live_events SET status = ?, approved_at = ?, approved_by = ? WHERE id = ?"
    )
    .run(status, Date.now(), approvedBy, id);
  return result.changes > 0;
}

export function liveEventExists(id: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM live_events WHERE id = ?")
    .get(id) as { id: string } | undefined;
  return !!row;
}

/** Все live-events за конкретную дату — для семантического дедупа. */
export function getLiveEventsByDate(
  slug: string,
  date: string
): LiveEventRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM live_events WHERE outbreak_slug = ? AND date LIKE ? AND status = 'live'"
    )
    .all(slug, `${date.slice(0, 10)}%`) as LiveEventRow[];
}

/**
 * Дозаписывает sourceUrl в source_ids JSON-массив существующего event'а.
 * Используется semantic-dedup: при совпадении нового кандидата с existing
 * мы не вставляем новый event, а добавляем url к уже существующему.
 */
export function appendSourceToEvent(
  eventId: string,
  sourceUrl: string,
  sourcePublisher: string
): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT source_ids FROM live_events WHERE id = ?")
    .get(eventId) as { source_ids: string } | undefined;
  if (!row) return false;
  let urls: string[];
  try {
    const parsed = JSON.parse(row.source_ids);
    urls = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    urls = [];
  }
  if (urls.includes(sourceUrl)) return false; // уже есть
  urls.push(sourceUrl);
  db.prepare(
    "UPDATE live_events SET source_ids = ?, source_publisher = source_publisher || ?, raw_payload = raw_payload WHERE id = ?"
  ).run(
    JSON.stringify(urls),
    // дописываем publisher в существующее поле (через запятую) если ещё не там
    "",
    eventId
  );
  // Update publisher отдельно, добавив через запятую если ещё не в строке
  const pubRow = db
    .prepare("SELECT source_publisher FROM live_events WHERE id = ?")
    .get(eventId) as { source_publisher: string };
  if (pubRow && !pubRow.source_publisher.split(",").map((s) => s.trim()).includes(sourcePublisher)) {
    db.prepare(
      "UPDATE live_events SET source_publisher = ? WHERE id = ?"
    ).run(`${pubRow.source_publisher}, ${sourcePublisher}`, eventId);
  }
  return true;
}

// ─── Live cases helpers ──────────────────────────────────────────────
export function getLiveCases(
  slug: string,
  opts: { publishStatus?: LiveCaseRow["publish_status"] | "all" } = {}
): LiveCaseRow[] {
  const db = getDb();
  const status = opts.publishStatus ?? "live";
  if (status === "all") {
    return db
      .prepare(
        "SELECT * FROM live_cases WHERE outbreak_slug = ? ORDER BY date_confirmed DESC"
      )
      .all(slug) as LiveCaseRow[];
  }
  return db
    .prepare(
      "SELECT * FROM live_cases WHERE outbreak_slug = ? AND publish_status = ? ORDER BY date_confirmed DESC"
    )
    .all(slug, status) as LiveCaseRow[];
}

export function insertLiveCase(
  row: Omit<LiveCaseRow, "created_at" | "updated_at"> & {
    created_at?: number;
    updated_at?: number;
  }
): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO live_cases
     (id, outbreak_slug, country, country_code, lat, lng, case_count, deaths, status, date_confirmed, notes, source_url, publish_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       country = excluded.country,
       country_code = excluded.country_code,
       lat = excluded.lat,
       lng = excluded.lng,
       case_count = excluded.case_count,
       deaths = excluded.deaths,
       status = excluded.status,
       date_confirmed = excluded.date_confirmed,
       notes = excluded.notes,
       source_url = excluded.source_url,
       publish_status = excluded.publish_status,
       updated_at = excluded.updated_at`
  ).run(
    row.id,
    row.outbreak_slug,
    row.country,
    row.country_code,
    row.lat,
    row.lng,
    row.case_count,
    row.deaths,
    row.status,
    row.date_confirmed,
    row.notes ?? null,
    row.source_url ?? null,
    row.publish_status,
    row.created_at ?? now,
    row.updated_at ?? now
  );
}

// ─── Live sources helpers ────────────────────────────────────────────
export function getLiveSources(slug: string): LiveSourceRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM live_sources WHERE outbreak_slug = ? ORDER BY created_at ASC"
    )
    .all(slug) as LiveSourceRow[];
}

export function insertLiveSource(
  row: Omit<LiveSourceRow, "created_at"> & { created_at?: number }
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO live_sources
     (id, outbreak_slug, title, publisher, url, accessed, published_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.outbreak_slug,
    row.title,
    row.publisher,
    row.url,
    row.accessed,
    row.published_date ?? null,
    row.created_at ?? Date.now()
  );
}

// ─── Broadcast state helpers ─────────────────────────────────────────
export function getBroadcastState(slug: string): BroadcastStateRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM broadcast_state WHERE outbreak_slug = ?")
    .get(slug) as BroadcastStateRow | undefined;
}

export function updateBroadcastState(
  slug: string,
  lastSentAt: number,
  pendingIds: string[]
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO broadcast_state (outbreak_slug, last_sent_at, pending_event_ids)
     VALUES (?, ?, ?)
     ON CONFLICT(outbreak_slug) DO UPDATE SET
       last_sent_at = excluded.last_sent_at,
       pending_event_ids = excluded.pending_event_ids`
  ).run(slug, lastSentAt, JSON.stringify(pendingIds));
}

export function appendPendingEvent(slug: string, eventId: string): string[] {
  const state = getBroadcastState(slug);
  const existing: string[] = state ? JSON.parse(state.pending_event_ids) : [];
  if (!existing.includes(eventId)) existing.push(eventId);
  updateBroadcastState(slug, state?.last_sent_at ?? 0, existing);
  return existing;
}

// ─── Ship positions ──────────────────────────────────────────────────
export interface ShipPositionRow {
  mmsi: string;
  ship_name: string | null;
  lat: number;
  lng: number;
  speed_knots: number | null;
  course_deg: number | null;
  heading_deg: number | null;
  timestamp_received: number;
  source: string;
  raw_payload: string | null;
}

export function getShipPosition(mmsi: string): ShipPositionRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM ship_positions WHERE mmsi = ?")
    .get(mmsi) as ShipPositionRow | undefined;
}

export function upsertShipPosition(row: Partial<ShipPositionRow> & { mmsi: string; lat: number; lng: number; timestamp_received: number }): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO ship_positions (mmsi, ship_name, lat, lng, speed_knots, course_deg, heading_deg, timestamp_received, source, raw_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(mmsi) DO UPDATE SET
       ship_name = COALESCE(excluded.ship_name, ship_name),
       lat = excluded.lat,
       lng = excluded.lng,
       speed_knots = excluded.speed_knots,
       course_deg = excluded.course_deg,
       heading_deg = excluded.heading_deg,
       timestamp_received = excluded.timestamp_received,
       source = excluded.source,
       raw_payload = excluded.raw_payload`
  ).run(
    row.mmsi,
    row.ship_name ?? null,
    row.lat,
    row.lng,
    row.speed_knots ?? null,
    row.course_deg ?? null,
    row.heading_deg ?? null,
    row.timestamp_received,
    row.source ?? "aisstream",
    row.raw_payload ?? null
  );
}

// ─── Sent-event tracking ─────────────────────────────────────────────
export function getAllSentEventIds(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare("SELECT sent_event_ids FROM broadcasts")
    .all() as Array<{ sent_event_ids: string }>;
  const set = new Set<string>();
  for (const r of rows) {
    try {
      const ids = JSON.parse(r.sent_event_ids ?? "[]");
      if (Array.isArray(ids)) for (const id of ids) set.add(String(id));
    } catch {
      /* ignore malformed row */
    }
  }
  return set;
}
