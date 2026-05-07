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
  `);

  _db = db;
  return db;
}

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
