import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// NOTE: We use `createRequire()` instead of a static `import 'node:sqlite'` so Jest's resolver
// doesn't choke on newer built-in modules that aren't in its core-module allowlist.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "memory", "mission_control.sqlite");

let activeDb = null;
let activePath = "";

function resolveDbPath() {
  const override = String(process.env.ATEAM_SQLITE_PATH || "").trim();
  if (override) return path.resolve(override);
  return DEFAULT_DB_PATH;
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureColumn(db, tableName, columnName, columnSql) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = Array.isArray(rows) && rows.some((row) => String(row?.name || "").trim() === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
  }
}

function runMigrations(db) {
  // Core event stream backing Mission Control and Talk/Timeline.
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      lane TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      turn_id TEXT,
      status_key TEXT,
      meta_dedupe_key TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}',
      deduped INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      last_duplicate_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_session_ts
      ON events(session_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_session_type
      ON events(session_id, type);
    CREATE INDEX IF NOT EXISTS idx_events_session_turn
      ON events(session_id, turn_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_dedupe
      ON events(session_id, type, turn_id, status_key, meta_dedupe_key);
  `);

  // Future-facing tables used by Mission Control pages (local-first, replaceable).
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_ts TEXT NOT NULL,
      name TEXT,
      owner TEXT,
      status TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      created_ts TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'BACKLOG',
      risk TEXT NOT NULL DEFAULT 'low',
      owner_agent_id TEXT,
      data_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_work_items_stage
      ON work_items(stage);

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      created_ts TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_by TEXT NOT NULL DEFAULT '',
      policy TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_approvals_status
      ON approvals(status);

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      created_ts TEXT NOT NULL,
      updated_ts TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'intake',
      requested_by TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'website',
      idea TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      questions_json TEXT NOT NULL DEFAULT '[]',
      answers_json TEXT NOT NULL DEFAULT '{}',
      brief_json TEXT NOT NULL DEFAULT '{}',
      recommended_lane TEXT NOT NULL DEFAULT '',
      risks_json TEXT NOT NULL DEFAULT '[]',
      artifacts_json TEXT NOT NULL DEFAULT '{}',
      approvals_json TEXT NOT NULL DEFAULT '{}',
      links_json TEXT NOT NULL DEFAULT '{}',
      handoff_json TEXT NOT NULL DEFAULT '{}',
      meta_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_runs_phase
      ON workflow_runs(phase, updated_ts);

    CREATE INDEX IF NOT EXISTS idx_workflow_runs_updated
      ON workflow_runs(updated_ts);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      created_ts TEXT NOT NULL,
      updated_ts TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      structured_fields_json TEXT NOT NULL DEFAULT '{}',
      rendered_output TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_documents_run_id
      ON documents(run_id, updated_ts);

    CREATE INDEX IF NOT EXISTS idx_documents_status
      ON documents(status, created_ts);

    CREATE INDEX IF NOT EXISTS idx_documents_doc_type
      ON documents(doc_type, updated_ts);
  `);

  ensureColumn(db, "workflow_runs", "request_json", "request_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "workflow_runs", "plan_json", "plan_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "workflow_runs", "evaluation_json", "evaluation_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "workflow_runs", "state", "state TEXT NOT NULL DEFAULT 'queued'");
  ensureColumn(db, "workflow_runs", "state_history_json", "state_history_json TEXT NOT NULL DEFAULT '[]'");
}

function openDb(dbPath) {
  ensureDirForFile(dbPath);
  const db = new DatabaseSync(dbPath);
  // Make concurrent reads/writes smoother for local use.
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA synchronous=NORMAL;");
  runMigrations(db);
  return db;
}

export function getDb() {
  const dbPath = resolveDbPath();
  if (activeDb && activePath === dbPath) return activeDb;
  if (activeDb) {
    try {
      activeDb.close();
    } catch {}
    activeDb = null;
    activePath = "";
  }
  activeDb = openDb(dbPath);
  activePath = dbPath;
  return activeDb;
}

export function resetDb() {
  if (activeDb) {
    try {
      activeDb.close();
    } catch {}
  }
  activeDb = null;
  activePath = "";
}

export function getDbPath() {
  return activePath || resolveDbPath();
}
