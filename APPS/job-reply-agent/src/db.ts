import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { initHuntSchema } from "./hunt/db.js";

export function getDb(dbPath = path.join(process.cwd(), "data", "job_leads.sqlite")): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  migrateSchema(db);
  initHuntSchema(db);
  return db;
}

export function resetDb(dbPath = path.join(process.cwd(), "data", "job_leads.sqlite")): void {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      received_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      thread_id TEXT,
      company TEXT,
      role_title TEXT NOT NULL,
      location TEXT NOT NULL,
      employment_type TEXT,
      salary_or_rate TEXT,
      parser_confidence INTEGER,
      match_score INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      resume_path TEXT NOT NULL,
      gmail_draft_id TEXT,
      recipient_email TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages (message_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions (created_at);
    CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions (status);
    CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities (match_score DESC);
    CREATE INDEX IF NOT EXISTS idx_drafts_approved ON drafts (approved, sent);
  `);
}

function migrateSchema(db: Database.Database): void {
  ensureColumn(db, "opportunities", "company", "TEXT");
  ensureColumn(db, "opportunities", "employment_type", "TEXT");
  ensureColumn(db, "opportunities", "salary_or_rate", "TEXT");
  ensureColumn(db, "opportunities", "parser_confidence", "INTEGER");
  ensureColumn(db, "drafts", "gmail_draft_id", "TEXT");
  ensureColumn(db, "drafts", "recipient_email", "TEXT");
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  columnType: string
): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
}
