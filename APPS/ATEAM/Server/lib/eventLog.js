/**
 * Event Log for ATEAM
 * Local-first, SQLite-backed (with JSON import for backward compatibility).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { getDb } from "./sqliteDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EVENTS_DIR = path.join(__dirname, "..", "..", "memory", "events");

function resolveEventsDir() {
  const overrideDir = String(process.env.ATEAM_EVENT_LOG_DIR || "").trim();
  return overrideDir ? path.resolve(overrideDir) : DEFAULT_EVENTS_DIR;
}

function getEventsDir() {
  const dir = resolveEventsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeSessionId(sessionId) {
  const raw = String(sessionId || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return safe || "global";
}

function getSessionEventFile(sessionId) {
  const dir = getEventsDir();
  const safeSessionId = sanitizeSessionId(sessionId);
  return path.join(dir, `${safeSessionId}.json`);
}

function createEvent(type, actor, lane, summary, meta = {}) {
  const safeMeta = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
  const turnId = String(safeMeta.turnId || "").trim();
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: String(type || ""),
    actor: String(actor || ""),
    lane: String(lane || ""),
    summary: String(summary || ""),
    turnId: turnId || undefined,
    deduped: false,
    duplicateCount: 0,
    meta: safeMeta,
  };
}

function parseMetaJson(metaJson) {
  try {
    const parsed = JSON.parse(String(metaJson || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeEventRow(row) {
  if (!row) return null;
  const meta = parseMetaJson(row.meta_json);
  const turnId = String(row.turn_id || meta?.turnId || meta?.turn_id || "").trim();
  return {
    id: String(row.id),
    timestamp: String(row.timestamp),
    type: String(row.type),
    actor: String(row.actor),
    lane: String(row.lane),
    summary: String(row.summary || ""),
    turnId: turnId || undefined,
    deduped: Boolean(row.deduped),
    duplicateCount: Number(row.duplicate_count || 0),
    lastDuplicateAt: row.last_duplicate_at ? String(row.last_duplicate_at) : undefined,
    meta
  };
}

let cachedDb = null;
let cachedStatements = null;

function getStatements(db) {
  if (cachedDb === db && cachedStatements) return cachedStatements;
  cachedDb = db;
  cachedStatements = {
    countSession: db.prepare("SELECT COUNT(*) as c FROM events WHERE session_id = ?"),
    selectAllAsc: db.prepare("SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC"),
    selectLatestDescLimit: db.prepare("SELECT * FROM events WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?"),
    selectAfterAsc: db.prepare("SELECT * FROM events WHERE session_id = ? AND timestamp > ? ORDER BY timestamp ASC"),
    selectAfterAscLimit: db.prepare(
      "SELECT * FROM events WHERE session_id = ? AND timestamp > ? ORDER BY timestamp ASC LIMIT ?"
    ),
    selectTurnDedupe: db.prepare(
      "SELECT * FROM events WHERE session_id = ? AND type = ? AND turn_id = ? AND IFNULL(status_key,'') = IFNULL(?, '') LIMIT 1"
    ),
    selectMetaDedupe: db.prepare(
      "SELECT * FROM events WHERE session_id = ? AND type = ? AND meta_dedupe_key = ? LIMIT 1"
    ),
    updateDuplicate: db.prepare(
      "UPDATE events SET deduped = 1, duplicate_count = ?, last_duplicate_at = ? WHERE id = ?"
    ),
    insertEvent: db.prepare(
      `INSERT INTO events (
        id, session_id, timestamp, type, actor, lane, summary, turn_id, status_key, meta_dedupe_key,
        meta_json, deduped, duplicate_count, last_duplicate_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
  };
  return cachedStatements;
}

function ensureSessionImported(sessionId) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const db = getDb();
  const { countSession, insertEvent } = getStatements(db);
  const countRow = countSession.get(safeSessionId);
  const count = Number(countRow?.c || 0);
  if (count > 0) return;

  const filePath = getSessionEventFile(safeSessionId);
  if (!fs.existsSync(filePath)) return;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const events = Array.isArray(parsed) ? parsed : [];
    if (!events.length) return;

    db.exec("BEGIN");
    for (const item of events) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const meta = item.meta && typeof item.meta === "object" && !Array.isArray(item.meta) ? item.meta : {};
      const turnId = String(item.turnId || meta.turnId || "").trim() || null;
      const statusKey = String(meta.statusKey || "").trim() || null;
      const metaDedupeKey = String(meta.dedupeKey || "").trim() || null;

      insertEvent.run(
        String(item.id || crypto.randomUUID()),
        safeSessionId,
        String(item.timestamp || new Date().toISOString()),
        String(item.type || ""),
        String(item.actor || ""),
        String(item.lane || ""),
        String(item.summary || ""),
        turnId,
        statusKey,
        metaDedupeKey,
        JSON.stringify(meta),
        item.deduped ? 1 : 0,
        Number(item.duplicateCount || item.duplicate_count || 0),
        item.lastDuplicateAt ? String(item.lastDuplicateAt) : null
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    console.error(`[EventLog] Failed to import legacy events for ${safeSessionId}:`, err);
  }
}

function appendEvent(sessionId, event) {
  const safeSessionId = sanitizeSessionId(sessionId);
  try {
    ensureSessionImported(safeSessionId);
    const db = getDb();
    const stmts = getStatements(db);

    const incoming = event && typeof event === "object" ? { ...event } : {};
    const incomingType = String(incoming?.type || "").trim();
    const incomingMeta = incoming?.meta && typeof incoming.meta === "object" && !Array.isArray(incoming.meta) ? incoming.meta : {};
    const incomingTurnId = String(incoming?.turnId || incomingMeta?.turnId || "").trim();
    const incomingStatusKey = String(incomingMeta?.statusKey || "").trim();
    const incomingDedupeKey = String(incomingMeta?.dedupeKey || "").trim();

    if (incomingType && incomingTurnId) {
      const existingRow = stmts.selectTurnDedupe.get(safeSessionId, incomingType, incomingTurnId, incomingStatusKey || "");
      const existing = normalizeEventRow(existingRow);
      if (existing) {
        const nextDuplicateCount = Number(existing.duplicateCount || 0) + 1;
        const nowIso = new Date().toISOString();
        stmts.updateDuplicate.run(nextDuplicateCount, nowIso, existing.id);
        return {
          event: { ...existing, deduped: true, duplicateCount: nextDuplicateCount, lastDuplicateAt: nowIso },
          deduped: true,
          sessionId: safeSessionId
        };
      }
    }

    if (!incomingTurnId && incomingType && incomingDedupeKey) {
      const existingRow = stmts.selectMetaDedupe.get(safeSessionId, incomingType, incomingDedupeKey);
      const existing = normalizeEventRow(existingRow);
      if (existing) {
        const nextDuplicateCount = Number(existing.duplicateCount || 0) + 1;
        const nowIso = new Date().toISOString();
        stmts.updateDuplicate.run(nextDuplicateCount, nowIso, existing.id);
        return {
          event: { ...existing, deduped: true, duplicateCount: nextDuplicateCount, lastDuplicateAt: nowIso },
          deduped: true,
          sessionId: safeSessionId
        };
      }
    }

    const normalizedTurnId = String(incomingTurnId || "").trim() || undefined;
    const normalized = {
      id: String(incoming.id || crypto.randomUUID()),
      timestamp: String(incoming.timestamp || new Date().toISOString()),
      type: incomingType,
      actor: String(incoming.actor || ""),
      lane: String(incoming.lane || ""),
      summary: String(incoming.summary || ""),
      turnId: normalizedTurnId,
      deduped: false,
      duplicateCount: Number(incoming.duplicateCount || 0),
      lastDuplicateAt: incoming.lastDuplicateAt ? String(incoming.lastDuplicateAt) : undefined,
      meta: incomingMeta
    };

    stmts.insertEvent.run(
      normalized.id,
      safeSessionId,
      normalized.timestamp,
      normalized.type,
      normalized.actor,
      normalized.lane,
      normalized.summary,
      normalized.turnId || null,
      incomingStatusKey || null,
      incomingDedupeKey || null,
      JSON.stringify(normalized.meta || {}),
      0,
      Number(normalized.duplicateCount || 0),
      normalized.lastDuplicateAt || null
    );

  return { event: normalized, deduped: false, sessionId: safeSessionId };
  } catch (err) {
    console.error(`[EventLog] Failed to append event to ${safeSessionId}:`, err);
    throw err;
  }
}

function getEvents(sessionId, options = {}) {
  const safeSessionId = sanitizeSessionId(sessionId);
  try {
    ensureSessionImported(safeSessionId);
    const db = getDb();
    const stmts = getStatements(db);
    const limitRaw = Number(options?.limit || 0);
    const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(5000, limitRaw)) : 0;
    let rows = [];
    if (limit > 0) {
      // Query the most recent N rows efficiently, then return them in ascending time order.
      rows = stmts.selectLatestDescLimit.all(safeSessionId, limit) || [];
      rows = rows.slice().reverse();
    } else {
      rows = stmts.selectAllAsc.all(safeSessionId) || [];
    }
    return rows.map(normalizeEventRow).filter(Boolean);
  } catch (err) {
    console.error(`[EventLog] Failed to read events for ${safeSessionId}:`, err);
    return [];
  }
}

function getEventsAfterTimestamp(sessionId, timestamp, options = {}) {
  const safeSessionId = sanitizeSessionId(sessionId);
  try {
    ensureSessionImported(safeSessionId);
    const db = getDb();
    const stmts = getStatements(db);
    const limitRaw = Number(options?.limit || 0);
    const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(5000, limitRaw)) : 0;
    const after = String(timestamp || "");
    const rows =
      limit > 0
        ? stmts.selectAfterAscLimit.all(safeSessionId, after, limit) || []
        : stmts.selectAfterAsc.all(safeSessionId, after) || [];
    return rows.map(normalizeEventRow).filter(Boolean);
  } catch (err) {
    console.error(`[EventLog] Failed to read events after timestamp for ${safeSessionId}:`, err);
    return [];
  }
}

export { sanitizeSessionId, getSessionEventFile, createEvent, appendEvent, getEvents, getEventsAfterTimestamp };
