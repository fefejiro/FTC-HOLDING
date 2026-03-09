import fs from "fs/promises";
import path from "path";
import { isDuplicateMessage, messageFingerprint } from "./dedupe.js";

export function safeTaskId(taskId) {
  const raw = String(taskId || "global").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return safe || "global";
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export function createThreadStore({ memoryDir }) {
  const threadsDir = path.join(memoryDir, "threads");
  const revisions = new Map();
  const changeListeners = new Set();

  function threadFile(taskId) {
    return path.join(threadsDir, `${safeTaskId(taskId)}.json`);
  }

  function bumpRevision(taskId) {
    const tid = safeTaskId(taskId);
    const next = (revisions.get(tid) || 0) + 1;
    revisions.set(tid, next);
    for (const listener of changeListeners) {
      try {
        listener(tid, next);
      } catch {}
    }
    return next;
  }

  function getThreadRevision(taskId) {
    const tid = safeTaskId(taskId);
    return revisions.get(tid) || 0;
  }

  function onThreadChange(listener) {
    if (typeof listener !== "function") return () => {};
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  async function ensure() {
    await ensureDir(threadsDir);
  }

  async function getThread(taskId) {
    await ensure();
    const tid = safeTaskId(taskId);
    const filePath = threadFile(tid);

    if (!(await exists(filePath))) {
      await writeJson(filePath, []);
      return [];
    }

    const data = await readJson(filePath, []);
    return Array.isArray(data) ? data : [];
  }

  async function appendMessage(taskId, msg) {
    await ensure();
    const tid = safeTaskId(taskId);
    const filePath = threadFile(tid);
    const thread = await getThread(tid);

    const normalized = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ts: new Date().toISOString(),
      role: String(msg?.role || "user").trim().toLowerCase(),
      agent: String(msg?.agent || "").trim(),
      content: String(msg?.content || "").trim()
    };

    if (!normalized.content) {
      return { appended: false, deduped: false, thread, revision: getThreadRevision(tid) };
    }

    if (isDuplicateMessage(thread, normalized)) {
      return { appended: false, deduped: true, thread, revision: getThreadRevision(tid) };
    }

    normalized.fingerprint = messageFingerprint(normalized);
    thread.push(normalized);
    await writeJson(filePath, thread);
    const revision = bumpRevision(tid);
    return { appended: true, deduped: false, thread, revision };
  }

  async function replaceThread(taskId, messages) {
    await ensure();
    const tid = safeTaskId(taskId);
    const filePath = threadFile(tid);
    const clean = Array.isArray(messages) ? messages : [];
    await writeJson(filePath, clean);
    const revision = bumpRevision(tid);
    return { thread: clean, revision };
  }

  async function listThreads() {
    await ensure();
    const entries = await fs.readdir(threadsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/i, ""));
  }

  return {
    ensure,
    getThread,
    appendMessage,
    replaceThread,
    listThreads,
    getThreadRevision,
    onThreadChange,
    safeTaskId
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
