import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { safeTaskId } from "./lib/threadStore.js";
import { createToolRegistry } from "./lib/toolRegistry.js";
import { createVoiceModule } from "./lib/voice.js";
import { createLlmAdapter, MANCHI_PROMPT_VERSION } from "./lib/llmAdapter.js";
import { createElevenLabsTts } from "./lib/elevenlabsTts.js";
import { routeAgentCommand } from "./lib/agentRouter.js";
import { createSpeechClarityAnalyze } from "./lib/speechClarity/speechClarityAnalyze.js";
import { createSpeechClarityRoutes } from "./lib/speechClarity/speechClarityRoutes.js";
import { sanitizeSessionId, createEvent, appendEvent, getEvents, getEventsAfterTimestamp } from "./lib/eventLog.js";
import { createApprovalStore } from "./lib/approvalStore.js";
import { createWorkItemStore } from "./lib/workItemStore.js";
import { planOrchestration } from "./lib/orchestrator.js";
import { createWorkflowRunStore } from "./lib/workflowRunStore.js";
import { createWorkflowService } from "./lib/workflowService.js";
import { createRepositories } from "./lib/storage/repositories.js";
import { createPrincipalScopeMiddleware, normalizeScopedResourceId } from "./lib/auth/principalScope.js";
import { createCapabilityRoutes } from "./lib/capability/routes.js";
import { capabilityError } from "./lib/capability/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotenvCandidates = [path.join(process.cwd(), ".env"), path.join(__dirname, ".env")];
for (const envPath of dotenvCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "Public");
const MEMORY_DIR = path.join(PROJECT_ROOT, "memory");
const DOCS_CATALOG = [
  {
    id: "readme",
    title: "ATEAM README",
    category: "overview",
    summary: "Current runtime, entrypoints, Mission Control surface area, and deployment assumptions.",
    relativePath: "README.md"
  },
  {
    id: "runbook",
    title: "Runbook",
    category: "operations",
    summary: "Practical startup, verification, and repo-handling guidance for operating ATEAM safely.",
    relativePath: "RUNBOOK.md"
  },
  {
    id: "architecture",
    title: "Architecture",
    category: "architecture",
    summary: "System structure, frontend/backend split, storage choices, and integration shape.",
    relativePath: "Docs/ARCHITECTURE.md"
  },
  {
    id: "migration_readiness",
    title: "Migration Readiness",
    category: "platform",
    summary: "What is ready for extraction, what is still app-coupled, and the main migration blockers.",
    relativePath: "Docs/MIGRATION_READINESS.md"
  },
  {
    id: "capability_extraction",
    title: "Capability Extraction",
    category: "platform",
    summary: "Analysis of reusable modules inside ATEAM and what still needs separation.",
    relativePath: "Docs/CAPABILITY_EXTRACTION.md"
  },
  {
    id: "extraction_roadmap",
    title: "Extraction Roadmap",
    category: "platform",
    summary: "Phased roadmap for turning ATEAM internals into reusable capabilities.",
    relativePath: "Docs/EXTRACTION_ROADMAP.md"
  },
  {
    id: "handover_baseline",
    title: "Handover Baseline",
    category: "handover",
    summary: "Current implementation baseline, guardrails, and priorities for safe evolution.",
    relativePath: "Docs/HANDOVER_PHASE0_BASELINE.md"
  },
  {
    id: "telegram_gateway",
    title: "Telegram Gateway",
    category: "integrations",
    summary: "Remote-control setup that connects Telegram long-polling to the local orchestrator and approvals.",
    relativePath: "telegram-gateway/README.md"
  }
];
const STORAGE_BACKEND = String(process.env.ATEAM_STORAGE_BACKEND || "local").trim().toLowerCase();
const AUTH_MODE = String(process.env.ATEAM_AUTH_MODE || "local").trim().toLowerCase();
const principalScopeMiddleware = createPrincipalScopeMiddleware({ mode: AUTH_MODE });
app.use(["/task", "/tasks", "/agent", "/command", "/voice", "/events", "/speech", "/capability", "/content", "/api"], principalScopeMiddleware);

const {
  backend: resolvedStorageBackend,
  threadStore,
  taskStore,
  memoryStore,
  speechClarityStore,
  contentPipelineStore
} = createRepositories({
  backend: STORAGE_BACKEND,
  memoryDir: MEMORY_DIR
});
const voice = createVoiceModule();
const toolRegistry = createToolRegistry({ taskStore, threadStore, voice });
const llmAdapter = createLlmAdapter({ mode: process.env.LLM_MODE || "auto" });
const agentLaneLocks = new Map();
const approvalStore = createApprovalStore();
const workItemStore = createWorkItemStore();
const workflowRunStore = createWorkflowRunStore();
const elevenlabsTts = createElevenLabsTts({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
  modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128",
  voiceMap: {
    male: process.env.ELEVENLABS_VOICE_MALE || "",
    female: process.env.ELEVENLABS_VOICE_FEMALE || "",
    prof: process.env.ELEVENLABS_VOICE_PROF || "",
    default: process.env.ELEVENLABS_VOICE_DEFAULT || ""
  },
  timeoutMs: Number(process.env.ELEVENLABS_TIMEOUT_MS || 20000)
});

await Promise.all([threadStore.ensure(), taskStore.ensure(), memoryStore.ensure(), contentPipelineStore.ensure()]);

const speechClarityAnalyze = createSpeechClarityAnalyze();
const speechClarityRoutes = createSpeechClarityRoutes({
  store: speechClarityStore,
  analyze: speechClarityAnalyze
});
const capabilityRoutes = createCapabilityRoutes({
  resolveScopedTaskId,
  resolveScopedSessionId,
  withScopedBody,
  handleAgentCommand,
  acquireAgentLaneLock,
  releaseAgentLaneLock,
  threadStore,
  taskStore,
  memoryStore,
  voice,
  elevenlabsTts,
  speechClarityStore,
  speechClarityAnalyze,
  createEvent,
  appendEvent,
  getEvents,
  scopeErrorResponder: scopeErrorCapability
});

const workflowService = createWorkflowService({
  workflowRunStore,
  approvalStore,
  workItemStore,
  emitEvent: ({ sessionId, type, actor, lane, summary, meta }) => {
    const event = createEvent(type, actor || "system", lane || "office", summary, meta);
    appendEvent(sanitizeSessionId(sessionId || "global_podcast"), event);
  }
});

await speechClarityStore.ensure();

const PROMPT_UPDATE_REASON = "humanize_tone_reduce_robotic_voice";
const PROMPT_UPDATE_EVENT_SESSION_ID = sanitizeSessionId(process.env.ATEAM_PROMPT_EVENT_SESSION_ID || "global_podcast");

function emitPromptUpdateEvent() {
  try {
    const summary = `Agent prompt updated: ${MANCHI_PROMPT_VERSION}`;
    const event = createEvent("agent_prompt_updated", "system", "system", summary, {
      version: MANCHI_PROMPT_VERSION,
      reason: PROMPT_UPDATE_REASON,
      dedupeKey: `agent_prompt_updated:${MANCHI_PROMPT_VERSION}`
    });
    appendEvent(PROMPT_UPDATE_EVENT_SESSION_ID, event);
  } catch (err) {
    console.error("[PromptUpdateEvent] Failed to emit agent_prompt_updated", err);
  }
}

emitPromptUpdateEvent();

function serverError(res, message, err) {
  return res.status(500).json({
    ok: false,
    error: message,
    details: err ? String(err.message || err) : null
  });
}

function badRequest(res, message, details = null) {
  return res.status(400).json({
    ok: false,
    error: String(message || "bad_request"),
    details
  });
}

function workflowError(res, err) {
  const status = Number(err?.status || 0);
  const code = String(err?.code || "workflow_error");
  const message = String(err?.message || "workflow_error");
  if (status === 404) {
    res.status(404).json({ ok: false, error: code, message });
    return true;
  }
  if (status === 409) {
    res.status(409).json({ ok: false, error: code, message });
    return true;
  }
  if (status === 400) {
    badRequest(res, code, message);
    return true;
  }
  return false;
}

function scopeError(res, err) {
  const code = String(err?.code || "");
  if (!code) return false;
  if (code === "AUTH_REQUIRED") {
    return res.status(401).json({
      ok: false,
      error: code,
      details: String(err?.details || err?.message || "auth_required")
    });
  }
  if (code === "SCOPE_FORBIDDEN") {
    return res.status(403).json({
      ok: false,
      error: code,
      details: String(err?.details || err?.message || "scope_forbidden")
    });
  }
  if (code === "SCOPE_INVALID_ID") {
    return badRequest(res, code, String(err?.details || err?.message || "invalid_scoped_resource_id"));
  }
  return false;
}

function scopeErrorCapability(res, err, envelope = null) {
  const code = String(err?.code || "");
  if (!code) return false;
  if (code === "AUTH_REQUIRED") {
    capabilityError(res, envelope, {
      status: 401,
      error: code,
      details: String(err?.details || err?.message || "auth_required"),
      code
    });
    return true;
  }
  if (code === "SCOPE_FORBIDDEN") {
    capabilityError(res, envelope, {
      status: 403,
      error: code,
      details: String(err?.details || err?.message || "scope_forbidden"),
      code
    });
    return true;
  }
  if (code === "SCOPE_INVALID_ID") {
    capabilityError(res, envelope, {
      status: 400,
      error: code,
      details: String(err?.details || err?.message || "invalid_scoped_resource_id"),
      code
    });
    return true;
  }
  return false;
}

function resolveScopedTaskId(req, rawTaskId, fallback = "global") {
  const unscoped = normalizeScopedResourceId(rawTaskId, req?.principal, { fallback });
  return safeTaskId(unscoped || fallback);
}

function resolveScopedSessionId(req, rawSessionId, fallback = "global") {
  const unscoped = normalizeScopedResourceId(rawSessionId, req?.principal, { fallback });
  return sanitizeSessionId(unscoped || fallback);
}

function withScopedBody(req, body = {}) {
  const next = body && typeof body === "object" ? { ...body } : {};
  next.taskId = resolveScopedTaskId(req, next.taskId || "global", "global");
  if (next.contextPack && typeof next.contextPack === "object") {
    const contextPack = { ...next.contextPack };
    contextPack.sessionId = resolveScopedSessionId(req, contextPack.sessionId || next.taskId, next.taskId);
    next.contextPack = contextPack;
  }
  return next;
}

function normalizeRole(role) {
  const r = String(role || "user").trim().toLowerCase();
  if (r === "assistant" || r === "system") return r;
  return "user";
}

function parseEnvFloat(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnvBool(name, fallback) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function resolveLlmOptionsByMode(mode) {
  const normalized = String(mode || "dashboard").trim().toLowerCase();
  const talk = normalized === "talk";

  const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const talkPrimary = process.env.OPENAI_MODEL_TALK_PRIMARY || process.env.OPENAI_MODEL_TALK || "gpt-4o";
  const talkFallback = process.env.OPENAI_MODEL_TALK_FALLBACK || defaultModel;
  const dashPrimary = process.env.OPENAI_MODEL_DASH_PRIMARY || process.env.OPENAI_MODEL_DASHBOARD || defaultModel;
  const dashFallback = process.env.OPENAI_MODEL_DASH_FALLBACK || defaultModel;

  return {
    primaryModel: talk ? talkPrimary : dashPrimary,
    fallbackModel: talk ? talkFallback : dashFallback,
    temperature: talk
      ? parseEnvFloat("OPENAI_TEMP_TALK", parseEnvFloat("OPENAI_TEMP_TALK_MODE", 0.9))
      : parseEnvFloat("OPENAI_TEMP_DASH", parseEnvFloat("OPENAI_TEMP_DASHBOARD", 0.55)),
    stream: talk
      ? parseEnvBool("OPENAI_STREAM_TALK", true)
      : parseEnvBool("OPENAI_STREAM_DASH", parseEnvBool("OPENAI_STREAM_DASHBOARD", false))
  };
}

function sseWrite(res, event, rawData) {
  const safe = String(rawData ?? "");
  const lines = safe.split(/\r?\n/);
  res.write(`event: ${event}\n`);
  for (const line of lines) {
    res.write(`data: ${line}\n`);
  }
  res.write("\n");
}

function compactText(text, limit = 240) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function readDocCatalogItem(entry) {
  const relativePath = String(entry?.relativePath || "").trim();
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  const body = fs.readFileSync(absolutePath, "utf8");
  const stat = fs.statSync(absolutePath);
  const excerpt = compactText(
    body
      .replace(/^#\s+/gm, "")
      .replace(/^##\s+/gm, "")
      .replace(/[`*_>#-]/g, " "),
    360
  );
  return {
    id: String(entry.id || ""),
    title: String(entry.title || entry.id || ""),
    category: String(entry.category || "reference"),
    summary: String(entry.summary || ""),
    relativePath,
    updatedTs: stat.mtime.toISOString(),
    excerpt,
    body
  };
}

function normalizeLane(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  return normalized === "talk" ? "talk" : "dashboard";
}

function resolveAgentSessionId(body = {}) {
  const contextPackSessionId = String(body?.contextPack?.sessionId || "").trim();
  if (contextPackSessionId) return sanitizeSessionId(contextPackSessionId);
  return sanitizeSessionId(safeTaskId(body?.taskId || "global"));
}

function acquireAgentLaneLock(body = {}) {
  const sessionId = resolveAgentSessionId(body);
  const lane = normalizeLane(body?.mode || body?.contextPack?.mode || "");
  const key = `${sessionId}:${lane}`;
  if (agentLaneLocks.has(key)) {
    return { acquired: false, key, sessionId, lane };
  }
  agentLaneLocks.set(key, Date.now());
  return { acquired: true, key, sessionId, lane };
}

function releaseAgentLaneLock(lock) {
  if (!lock || !lock.key) return;
  agentLaneLocks.delete(lock.key);
}

function resolveCurrentTurnId(body = {}) {
  const direct = String(body?.turnId || "").trim();
  if (direct) return direct;
  return String(body?.contextPack?.currentTurn?.turnId || "").trim();
}

function emitServerRequestCancelledEvent({ sessionId, lane, turnId = "", reason = "client_disconnect" }) {
  try {
    const summary = `Assistant request cancelled (${reason})`;
    const event = createEvent("assistant_request_cancelled", "system", "system", summary, {
      sessionId: sanitizeSessionId(sessionId || "global"),
      lane: normalizeLane(lane || ""),
      reason: String(reason || "client_disconnect"),
      turnId: String(turnId || "").trim() || undefined
    });
    appendEvent(sanitizeSessionId(sessionId || "global"), event);
  } catch (err) {
    console.error("[AgentLock] Failed to emit assistant_request_cancelled", err);
  }
}

function createAgentRequestLifecycle(req, res, lock, body = {}) {
  let completed = false;
  let closed = false;
  const turnId = resolveCurrentTurnId(body);

  const onClose = () => {
    if (completed) return;
    if (res?.writableEnded) return;
    completed = true;
    closed = true;
    releaseAgentLaneLock(lock);
    emitServerRequestCancelledEvent({
      sessionId: lock?.sessionId || "global",
      lane: lock?.lane || "dashboard",
      turnId,
      reason: "client_disconnect"
    });
  };

  // NOTE: IncomingMessage ("req") emits "close" when its readable stream ends,
  // which happens on normal requests. We only want to treat premature connection
  // termination as a cancel signal, so we listen on the response.
  res.on("close", onClose);
  req.on("aborted", onClose);
  return {
    isClosed() {
      return closed;
    },
    isCompleted() {
      return completed;
    },
    complete() {
      if (completed) return;
      completed = true;
      if (typeof res.off === "function") res.off("close", onClose);
      else res.removeListener("close", onClose);
      if (typeof req.off === "function") req.off("aborted", onClose);
      else req.removeListener("aborted", onClose);
      releaseAgentLaneLock(lock);
    }
  };
}

function sanitizeClientContextPack(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const recentConversation = (Array.isArray(raw.recentConversation) ? raw.recentConversation : [])
    .slice(-14)
    .map((entry) => ({
      role: normalizeRole(entry?.role),
      content: compactText(entry?.content, 220),
      agent: compactText(entry?.speakerLabel || entry?.agent || "", 40),
      ts: String(entry?.timestamp || "").trim() || null
    }))
    .filter((entry) => entry.content);
  const recentHighlights = (Array.isArray(raw.recentHighlights) ? raw.recentHighlights : [])
    .slice(-4)
    .map((entry) => ({
      timestamp: String(entry?.timestamp || "").trim() || null,
      summary: compactText(entry?.summary, 180)
    }))
    .filter((entry) => entry.summary);

  const activeSpeaker = raw.activeSpeaker && typeof raw.activeSpeaker === "object" ? raw.activeSpeaker : {};
  const currentTurn = raw.currentTurn && typeof raw.currentTurn === "object" ? raw.currentTurn : {};
  const lastSessionSummary = raw.lastSessionSummary && typeof raw.lastSessionSummary === "object" ? raw.lastSessionSummary : {};
  const lastClaritySummary = raw.lastClaritySummary && typeof raw.lastClaritySummary === "object" ? raw.lastClaritySummary : {};
  return {
    sessionId: compactText(raw.sessionId, 64),
    mode: compactText(raw.mode, 24),
    reviewMode: Boolean(raw.reviewMode),
    activeSpeaker: {
      speakerId: compactText(activeSpeaker.speakerId, 40),
      speakerLabel: compactText(activeSpeaker.speakerLabel, 64)
    },
    currentTurn: {
      turnId: compactText(currentTurn.turnId, 80),
      segmentId: compactText(currentTurn.segmentId, 80),
      userMessage: compactText(currentTurn.userMessage, 280),
      timestamp: String(currentTurn.timestamp || "").trim() || null
    },
    recentConversation,
    recentHighlights,
    lastChapterTitle: compactText(raw.lastChapterTitle, 120),
    analyticsKey: compactText(raw.analyticsKey, 80),
    lastSessionSummary: compactText(lastSessionSummary.summary, 220),
    lastClaritySummary: compactText(lastClaritySummary.summary, 220)
  };
}

function mergeContextBundle(baseContextBundle, contextPack) {
  if (!contextPack) return baseContextBundle;
  const baseRecent = Array.isArray(baseContextBundle?.recentThread) ? baseContextBundle.recentThread : [];
  const injected = Array.isArray(contextPack.recentConversation) ? contextPack.recentConversation : [];
  const mergedRecent = [...baseRecent, ...injected]
    .filter((msg) => msg && typeof msg === "object")
    .map((msg) => ({
      role: normalizeRole(msg.role),
      agent: compactText(msg.agent, 40),
      content: compactText(msg.content, 220),
      ts: String(msg.ts || "").trim() || null
    }))
    .filter((msg) => msg.content);

  const dedup = [];
  for (const msg of mergedRecent) {
    const prev = dedup[dedup.length - 1];
    const isAdjacentDuplicate =
      prev &&
      prev.role === msg.role &&
      prev.agent === msg.agent &&
      prev.content === msg.content &&
      String(prev.ts || "") === String(msg.ts || "");
    if (isAdjacentDuplicate) continue;
    dedup.push(msg);
  }

  const reviewMode = Boolean(contextPack.reviewMode);
  const activeSpeakerId = compactText(contextPack?.activeSpeaker?.speakerId, 40) || null;
  const activeSpeakerLabel = compactText(contextPack?.activeSpeaker?.speakerLabel, 64) || null;
  const currentTurnUserMessage = compactText(contextPack?.currentTurn?.userMessage, 280) || null;
  const lastSessionSummary = compactText(contextPack?.lastSessionSummary, 220) || null;
  const lastClaritySummary = compactText(contextPack?.lastClaritySummary, 220) || null;
  const lastChapterTitle = compactText(contextPack?.lastChapterTitle, 120) || null;
  const analyticsKey = compactText(contextPack?.analyticsKey, 80) || null;
  const highlights = (Array.isArray(contextPack?.recentHighlights) ? contextPack.recentHighlights : [])
    .map((h) => compactText(h.summary, 180))
    .filter(Boolean)
    .slice(-4);

  return {
    ...(baseContextBundle || {}),
    recentThread: dedup.slice(-16),
    clientContext: {
      reviewMode,
      activeSpeakerId,
      activeSpeakerLabel,
      currentTurnUserMessage,
      lastSessionSummary,
      lastClaritySummary,
      lastChapterTitle,
      analyticsKey,
      highlights
    }
  };
}

async function handleAgentCommand(body = {}, options = {}) {
  const taskId = safeTaskId(body.taskId || "global");
  const message = String(body.message || "").trim();
  const requestedAgent = String(body.agent || "").trim();
  const mode = String(body.mode || "dashboard").trim().toLowerCase() || "dashboard";
  const voiceStyle = String(body.voiceStyle || "male_assistant").trim();
  const llmOptions = resolveLlmOptionsByMode(mode);
  const stream = Boolean(options.stream && llmOptions.stream);

  if (!message) {
    const err = new Error("message required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  await threadStore.appendMessage(taskId, {
    role: "user",
    agent: "",
    content: message
  });

  const contextBundle = await memoryStore.getContextBundle({
    taskId,
    agent: requestedAgent || "Coach",
    mode
  });
  const sanitizedContextPack = sanitizeClientContextPack(body?.contextPack);
  const mergedContextBundle = mergeContextBundle(contextBundle, sanitizedContextPack);

  const routed = await routeAgentCommand({
    taskId,
    agent: requestedAgent,
    message,
    mode,
    voiceStyle,
    llmOptions: { ...llmOptions, stream },
    onToken: typeof options.onToken === "function" ? options.onToken : null,
    contextBundle: mergedContextBundle,
    toolRegistry,
    llmAdapter
  });

  await threadStore.appendMessage(taskId, {
    role: "assistant",
    agent: routed.agent,
    content: routed.reply
  });

  await memoryStore.saveTaskMemory(taskId, {
    lastIntent: routed.intent,
    lastMood: routed.mood,
    lastAgent: routed.agent,
    lastMode: mode
  });

  const updatedThread = await threadStore.getThread(taskId);

  return {
    ok: true,
    taskId,
    agent: routed.agent,
    reply: routed.reply,
    mood: routed.mood,
    intent: routed.intent,
    modelUsed: routed.modelUsed || "",
    fallbackUsed: Boolean(routed.fallbackUsed),
    route: routed.route,
    updatedThread
  };
}

app.get("/health", async (req, res) => {
  const talkOpts = resolveLlmOptionsByMode("talk");
  const dashboardOpts = resolveLlmOptionsByMode("dashboard");
  const ttsState = elevenlabsTts.getConfigState();
  res.json({
    ok: true,
    mode: llmAdapter.mode,
    projectRoot: PROJECT_ROOT,
    memoryDir: MEMORY_DIR,
    llmAdapter: llmAdapter.mode,
    config: {
      auth: {
        mode: AUTH_MODE
      },
      storage: {
        backend: resolvedStorageBackend
      },
      llm: {
        streamTalk: Boolean(talkOpts.stream),
        streamDashboard: Boolean(dashboardOpts.stream),
        talkPrimary: String(talkOpts.primaryModel || ""),
        talkFallback: String(talkOpts.fallbackModel || ""),
        dashboardPrimary: String(dashboardOpts.primaryModel || ""),
        dashboardFallback: String(dashboardOpts.fallbackModel || "")
      },
      voice: {
        provider: ttsState.provider,
        ttsConfigured: ttsState.configured,
        availableProfiles: ttsState.availableProfiles || []
      }
    },
    tools: toolRegistry.listTools()
  });
});

app.get("/task/thread/:taskId", async (req, res) => {
  try {
    const taskId = resolveScopedTaskId(req, req.params.taskId || "global", "global");
    const thread = await threadStore.getThread(taskId);
    res.json({ ok: true, taskId, thread });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_get_thread", err);
  }
});

app.post("/task/thread", async (req, res) => {
  try {
    const taskId = resolveScopedTaskId(req, req.body?.taskId || "global", "global");
    const content = String(req.body?.content || req.body?.message || "").trim();
    const role = normalizeRole(req.body?.role);
    const agent = String(req.body?.agent || "").trim();

    if (!content) return badRequest(res, "content required");

    await threadStore.appendMessage(taskId, { role, agent, content });
    const thread = await threadStore.getThread(taskId);
    res.json({ ok: true, taskId, thread });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_append_thread_message", err);
  }
});

app.post("/task/update", async (req, res) => {
  try {
    const taskId = resolveScopedTaskId(req, req.body?.taskId || "global", "global");
    const status = String(req.body?.status || "").trim().toLowerCase();
    const decisionNote = String(req.body?.decisionNote || "").trim();

    if (!status) return badRequest(res, "status required");

    const task = await taskStore.updateTask(taskId, {
      status,
      decisionNote
    });

    await threadStore.appendMessage(taskId, {
      role: "system",
      agent: "System",
      content: `Task status updated to ${status}${decisionNote ? `: ${decisionNote}` : ""}`
    });

    res.json({ ok: true, task });
  } catch (err) {
    if (err.code === "INVALID_STATUS") {
      return badRequest(res, "invalid status", { allowedStatuses: err.allowedStatuses || [] });
    }
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_update_task", err);
  }
});

app.get("/tasks", async (req, res) => {
  // UI route + API route share "/tasks". When the browser navigates here, we want the Mission Control shell
  // (index.html). When JS fetches tasks, we want JSON. Use request headers to distinguish.
  const accept = String(req.headers.accept || "");
  const fetchDest = String(req.headers["sec-fetch-dest"] || "");
  const wantsHtml = fetchDest === "document" || accept.includes("text/html") || accept.includes("application/xhtml+xml");
  if (wantsHtml) {
    return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  }
  try {
    const store = await taskStore.listTasks();
    res.json({ ok: true, ...store });
  } catch (err) {
    serverError(res, "failed_to_list_tasks", err);
  }
});

app.get("/task/status/:taskId", async (req, res) => {
  try {
    const taskId = resolveScopedTaskId(req, req.params.taskId || "global", "global");
    const task = await taskStore.getTask(taskId);
    res.json({ ok: true, taskId, status: task.status, updatedAt: task.updatedAt, task });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_get_task_status", err);
  }
});

// Content Pipeline (Una Labs Output)
app.get("/content/pipeline", async (req, res) => {
  try {
    const store = await contentPipelineStore.listStore();
    res.json({ ok: true, store });
  } catch (err) {
    serverError(res, "failed_to_get_content_pipeline", err);
  }
});

app.post("/content/radar", async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const summary = String(req.body?.summary || "").trim();
    const source = String(req.body?.source || "").trim();
    const url = String(req.body?.url || "").trim();
    if (!title) return badRequest(res, "title required");
    const signal = await contentPipelineStore.addSignal({ title, summary, source, url });
    res.json({ ok: true, signal });
  } catch (err) {
    if (err.code === "INVALID_SIGNAL") {
      return badRequest(res, "invalid_signal", err.message);
    }
    serverError(res, "failed_to_add_radar_signal", err);
  }
});

app.post("/content/scout", async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const rationale = String(req.body?.rationale || "").trim();
    const signalIds = Array.isArray(req.body?.signalIds) ? req.body.signalIds : [];
    if (!title) return badRequest(res, "title required");
    const topic = await contentPipelineStore.addTopic({ title, rationale, signalIds });
    res.json({ ok: true, topic });
  } catch (err) {
    if (err.code === "INVALID_TOPIC") {
      return badRequest(res, "invalid_topic", err.message);
    }
    serverError(res, "failed_to_add_scout_topic", err);
  }
});

app.post("/content/draft", async (req, res) => {
  try {
    const draft = await contentPipelineStore.addDraft({
      topicId: String(req.body?.topicId || "").trim(),
      topicTitle: String(req.body?.topicTitle || "").trim(),
      hook: String(req.body?.hook || "").trim(),
      explanation: String(req.body?.explanation || "").trim(),
      insight: String(req.body?.insight || "").trim(),
      cta: String(req.body?.cta || "").trim(),
      status: String(req.body?.status || "").trim(),
      scheduledFor: String(req.body?.scheduledFor || "").trim()
    });
    res.json({ ok: true, draft });
  } catch (err) {
    if (err.code === "INVALID_DRAFT" || err.code === "INVALID_DRAFT_STATUS") {
      return badRequest(res, "invalid_draft", err.message);
    }
    serverError(res, "failed_to_add_quill_draft", err);
  }
});

app.post("/content/draft/:draftId", async (req, res) => {
  try {
    const draftId = String(req.params.draftId || "").trim();
    if (!draftId) return badRequest(res, "draftId required");
    const patch = req.body && typeof req.body === "object" ? req.body : {};
    const updated = await contentPipelineStore.updateDraft(draftId, patch);
    res.json({ ok: true, draft: updated });
  } catch (err) {
    if (err.code === "DRAFT_NOT_FOUND") {
      return res.status(404).json({ ok: false, error: "draft_not_found" });
    }
    if (err.code === "INVALID_DRAFT_STATUS" || err.code === "INVALID_DRAFT") {
      return badRequest(res, "invalid_draft", err.message);
    }
    serverError(res, "failed_to_update_draft", err);
  }
});

app.post("/agent/command", async (req, res) => {
  let body;
  try {
    body = withScopedBody(req, req.body || {});
  } catch (err) {
    if (scopeError(res, err)) return;
    return badRequest(res, "invalid_request_scope");
  }
  const lock = acquireAgentLaneLock(body);
  if (!lock.acquired) {
    return res.status(409).json({
      ok: false,
      error: "request_in_flight",
      sessionId: lock.sessionId,
      lane: lock.lane
    });
  }
  const lifecycle = createAgentRequestLifecycle(req, res, lock, body);
  try {
    const result = await handleAgentCommand(body);
    if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
    res.json(result);
  } catch (err) {
    if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
    if (err.code === "BAD_REQUEST") {
      return badRequest(res, err.message);
    }
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_run_agent_command", err);
  } finally {
    lifecycle.complete();
  }
});

app.post("/agent/command/stream", async (req, res) => {
  let body;
  try {
    body = withScopedBody(req, req.body || {});
  } catch (err) {
    if (scopeError(res, err)) return;
    return badRequest(res, "invalid_request_scope");
  }
  const lock = acquireAgentLaneLock(body);
  if (!lock.acquired) {
    return res.status(409).json({
      ok: false,
      error: "request_in_flight",
      sessionId: lock.sessionId,
      lane: lock.lane
    });
  }
  const lifecycle = createAgentRequestLifecycle(req, res, lock, body);
  try {
    if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const result = await handleAgentCommand(body, {
      stream: true,
      onToken: (token) => {
        if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
        try {
          sseWrite(res, "token", token);
        } catch {}
      }
    });

    if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
    sseWrite(res, "done", result.reply || "");
    res.end();
  } catch (err) {
    if (lifecycle.isCompleted() || lifecycle.isClosed() || res.writableEnded || res.destroyed) return;
    if (err.code === "BAD_REQUEST") {
      sseWrite(res, "error", err.message);
      res.end();
      return;
    }
    if (scopeError(res, err)) {
      sseWrite(res, "error", String(err?.message || "scope_error"));
      res.end();
      return;
    }
    sseWrite(res, "error", String(err?.message || err));
    res.end();
  } finally {
    lifecycle.complete();
  }
});

// Backward compatibility for older frontend calls.
app.post("/command", async (req, res) => {
  let scoped;
  try {
    scoped = withScopedBody(req, req.body || {});
  } catch (err) {
    if (scopeError(res, err)) return;
    return badRequest(res, "invalid_request_scope");
  }
  const lock = acquireAgentLaneLock(scoped);
  if (!lock.acquired) {
    return res.status(409).json({
      ok: false,
      error: "request_in_flight",
      sessionId: lock.sessionId,
      lane: lock.lane
    });
  }
  try {
    const body = scoped || {};
    const result = await handleAgentCommand({
      taskId: body.taskId,
      message: body.message,
      agent: body.agent,
      mode: body.mode || "dashboard"
    });
    res.json(result);
  } catch (err) {
    if (err.code === "BAD_REQUEST") {
      return badRequest(res, err.message);
    }
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_run_legacy_command", err);
  } finally {
    releaseAgentLaneLock(lock);
  }
});

app.post("/voice/speak", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const profile = String(req.body?.profile || "").trim().toLowerCase();
    if (!text) return badRequest(res, "text required");
    if (!["male", "female", "prof"].includes(profile)) {
      return badRequest(res, "profile must be one of male,female,prof");
    }

    const output = await elevenlabsTts.synthesize({ text, profile });
    res.setHeader("Content-Type", output.contentType || "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(output.audioBuffer);
  } catch (err) {
    console.error("[/voice/speak] Error:", {
      error: err?.error,
      details: err?.details,
      message: err?.message,
      status: err?.status
    });
    const status = Number(err?.status || 502);
    const safeStatus = status === 400 || status === 503 ? status : 502;
    res.status(safeStatus).json({
      ok: false,
      error: String(err?.error || "voice_speak_failed"),
      details: String(err?.details || err?.message || "unknown_error")
    });
  }
});

app.get("/voice/capabilities", async (req, res) => {
  const ttsState = elevenlabsTts.getConfigState();
  res.json({
    ok: true,
    capabilities: {
      ...voice.getCapabilities(),
      synthesis: {
        available: ttsState.configured,
        provider: ttsState.provider,
        modelId: ttsState.modelId,
        outputFormat: ttsState.outputFormat,
        profilesConfigured: ttsState.profilesConfigured,
        allProfilesConfigured: ttsState.allProfilesConfigured,
        availableProfiles: ttsState.availableProfiles || []
      }
    }
  });
});

app.get("/api/docs", async (req, res) => {
  try {
    const docs = DOCS_CATALOG.map((entry) => {
      const item = readDocCatalogItem(entry);
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        relativePath: item.relativePath,
        updatedTs: item.updatedTs,
        excerpt: item.excerpt
      };
    });
    res.json({ ok: true, docs });
  } catch (err) {
    serverError(res, "failed_to_list_docs", err);
  }
});

app.get("/api/docs/:docId", async (req, res) => {
  try {
    const docId = String(req.params.docId || "").trim();
    const entry = DOCS_CATALOG.find((item) => String(item.id || "").trim() === docId);
    if (!entry) {
      return res.status(404).json({ ok: false, error: "doc_not_found" });
    }
    const doc = readDocCatalogItem(entry);
    res.json({ ok: true, doc });
  } catch (err) {
    serverError(res, "failed_to_get_doc", err);
  }
});

// Event log endpoints
app.get("/events/:sessionId", async (req, res) => {
  try {
    const safeSessionId = resolveScopedSessionId(req, req.params.sessionId, "global");
    const after = String(req.query?.after || req.query?.since || "").trim();
    const typesRaw = String(req.query?.types || "").trim();
    const limit = Math.max(0, Number(req.query?.limit || 0));

    let events = after
      ? getEventsAfterTimestamp(safeSessionId, after, { limit })
      : getEvents(safeSessionId, { limit });
    if (typesRaw) {
      const types = new Set(
        typesRaw
          .split(",")
          .map((t) => String(t || "").trim())
          .filter(Boolean)
      );
      if (types.size) {
        events = events.filter((event) => types.has(String(event?.type || "")));
      }
    }
    res.json({ ok: true, sessionId: safeSessionId, events });
  } catch (err) {
    if (scopeError(res, err)) return;
    res.status(500).json({ ok: false, error: "failed_to_fetch_events" });
  }
});

app.post("/events/:sessionId", async (req, res) => {
  try {
    const safeSessionId = resolveScopedSessionId(req, req.params.sessionId, "global");
    const { type, actor, lane, summary, meta } = req.body || {};

    if (!type || !actor || !lane) {
      return res.status(400).json({ ok: false, error: "missing_required_fields" });
    }

    const event = createEvent(type, actor, lane, summary, meta);
    const { event: storedEvent, deduped } = appendEvent(safeSessionId, event);
    res.json({ ok: true, sessionId: safeSessionId, event: storedEvent, deduped });
  } catch (err) {
    if (scopeError(res, err)) return;
    res.status(500).json({ ok: false, error: "failed_to_log_event" });
  }
});

// Mission Control (API-only endpoints; do not collide with SPA routes)
app.get("/api/workflow/runs", async (req, res) => {
  try {
    const phase = String(req.query?.phase || "").trim();
    const limit = Math.max(1, Math.min(120, Number(req.query?.limit || 40)));
    const runs = workflowService.listRuns({ phase, limit });
    res.json({ ok: true, runs });
  } catch (err) {
    serverError(res, "failed_to_list_workflow_runs", err);
  }
});

app.post("/api/workflow/runs", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");
    const run = workflowService.startRun({
      idea: body.idea,
      category: body.category,
      requestedBy: String(body.actor || body.requestedBy || "public").trim() || "public",
      sessionId,
      meta: body.meta && typeof body.meta === "object" ? body.meta : {}
    });
    res.status(201).json({ ok: true, run });
  } catch (err) {
    if (scopeError(res, err)) return;
    if (workflowError(res, err)) return;
    serverError(res, "failed_to_start_workflow_run", err);
  }
});

app.get("/api/workflow/runs/:runId", async (req, res) => {
  try {
    const run = workflowService.getRun(String(req.params.runId || "").trim());
    res.json({ ok: true, run });
  } catch (err) {
    if (workflowError(res, err)) return;
    serverError(res, "failed_to_get_workflow_run", err);
  }
});

app.post("/api/workflow/runs/:runId/answers", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");
    const run = workflowService.captureAnswers(String(req.params.runId || "").trim(), {
      answers: body.answers,
      actor: String(body.actor || body.requestedBy || "public").trim() || "public",
      sessionId
    });
    res.json({ ok: true, run });
  } catch (err) {
    if (scopeError(res, err)) return;
    if (workflowError(res, err)) return;
    serverError(res, "failed_to_save_workflow_answers", err);
  }
});

app.post("/api/workflow/runs/:runId/approve", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");
    const run = workflowService.approveRun(String(req.params.runId || "").trim(), {
      gate: body.gate,
      decision: body.decision || body.status,
      actor: String(body.actor || body.requestedBy || "operator").trim() || "operator",
      sessionId
    });
    res.json({ ok: true, run });
  } catch (err) {
    if (scopeError(res, err)) return;
    if (workflowError(res, err)) return;
    serverError(res, "failed_to_apply_workflow_decision", err);
  }
});

app.post("/api/workflow/runs/:runId/generate-pack", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");
    const run = workflowService.generatePack(String(req.params.runId || "").trim(), {
      actor: String(body.actor || body.requestedBy || "operator").trim() || "operator",
      sessionId
    });
    res.json({ ok: true, run });
  } catch (err) {
    if (scopeError(res, err)) return;
    if (workflowError(res, err)) return;
    serverError(res, "failed_to_generate_workflow_pack", err);
  }
});

app.post("/api/orchestrator/plan", async (req, res) => {
  try {
    const input = req.body && typeof req.body === "object" ? req.body : {};
    const output = planOrchestration(input);
    res.json({ ok: true, output });
  } catch (err) {
    serverError(res, "failed_to_plan_orchestration", err);
  }
});

app.get("/api/approvals", async (req, res) => {
  try {
    const status = String(req.query?.status || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 50)));
    const approvals = approvalStore.list({ status: status || undefined, limit });
    res.json({ ok: true, approvals });
  } catch (err) {
    serverError(res, "failed_to_list_approvals", err);
  }
});

app.post("/api/approvals", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const policy = String(body.policy || "").trim();
    const summary = String(body.summary || "").trim();
    const requestedBy = String(body.requestedBy || body.requested_by || "system").trim();
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");

    if (!policy) return badRequest(res, "policy required");
    if (!summary) return badRequest(res, "summary required");

    const approval = approvalStore.create({ policy, summary, requestedBy, payload });
    const event = createEvent("approval_requested", requestedBy || "system", "system", summary, {
      approvalId: approval.id,
      policy,
      status: approval.status,
      payload
    });
    appendEvent(sessionId, event);

    res.json({ ok: true, approval, sessionId, event });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_create_approval", err);
  }
});

app.post("/api/approvals/:approvalId/decision", async (req, res) => {
  try {
    const approvalId = String(req.params.approvalId || "").trim();
    if (!approvalId) return badRequest(res, "approvalId required");

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const decision = String(body.decision || body.status || "").trim().toLowerCase();
    const actor = String(body.actor || body.requestedBy || "user").trim();
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");

    if (!decision) return badRequest(res, "decision required");

    const updated = approvalStore.setStatus(approvalId, decision);
    if (!updated) return res.status(404).json({ ok: false, error: "approval_not_found" });

    const event = createEvent("approval_decision", actor || "user", "system", `Approval ${decision}`, {
      approvalId,
      decision,
      policy: updated.policy
    });
    appendEvent(sessionId, event);

    res.json({ ok: true, approval: updated, sessionId, event });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_decide_approval", err);
  }
});

// Work Items API (Factory truth)
app.get("/api/work-items", async (req, res) => {
  try {
    const stage = String(req.query?.stage || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 50)));
    const items = workItemStore.list({ stage: stage || undefined, limit });
    res.json({ ok: true, items });
  } catch (err) {
    serverError(res, "failed_to_list_work_items", err);
  }
});

app.post("/api/work-items", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const title = String(body.title || "").trim();
    const objective = String(body.objective || "").trim();
    const stage = String(body.stage || "").trim();
    const risk = String(body.risk || "").trim();
    const ownerAgentId = String(body.owner_agent_id || body.ownerAgentId || "").trim();
    const data = body.data && typeof body.data === "object" ? body.data : {};

    const requestedBy = String(body.actor || body.requestedBy || "user").trim() || "user";
    const reason = String(body.reason || "created").trim();
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");

    if (!title) return badRequest(res, "title required");

    const item = workItemStore.create({ title, objective, stage, risk, ownerAgentId, data });

    const event = createEvent("state_snapshot", requestedBy, "factory", `Work item created: ${item.title}`, {
      source: { kind: "api", actor: requestedBy },
      targets: { page: "factory", workItemId: item.id },
      severity: "info",
      data: { stage: item.stage, reason }
    });
    appendEvent(sessionId, event);

    // If created straight into SHIP, create approval gate (no outbound automation).
    if (String(item.stage || "").toUpperCase() === "SHIP") {
      const approval = approvalStore.create({
        policy: "factory_ship",
        summary: `Ship work item: ${item.title}`,
        requestedBy: requestedBy || "system",
        payload: { workItemId: item.id, stage: item.stage, title: item.title, objective: item.objective }
      });
      const approvalEvent = createEvent("approval_requested", requestedBy || "system", "system", approval.summary, {
        source: { kind: "api", actor: requestedBy },
        targets: { page: "factory", workItemId: item.id, approvalId: approval.id },
        severity: "info",
        data: { approvalId: approval.id, policy: approval.policy, status: approval.status, payload: approval.payload }
      });
      appendEvent(sessionId, approvalEvent);
      // Persist link back onto the work item record.
      const updated = workItemStore.setStage(item.id, item.stage, { dataPatch: { approvalId: approval.id } });
      return res.json({ ok: true, item: updated || item, sessionId, event, approval, approvalEvent });
    }

    res.json({ ok: true, item, sessionId, event });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_create_work_item", err);
  }
});

app.post("/api/work-items/:workItemId/stage", async (req, res) => {
  try {
    const workItemId = String(req.params.workItemId || "").trim();
    if (!workItemId) return badRequest(res, "workItemId required");

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const stage = String(body.stage || "").trim();
    if (!stage) return badRequest(res, "stage required");

    const actor = String(body.actor || body.requestedBy || "user").trim() || "user";
    const reason = String(body.reason || "stage_update").trim();
    const sessionId = resolveScopedSessionId(req, body.sessionId || body.session_id || "global_podcast", "global_podcast");

    const current = workItemStore.get(workItemId);
    if (!current) return res.status(404).json({ ok: false, error: "work_item_not_found" });

    const updated = workItemStore.setStage(workItemId, stage);
    if (!updated) return res.status(500).json({ ok: false, error: "failed_to_update_stage" });

    const event = createEvent("decision", actor, "factory", `Stage: ${updated.stage}`, {
      source: { kind: "api", actor },
      targets: { page: "factory", workItemId: updated.id },
      severity: "info",
      data: { fromStage: current.stage, toStage: updated.stage, reason }
    });
    appendEvent(sessionId, event);

    // Approval gate when entering SHIP.
    if (String(updated.stage || "").toUpperCase() === "SHIP") {
      const existingApprovalId = String(updated.data?.approvalId || "").trim();
      const existingApproval = existingApprovalId ? approvalStore.get(existingApprovalId) : null;
      if (!existingApproval || String(existingApproval.status || "") !== "pending") {
        const approval = approvalStore.create({
          policy: "factory_ship",
          summary: `Ship work item: ${updated.title}`,
          requestedBy: actor || "system",
          payload: { workItemId: updated.id, stage: updated.stage, title: updated.title, objective: updated.objective }
        });
        const approvalEvent = createEvent("approval_requested", actor || "system", "system", approval.summary, {
          source: { kind: "api", actor },
          targets: { page: "factory", workItemId: updated.id, approvalId: approval.id },
          severity: "info",
          data: { approvalId: approval.id, policy: approval.policy, status: approval.status, payload: approval.payload }
        });
        appendEvent(sessionId, approvalEvent);
        const relinked = workItemStore.setStage(updated.id, updated.stage, { dataPatch: { approvalId: approval.id } });
        return res.json({ ok: true, item: relinked || updated, sessionId, event, approval, approvalEvent });
      }
    }

    res.json({ ok: true, item: updated, sessionId, event });
  } catch (err) {
    if (scopeError(res, err)) return;
    serverError(res, "failed_to_update_work_item_stage", err);
  }
});

app.use("/speech", speechClarityRoutes);
app.use("/capability", capabilityRoutes);

app.use(express.static(PUBLIC_DIR));

app.use((req, res) => {
  if (req.method === "GET") {
    return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  }
  res.status(404).json({ ok: false, error: "route_not_found" });
});

app.listen(PORT, () => {
  console.log(`ATEAM local server running on http://localhost:${PORT}`);
  console.log(`Project root: ${PROJECT_ROOT}`);
  console.log(`Memory dir: ${MEMORY_DIR}`);
});
