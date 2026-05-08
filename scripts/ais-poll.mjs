#!/usr/bin/env node
/**
 * AIS poller — long-running daemon that subscribes to AISStream.io WebSocket
 * for one or more MMSIs and writes received positions to SQLite.
 *
 * Designed to run as a third docker-compose service `ais-poll` that mounts the
 * same hondius_data volume as hondius-tracker.
 *
 * Required env:
 *   AIS_API_KEY        — from https://aisstream.io (free signup)
 *   MV_HONDIUS_MMSI    — 9-digit MMSI of MV Hondius (find on MarineTraffic)
 *
 * Optional:
 *   DATABASE_PATH      — default /app/data/subscribers.db
 *   AIS_RECONNECT_MS   — backoff for reconnect, default 15000
 *
 * Behaviour:
 *  - Connects to wss://stream.aisstream.io/v0/stream
 *  - Subscribes to PositionReport messages for configured MMSIs
 *  - On each PositionReport: UPSERT into ship_positions (latest only — no history)
 *  - On disconnect: backoff and reconnect
 *  - Logs each insert + connection lifecycle
 */

import WebSocket from "ws";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const API_KEY = process.env.AIS_API_KEY;
const MMSI_HONDIUS = process.env.MV_HONDIUS_MMSI;
const RECONNECT_MS = Number(process.env.AIS_RECONNECT_MS ?? 15_000);
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "subscribers.db");

if (!API_KEY) {
  console.error("AIS_API_KEY not set — exit");
  process.exit(1);
}
if (!MMSI_HONDIUS) {
  console.error("MV_HONDIUS_MMSI not set — exit");
  process.exit(1);
}

// Ensure DB dir exists.
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Open DB. WAL mode allows concurrent reads from hondius-tracker process.
// We share the same file via Docker volume mount.
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure table exists. Same DDL as in lib/db.ts — idempotent.
db.exec(`
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

const upsert = db.prepare(
  `INSERT INTO ship_positions
     (mmsi, ship_name, lat, lng, speed_knots, course_deg, heading_deg, timestamp_received, source, raw_payload)
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
);

let ws = null;
let reconnectTimer = null;

function log(...args) {
  console.log(`[ais-poll ${new Date().toISOString()}]`, ...args);
}

function connect() {
  log(`connecting to AISStream.io, watching MMSI ${MMSI_HONDIUS}`);
  ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

  ws.on("open", () => {
    log("WebSocket open — sending subscription");
    const subscription = {
      APIKey: API_KEY,
      // BoundingBoxes — обязательный параметр; для глобального покрытия
      // даём максимально широкий box.
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      // Фильтр по нашим MMSI. Если оставить пустым — пришлёт ВСЕ суда мира
      // (10k+ msg/sec, нам не нужно).
      FiltersShipMMSI: [String(MMSI_HONDIUS)],
      // Только PositionReport — не нужны статические сообщения о судне
      FilterMessageTypes: ["PositionReport", "ShipStaticData"],
    };
    ws.send(JSON.stringify(subscription));
    log("subscribed");
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      log("invalid JSON:", e.message);
      return;
    }

    const meta = msg.MetaData ?? {};
    const mmsi = String(meta.MMSI ?? "");
    if (!mmsi) return;

    const messageType = msg.MessageType;

    // PositionReport — то что нас интересует
    if (messageType === "PositionReport") {
      const pr = msg.Message?.PositionReport;
      if (!pr) return;
      const lat = pr.Latitude;
      const lng = pr.Longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      // AIS изредка шлёт invalid coords (91, 181) для unknown
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

      try {
        upsert.run(
          mmsi,
          meta.ShipName ?? null,
          lat,
          lng,
          typeof pr.Sog === "number" ? pr.Sog : null,
          typeof pr.Cog === "number" ? pr.Cog : null,
          typeof pr.TrueHeading === "number" ? pr.TrueHeading : null,
          Date.now(),
          "aisstream",
          JSON.stringify(msg).slice(0, 2000) // truncate for safety
        );
        log(
          `position MMSI=${mmsi} ${lat.toFixed(4)},${lng.toFixed(4)} speed=${pr.Sog ?? "?"}kn course=${pr.Cog ?? "?"}°`
        );
      } catch (e) {
        log("upsert failed:", e.message);
      }
    } else if (messageType === "ShipStaticData") {
      // Ship name update only — не меняем координаты
      const name = msg.Message?.ShipStaticData?.Name;
      if (name) {
        try {
          db.prepare(
            "UPDATE ship_positions SET ship_name = ? WHERE mmsi = ?"
          ).run(name.trim(), mmsi);
          log(`static data: MMSI=${mmsi} name="${name.trim()}"`);
        } catch (e) {
          log("ship name update failed:", e.message);
        }
      }
    }
  });

  ws.on("error", (err) => {
    log("WebSocket error:", err.message);
  });

  ws.on("close", (code, reason) => {
    log(`WebSocket closed (${code}) ${reason?.toString() ?? ""} — reconnecting in ${RECONNECT_MS}ms`);
    ws = null;
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_MS);
    }
  });
}

connect();

// Graceful shutdown
function shutdown(signal) {
  log(`received ${signal} — shutting down`);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }
  try {
    db.close();
  } catch {
    /* ignore */
  }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
