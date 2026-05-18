import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function getDb(dbPath = path.join(process.cwd(), "data", "job_leads.sqlite")): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  migrateSchema(db);
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

    CREATE TABLE IF NOT EXISTS hunt_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      company TEXT,
      location TEXT,
      work_mode TEXT,
      employment_type TEXT,
      source TEXT,
      source_url TEXT,
      apply_url TEXT,
      description TEXT,
      required_skills TEXT,
      preferred_skills TEXT,
      work_authorization_language TEXT,
      salary_or_rate TEXT,
      red_flags TEXT,
      gmail_message_id TEXT,
      gmail_thread_id TEXT,
      recruiter_email TEXT,
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'discovered',
      needs_review INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hunt_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      resume_text TEXT NOT NULL,
      cover_letter_text TEXT NOT NULL,
      next_action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hunt_outreach_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      draft_type TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TEXT NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_status ON hunt_jobs (status);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_gmail_message ON hunt_jobs (gmail_message_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_apply_url ON hunt_jobs (apply_url);
    CREATE INDEX IF NOT EXISTS idx_hunt_outreach_status ON hunt_outreach_drafts (status);
  `);
}

function migrateSchema(db: Database.Database): void {
  ensureColumn(db, "opportunities", "company", "TEXT");
  ensureColumn(db, "opportunities", "employment_type", "TEXT");
  ensureColumn(db, "opportunities", "salary_or_rate", "TEXT");
  ensureColumn(db, "opportunities", "parser_confidence", "INTEGER");
  ensureColumn(db, "drafts", "gmail_draft_id", "TEXT");
  ensureColumn(db, "drafts", "recipient_email", "TEXT");
  ensureColumn(db, "hunt_jobs", "gmail_message_id", "TEXT");
  ensureColumn(db, "hunt_jobs", "gmail_thread_id", "TEXT");
  ensureColumn(db, "hunt_jobs", "recruiter_email", "TEXT");
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
