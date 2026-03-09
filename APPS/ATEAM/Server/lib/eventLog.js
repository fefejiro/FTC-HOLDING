/**
 * Event Log for ATEAM
 * Persists all events to disk by session
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EVENTS_DIR = path.join(__dirname, "..", "..", "memory", "events");
const RENAME_RETRY_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);
const RENAME_RETRY_MAX = Math.max(0, Number(process.env.ATEAM_EVENT_LOG_RENAME_RETRIES || 4));
const RENAME_RETRY_BACKOFF_MS = Math.max(1, Number(process.env.ATEAM_EVENT_LOG_RENAME_BACKOFF_MS || 8));
const WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));

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

function sleepMsSync(ms) {
  Atomics.wait(WAIT_ARRAY, 0, 0, Math.max(0, Number(ms) || 0));
}

function isRetryableRenameError(err) {
  return Boolean(err && typeof err === "object" && RENAME_RETRY_CODES.has(String(err.code || "")));
}

function writeEventsAtomic(filePath, events) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(events, null, 2), "utf-8");
  let lastErr = null;
  for (let attempt = 0; attempt <= RENAME_RETRY_MAX; attempt += 1) {
    try {
      fs.renameSync(tmpPath, filePath);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (!isRetryableRenameError(err) || attempt >= RENAME_RETRY_MAX) break;
      sleepMsSync(RENAME_RETRY_BACKOFF_MS * (attempt + 1));
    }
  }
  if (lastErr) {
    try {
      if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
    } catch {}
    throw lastErr;
  }
}

function appendEvent(sessionId, event) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const filePath = getSessionEventFile(safeSessionId);
  try {
    const events = getEvents(safeSessionId);
    const eventWithDebug = { ...(event || {}) };
    const incomingType = String(eventWithDebug?.type || "").trim();
    const incomingTurnId = String(eventWithDebug?.turnId || eventWithDebug?.meta?.turnId || "").trim();
    const incomingStatusKey = String(eventWithDebug?.meta?.statusKey || "").trim();
    const incomingDedupeKey = String(eventWithDebug?.meta?.dedupeKey || "").trim();
    const turnBasedDedupeKey = incomingType && incomingTurnId ? `${incomingType}|turn:${incomingTurnId}|status:${incomingStatusKey}` : "";
    const fallbackDedupeKey =
      !incomingTurnId && incomingType && incomingDedupeKey ? `${incomingType}|dedupe:${incomingDedupeKey}` : "";
    eventWithDebug._dedupeKey = turnBasedDedupeKey || fallbackDedupeKey || "";

    if (incomingType && incomingTurnId) {
      const existingIndex = events.findIndex(
        (item) =>
          String(item?.type || "").trim() === incomingType &&
          String(item?.turnId || item?.meta?.turnId || "").trim() === incomingTurnId &&
          String(item?.meta?.statusKey || "").trim() === incomingStatusKey
      );
      const existing = existingIndex >= 0 ? events[existingIndex] : null;
      if (existing) {
        const nextDuplicateCount = Number(existing?.duplicateCount || 0) + 1;
        const updated = {
          ...existing,
          turnId: String(existing?.turnId || existing?.meta?.turnId || incomingTurnId).trim() || undefined,
          deduped: true,
          duplicateCount: nextDuplicateCount,
          lastDuplicateAt: new Date().toISOString(),
        };
        events[existingIndex] = updated;
        writeEventsAtomic(filePath, events);
        return { event: updated, deduped: true, sessionId: safeSessionId };
      }
    }

    if (!incomingTurnId && incomingType && incomingDedupeKey) {
      const existingIndex = events.findIndex(
        (item) => String(item?.type || "").trim() === incomingType && String(item?.meta?.dedupeKey || "").trim() === incomingDedupeKey
      );
      const existing = existingIndex >= 0 ? events[existingIndex] : null;
      if (existing) {
        const nextDuplicateCount = Number(existing?.duplicateCount || 0) + 1;
        const updated = {
          ...existing,
          turnId: String(existing?.turnId || existing?.meta?.turnId || "").trim() || undefined,
          deduped: true,
          duplicateCount: nextDuplicateCount,
          lastDuplicateAt: new Date().toISOString(),
        };
        events[existingIndex] = updated;
        writeEventsAtomic(filePath, events);
        return { event: updated, deduped: true, sessionId: safeSessionId };
      }
    }

    const normalized = {
      ...eventWithDebug,
      turnId: String(eventWithDebug?.turnId || eventWithDebug?.meta?.turnId || "").trim() || undefined,
      deduped: false,
      duplicateCount: Number(eventWithDebug?.duplicateCount || 0),
    };
    delete normalized._dedupeKey;
    events.push(normalized);
    writeEventsAtomic(filePath, events);
    return { event: normalized, deduped: false, sessionId: safeSessionId };
  } catch (err) {
    console.error(`[EventLog] Failed to append event to ${safeSessionId}:`, err);
    throw err;
  }
}

function getEvents(sessionId) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const filePath = getSessionEventFile(safeSessionId);
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const turnId = String(item.turnId || item?.meta?.turnId || "").trim();
      return {
        ...item,
        turnId: turnId || undefined,
        deduped: Boolean(item.deduped),
        duplicateCount: Number(item.duplicateCount || 0),
      };
    });
  } catch (err) {
    console.error(`[EventLog] Failed to read events for ${safeSessionId}:`, err);
    return [];
  }
}

function getEventsAfterTimestamp(sessionId, timestamp) {
  const events = getEvents(sessionId);
  return events.filter((e) => new Date(e.timestamp) > new Date(timestamp));
}

export { sanitizeSessionId, getSessionEventFile, createEvent, appendEvent, getEvents, getEventsAfterTimestamp };
