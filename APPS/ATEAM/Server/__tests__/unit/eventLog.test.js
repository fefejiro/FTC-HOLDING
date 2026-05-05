import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  sanitizeSessionId,
  getSessionEventFile,
  createEvent,
  appendEvent,
  getEvents
} from "../../lib/eventLog.js";
import { resetDb } from "../../lib/sqliteDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testRoot = path.join(__dirname, "..", "__event_log_tmp__");

let previousEventLogDir = "";
let previousSqlitePath = "";
let currentCaseDir = "";

function nextCaseDir() {
  return path.join(testRoot, `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
}

describe("eventLog", () => {
  beforeAll(() => {
    previousEventLogDir = process.env.ATEAM_EVENT_LOG_DIR || "";
    previousSqlitePath = process.env.ATEAM_SQLITE_PATH || "";
    fs.mkdirSync(testRoot, { recursive: true });
  });

  beforeEach(() => {
    currentCaseDir = nextCaseDir();
    process.env.ATEAM_EVENT_LOG_DIR = currentCaseDir;
    process.env.ATEAM_SQLITE_PATH = path.join(currentCaseDir, "mission_control.test.sqlite");
    resetDb();
  });

  afterEach(() => {
    resetDb();
    if (currentCaseDir && fs.existsSync(currentCaseDir)) {
      fs.rmSync(currentCaseDir, { recursive: true, force: true });
    }
    currentCaseDir = "";
  });

  afterAll(() => {
    if (previousEventLogDir) process.env.ATEAM_EVENT_LOG_DIR = previousEventLogDir;
    else delete process.env.ATEAM_EVENT_LOG_DIR;

    if (previousSqlitePath) process.env.ATEAM_SQLITE_PATH = previousSqlitePath;
    else delete process.env.ATEAM_SQLITE_PATH;

    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  test("sanitizeSessionId blocks traversal and keeps path inside events dir", () => {
    const safe = sanitizeSessionId("../../x");
    expect(safe).toBe("______x");
    expect(sanitizeSessionId("   ")).toBe("global");
    expect(sanitizeSessionId("a/b")).toBe("a_b");
    expect(sanitizeSessionId("x".repeat(130))).toHaveLength(120);

    const filePath = getSessionEventFile("../../x");
    expect(path.dirname(filePath)).toBe(path.resolve(currentCaseDir));
    expect(path.basename(filePath)).toBe(`${safe}.json`);
  });

  test("appendEvent auto-creates event directory and persists first write", () => {
    const sessionId = "phase2_session";
    const event = createEvent("talk_turn_committed", "user", "talk", "User said hello", { turnId: "turn_1" });
    const result = appendEvent(sessionId, event);

    expect(result.sessionId).toBe(sessionId);
    expect(result.deduped).toBe(false);
    expect(result.event.id).toBe(event.id);
    expect(result.event.turnId).toBe("turn_1");
    expect(result.event.deduped).toBe(false);
    expect(result.event.duplicateCount).toBe(0);
    expect(fs.existsSync(path.resolve(currentCaseDir))).toBe(true);
    expect(fs.existsSync(path.resolve(process.env.ATEAM_SQLITE_PATH))).toBe(true);
  });

  test("append then get returns events in order", () => {
    const sessionId = "ordered_session";
    const first = createEvent("talk_turn_committed", "user", "talk", "first", { turnId: "turn_ordered" });
    const second = createEvent("assistant_response_started", "podcast", "talk", "second", { turnId: "turn_ordered" });

    appendEvent(sessionId, first);
    appendEvent(sessionId, second);

    const events = getEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(first.id);
    expect(events[1].id).toBe(second.id);
  });

  test("dedupes by session + type + meta.turnId", () => {
    const sessionId = "dedupe_session";
    const turnId = "turn_dedupe_1";

    const first = createEvent("talk_turn_committed", "user", "talk", "first", { turnId });
    const second = createEvent("talk_turn_committed", "user", "talk", "duplicate", { turnId });

    const firstResult = appendEvent(sessionId, first);
    const secondResult = appendEvent(sessionId, second);

    expect(firstResult.deduped).toBe(false);
    expect(secondResult.deduped).toBe(true);
    expect(secondResult.event.id).toBe(first.id);
    expect(secondResult.event.turnId).toBe(turnId);
    expect(secondResult.event.deduped).toBe(true);
    expect(secondResult.event.duplicateCount).toBe(1);

    const third = createEvent("assistant_response_started", "podcast", "talk", "different type", { turnId });
    const thirdResult = appendEvent(sessionId, third);
    expect(thirdResult.deduped).toBe(false);

    const events = getEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(first.id);
    expect(events[0].turnId).toBe(turnId);
    expect(events[0].deduped).toBe(true);
    expect(events[0].duplicateCount).toBe(1);
    expect(events[1].id).toBe(third.id);
    expect(events[1].turnId).toBe(turnId);
    expect(events[1].deduped).toBe(false);
  });

  test("keeps distinct status updates when statusKey differs for same turnId", () => {
    const sessionId = "status_session";
    const turnId = "turn_status_1";

    const listening = createEvent("agent_status_updated", "system", "talk", "Coach listening", {
      turnId,
      statusKey: "Coach:Listening|Podcast:Idle"
    });
    const thinking = createEvent("agent_status_updated", "system", "talk", "Podcast thinking", {
      turnId,
      statusKey: "Coach:Idle|Podcast:Thinking"
    });
    const duplicateListening = createEvent("agent_status_updated", "system", "talk", "Coach listening duplicate", {
      turnId,
      statusKey: "Coach:Listening|Podcast:Idle"
    });

    const first = appendEvent(sessionId, listening);
    const second = appendEvent(sessionId, thinking);
    const third = appendEvent(sessionId, duplicateListening);

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(false);
    expect(third.deduped).toBe(true);

    const events = getEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe("Coach listening");
    expect(events[1].summary).toBe("Podcast thinking");
    expect(events[0].duplicateCount).toBe(1);
  });

  test("dedupes non-turn events by type + meta.dedupeKey when turnId is missing", () => {
    const sessionId = "analytics_dedupe_session";
    const first = createEvent("speaker_analytics_generated", "system", "talk", "snapshot 1", {
      dedupeKey: "analytics_key_1",
      analyticsKey: "analytics_key_1",
      source: "refresh"
    });
    const duplicate = createEvent("speaker_analytics_generated", "system", "talk", "snapshot 1 duplicate", {
      dedupeKey: "analytics_key_1",
      analyticsKey: "analytics_key_1",
      source: "refresh"
    });
    const different = createEvent("speaker_analytics_generated", "system", "talk", "snapshot 2", {
      dedupeKey: "analytics_key_2",
      analyticsKey: "analytics_key_2",
      source: "refresh"
    });

    const firstResult = appendEvent(sessionId, first);
    const duplicateResult = appendEvent(sessionId, duplicate);
    const differentResult = appendEvent(sessionId, different);

    expect(firstResult.deduped).toBe(false);
    expect(duplicateResult.deduped).toBe(true);
    expect(differentResult.deduped).toBe(false);

    const events = getEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe("snapshot 1");
    expect(events[0].duplicateCount).toBe(1);
    expect(events[1].summary).toBe("snapshot 2");
  });

  test("does not dedupe non-turn events when meta.dedupeKey is missing", () => {
    const sessionId = "analytics_no_dedupe_session";
    const first = createEvent("speaker_analytics_generated", "system", "talk", "snapshot without key", {
      analyticsKey: "analytics_key_missing_dedupe_1",
      source: "refresh"
    });
    const second = createEvent("speaker_analytics_generated", "system", "talk", "snapshot without key duplicate", {
      analyticsKey: "analytics_key_missing_dedupe_1",
      source: "refresh"
    });

    const firstResult = appendEvent(sessionId, first);
    const secondResult = appendEvent(sessionId, second);
    expect(firstResult.deduped).toBe(false);
    expect(secondResult.deduped).toBe(false);

    const events = getEvents(sessionId);
    expect(events).toHaveLength(2);
  });

  test("getEvents returns empty array for missing session file", () => {
    const events = getEvents("missing_session");
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(0);
  });
});
