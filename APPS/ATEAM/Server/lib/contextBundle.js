import fs from "fs/promises";
import path from "path";
import { safeTaskId } from "./threadStore.js";

const CACHE_TTL_MS = 30_000;
const RECENT_MSG_COUNT = 12;
const SUMMARY_LINE_LIMIT = 5;
const PROFILE_LINE_LIMIT = 8;
const SUMMARY_EVERY_USER_TURNS = 6;

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

function compact(text, limit = 260) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function clampLines(lines, maxLines) {
  return (Array.isArray(lines) ? lines : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function trimRecentByChars(recentThread, charCap = 4600) {
  const list = Array.isArray(recentThread) ? [...recentThread] : [];
  let total = list.reduce((sum, m) => sum + String(m.content || "").length, 0);
  while (list.length > 2 && total > charCap) {
    const first = list.shift();
    total -= String(first?.content || "").length;
  }
  return list;
}

function deterministicSummary(olderMessages) {
  const items = Array.isArray(olderMessages) ? olderMessages : [];
  if (!items.length) return [];

  const sample = items.slice(-18);
  const user = sample.filter((m) => String(m.role) === "user").map((m) => compact(m.content, 160));
  const agent = sample.filter((m) => String(m.role) === "assistant").map((m) => compact(m.content, 160));
  const lines = [];
  if (user.length) lines.push(`User focus: ${compact(user[user.length - 1], 180)}`);
  if (agent.length) lines.push(`Agent direction: ${compact(agent[agent.length - 1], 180)}`);
  if (user.length > 1) lines.push(`Earlier ask: ${compact(user[Math.max(0, user.length - 2)], 180)}`);
  if (agent.length > 1) lines.push(`Earlier response: ${compact(agent[Math.max(0, agent.length - 2)], 180)}`);
  lines.push("Keep continuity with prior context and avoid repeating already-resolved points.");
  return clampLines(lines, SUMMARY_LINE_LIMIT);
}

async function maybeLlmSummary(olderMessages) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;

  const model =
    process.env.OPENAI_MODEL_DASH_FALLBACK ||
    process.env.OPENAI_MODEL_DASH_PRIMARY ||
    process.env.OPENAI_MODEL_DASHBOARD ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const sample = olderMessages
    .slice(-24)
    .map((m) => `${m.role}${m.agent ? `/${m.agent}` : ""}: ${compact(m.content, 180)}`)
    .join("\n");

  const prompt = [
    "Summarize this conversation history for future context.",
    "Return at most 5 short lines.",
    "Focus on user goals, constraints, and unresolved items.",
    sample
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_output_tokens: 180,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: "Create compact memory summaries for dialogue systems." }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }]
          }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.output_text || "").trim();
    if (!text) return null;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    return clampLines(lines, SUMMARY_LINE_LIMIT);
  } catch {
    return null;
  }
}

function buildProfileLines({ globalMemory, taskMemory, mode }) {
  const lines = [];
  const identity = globalMemory?.identity || {};
  const persona = globalMemory?.persona || {};
  const routing = globalMemory?.routing || {};
  const notes = Array.isArray(taskMemory?.notes) ? taskMemory.notes : [];
  const pinned = Array.isArray(taskMemory?.pinned) ? taskMemory.pinned : [];

  if (identity.owner) lines.push(`Owner: ${identity.owner}`);
  if (identity.name) lines.push(`Assistant identity: ${identity.name}`);
  if (Array.isArray(persona.tone) && persona.tone.length) lines.push(`Preferred tone: ${persona.tone.join(", ")}`);
  if (routing.fallbackAgent) lines.push(`Fallback agent: ${routing.fallbackAgent}`);
  if (mode === "talk") lines.push("Talk mode priority: natural flow, concise continuity, no corporate phrasing.");
  for (const p of pinned.slice(0, 3)) lines.push(`Pinned: ${compact(p, 120)}`);
  for (const n of notes.slice(-3)) lines.push(`Note: ${compact(n, 120)}`);

  return clampLines(lines, PROFILE_LINE_LIMIT);
}

export function createContextBundleService({
  memoryDir,
  threadStore,
  taskStore,
  getGlobalMemory,
  getTaskMemory
}) {
  const summariesDir = path.join(memoryDir, "summaries");
  const cache = new Map();

  function summaryFile(taskId) {
    return path.join(summariesDir, `${safeTaskId(taskId)}.json`);
  }

  async function ensure() {
    await fs.mkdir(summariesDir, { recursive: true });
  }

  function invalidate(taskId) {
    if (!taskId) {
      cache.clear();
      return;
    }
    cache.delete(safeTaskId(taskId));
  }

  async function readSummary(taskId) {
    await ensure();
    const tid = safeTaskId(taskId);
    return readJson(summaryFile(tid), {
      threadId: tid,
      summaryLines: [],
      summarizedUserTurns: 0,
      lastMessageCount: 0,
      updatedAt: null
    });
  }

  async function writeSummary(taskId, record) {
    await ensure();
    const tid = safeTaskId(taskId);
    const next = {
      threadId: tid,
      summaryLines: clampLines(record?.summaryLines || [], SUMMARY_LINE_LIMIT),
      summarizedUserTurns: Number(record?.summarizedUserTurns || 0),
      lastMessageCount: Number(record?.lastMessageCount || 0),
      updatedAt: new Date().toISOString()
    };
    await writeJson(summaryFile(tid), next);
    return next;
  }

  async function getContextBundle({ taskId, agent, mode = "dashboard" }) {
    await ensure();
    const tid = safeTaskId(taskId);
    const revision = typeof threadStore.getThreadRevision === "function" ? threadStore.getThreadRevision(tid) : 0;
    const now = Date.now();
    const cached = cache.get(tid);
    if (cached && cached.revision === revision && cached.expiresAt > now) {
      return { ...cached.bundle, meta: { ...(cached.bundle.meta || {}), cacheHit: true } };
    }

    const [globalMemory, taskMemory, task, thread] = await Promise.all([
      getGlobalMemory(),
      getTaskMemory(tid),
      taskStore.getTask(tid),
      threadStore.getThread(tid)
    ]);

    const recentRaw = thread.slice(-RECENT_MSG_COUNT).map((msg) => ({
      role: msg.role,
      agent: msg.agent,
      content: compact(msg.content, 420),
      ts: msg.ts
    }));
    const charCap = String(mode) === "talk" ? 5200 : 4200;
    const recentThread = trimRecentByChars(recentRaw, charCap);
    const olderMessages = thread.slice(0, Math.max(0, thread.length - recentThread.length));

    let summaryRecord = await readSummary(tid);
    const userTurns = thread.filter((m) => String(m.role) === "user").length;
    const shouldRefreshSummary =
      userTurns - Number(summaryRecord.summarizedUserTurns || 0) >= SUMMARY_EVERY_USER_TURNS ||
      (olderMessages.length > 0 && (!summaryRecord.summaryLines || !summaryRecord.summaryLines.length));

    if (shouldRefreshSummary) {
      const llmSummary = await maybeLlmSummary(olderMessages);
      const summaryLines = llmSummary?.length ? llmSummary : deterministicSummary(olderMessages);
      summaryRecord = await writeSummary(tid, {
        summaryLines,
        summarizedUserTurns: userTurns,
        lastMessageCount: thread.length
      });
    }

    const rollingSummary = clampLines(summaryRecord.summaryLines, SUMMARY_LINE_LIMIT);
    const profileLines = buildProfileLines({ globalMemory, taskMemory, mode });
    const bundle = {
      taskId: tid,
      agent: String(agent || "Coach"),
      mode: String(mode || "dashboard"),
      task,
      recentThread,
      rollingSummary,
      profileLines,
      taskMemory: {
        taskId: taskMemory?.taskId || tid,
        notes: (Array.isArray(taskMemory?.notes) ? taskMemory.notes : []).slice(-8),
        pinned: (Array.isArray(taskMemory?.pinned) ? taskMemory.pinned : []).slice(-5),
        updatedAt: taskMemory?.updatedAt || null
      },
      globalMemory: {
        identity: globalMemory?.identity || {},
        persona: globalMemory?.persona || {},
        routing: globalMemory?.routing || {}
      },
      meta: {
        cacheHit: false,
        revision,
        summaryUpdatedAt: summaryRecord?.updatedAt || null
      }
    };

    cache.set(tid, {
      revision,
      expiresAt: now + CACHE_TTL_MS,
      bundle
    });

    return bundle;
  }

  return {
    ensure,
    invalidate,
    getContextBundle
  };
}
