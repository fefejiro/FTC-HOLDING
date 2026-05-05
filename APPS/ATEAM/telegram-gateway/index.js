import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDotEnv(content = "") {
  const lines = String(content).split(/\r?\n/);
  const out = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadDotEnvIfPresent() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const parsed = parseDotEnv(content);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] == null) process.env[k] = v;
    }
  } catch (err) {
    console.warn("[telegram-gateway] Failed to read .env:", err?.message || err);
  }
}

loadDotEnvIfPresent();

const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const TELEGRAM_ALLOWED_USER_ID_RAW = String(process.env.TELEGRAM_ALLOWED_USER_ID || "").trim();
const TELEGRAM_ALLOWED_USER_ID = TELEGRAM_ALLOWED_USER_ID_RAW ? Number(TELEGRAM_ALLOWED_USER_ID_RAW) : NaN;
const TELEGRAM_ALLOWED_CHAT_ID_RAW = String(
  process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID || ""
).trim();
const TELEGRAM_ALLOWED_CHAT_ID = TELEGRAM_ALLOWED_CHAT_ID_RAW ? Number(TELEGRAM_ALLOWED_CHAT_ID_RAW) : NaN;
const ATEAM_BASE_URL = String(process.env.ATEAM_BASE_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
const TELEGRAM_POLL_TIMEOUT_SEC = Math.max(5, Math.min(60, Number(process.env.TELEGRAM_POLL_TIMEOUT_SEC || 45)));
const ATEAM_REQUEST_TIMEOUT_MS = Math.max(5000, Math.min(120000, Number(process.env.ATEAM_REQUEST_TIMEOUT_MS || 60000)));
// IMPORTANT: getUpdates is long-polling; timeout must be > poll timeout or we'll abort constantly.
const TELEGRAM_DEFAULT_REQ_TIMEOUT_MS = (TELEGRAM_POLL_TIMEOUT_SEC + 10) * 1000;
const TELEGRAM_REQUEST_TIMEOUT_MS = Math.max(
  TELEGRAM_DEFAULT_REQ_TIMEOUT_MS,
  Math.max(2000, Math.min(180000, Number(process.env.TELEGRAM_REQUEST_TIMEOUT_MS || 0) || 0))
);

function maskToken(token) {
  const raw = String(token || "");
  if (raw.length <= 10) return raw ? "***" : "";
  return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

function looksLikeTelegramToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return false;
  if (raw.toLowerCase() === "your_token") return false;
  // Typical BotFather format: <digits>:<~35 char secret>
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(raw);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error("[telegram-gateway] TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}
if (!looksLikeTelegramToken(TELEGRAM_BOT_TOKEN)) {
  console.error(
    `[telegram-gateway] TELEGRAM_BOT_TOKEN looks invalid. Expected something like "123456789:AA...". Got: "${maskToken(
      TELEGRAM_BOT_TOKEN
    )}"`
  );
  process.exit(1);
}
// Use .local so offsets never get committed (repo .gitignore already covers **/.local/).
const DATA_DIR = path.join(__dirname, ".local");
const OFFSET_FILE = path.join(DATA_DIR, "offset.json");
const ALLOWLIST_FILE = path.join(DATA_DIR, "allowlist.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readOffset() {
  try {
    if (!fs.existsSync(OFFSET_FILE)) return 0;
    const raw = fs.readFileSync(OFFSET_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const n = Number(parsed?.offset || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeOffset(offset) {
  try {
    ensureDataDir();
    fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }, null, 2));
  } catch (err) {
    console.warn("[telegram-gateway] Failed to persist offset:", err?.message || err);
  }
}

function numericIdOrNaN(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function readAllowlist() {
  try {
    if (!fs.existsSync(ALLOWLIST_FILE)) return null;
    const raw = fs.readFileSync(ALLOWLIST_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      allowedUserId: numericIdOrNaN(parsed?.allowedUserId),
      allowedChatId: numericIdOrNaN(parsed?.allowedChatId),
      linkedAt: parsed?.linkedAt ? String(parsed.linkedAt) : null
    };
  } catch (err) {
    console.warn("[telegram-gateway] Failed to read allowlist:", err?.message || err);
    return null;
  }
}

function writeAllowlist(next) {
  try {
    ensureDataDir();
    fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify(next, null, 2));
  } catch (err) {
    console.warn("[telegram-gateway] Failed to persist allowlist:", err?.message || err);
  }
}

function resolveAllowlistState() {
  const persisted = readAllowlist();
  const allowedUserId = Number.isFinite(TELEGRAM_ALLOWED_USER_ID)
    ? TELEGRAM_ALLOWED_USER_ID
    : numericIdOrNaN(persisted?.allowedUserId);
  const allowedChatId = Number.isFinite(TELEGRAM_ALLOWED_CHAT_ID)
    ? TELEGRAM_ALLOWED_CHAT_ID
    : numericIdOrNaN(persisted?.allowedChatId);

  let source = "bootstrap";
  if (Number.isFinite(TELEGRAM_ALLOWED_USER_ID) || Number.isFinite(TELEGRAM_ALLOWED_CHAT_ID)) {
    source = "environment";
  } else if (persisted && (Number.isFinite(allowedUserId) || Number.isFinite(allowedChatId))) {
    source = "persisted";
  }

  return {
    allowedUserId,
    allowedChatId,
    source,
    bootstrapMode: !Number.isFinite(allowedUserId) && !Number.isFinite(allowedChatId)
  };
}

let allowlistState = resolveAllowlistState();

if (TELEGRAM_ALLOWED_USER_ID_RAW && !Number.isFinite(TELEGRAM_ALLOWED_USER_ID)) {
  console.error("[telegram-gateway] TELEGRAM_ALLOWED_USER_ID must be numeric.");
  process.exit(1);
}
if (TELEGRAM_ALLOWED_CHAT_ID_RAW && !Number.isFinite(TELEGRAM_ALLOWED_CHAT_ID)) {
  console.error("[telegram-gateway] TELEGRAM_ALLOWED_CHAT_ID / TELEGRAM_CHAT_ID must be numeric.");
  process.exit(1);
}

async function fetchJson(url, { method = "GET", headers = {}, body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body == null ? undefined : body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = text;
      err.json = json;
      err.url = url;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function telegramUrl(method) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramApi(method, payload = null) {
  const url = telegramUrl(method);
  const body = payload ? JSON.stringify(payload) : undefined;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    timeoutMs: TELEGRAM_REQUEST_TIMEOUT_MS
  });
}

async function telegramGetMe() {
  const res = await telegramApi("getMe");
  return res?.result || null;
}

async function telegramGetWebhookInfo() {
  const res = await telegramApi("getWebhookInfo");
  return res?.result || null;
}

async function telegramDeleteWebhook({ dropPendingUpdates = true } = {}) {
  // When switching to long polling, we want to ensure a webhook isn't blocking getUpdates.
  // drop_pending_updates=true avoids replaying an old backlog into the local console.
  const res = await telegramApi("deleteWebhook", {
    drop_pending_updates: Boolean(dropPendingUpdates)
  });
  return Boolean(res?.ok);
}

async function telegramGetUpdates(offset) {
  const payload = {
    offset: offset > 0 ? offset : undefined,
    timeout: TELEGRAM_POLL_TIMEOUT_SEC,
    allowed_updates: ["message", "callback_query"],
  };
  const res = await telegramApi("getUpdates", payload);
  if (!res?.ok) return [];
  return Array.isArray(res?.result) ? res.result : [];
}

async function telegramSendMessage(chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: String(text || ""),
    parse_mode: options.parseMode || undefined,
    reply_markup: options.replyMarkup || undefined,
    disable_web_page_preview: options.disableWebPagePreview ?? true
  };
  return telegramApi("sendMessage", payload);
}

async function telegramAnswerCallbackQuery(callbackQueryId, text) {
  const payload = {
    callback_query_id: callbackQueryId,
    text: text ? String(text) : undefined,
    show_alert: false
  };
  return telegramApi("answerCallbackQuery", payload);
}

async function ateamAppendEvent(sessionId, event) {
  const url = `${ATEAM_BASE_URL}/events/${encodeURIComponent(sessionId)}`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
  });
}

async function ateamPlanOrchestration(input) {
  const url = `${ATEAM_BASE_URL}/api/orchestrator/plan`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
  });
}

async function ateamAgentCommand({ taskId, message, agent = "", mode = "talk" }) {
  const url = `${ATEAM_BASE_URL}/agent/command`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      message,
      agent,
      mode,
      contextPack: {
        sessionId: taskId
      }
    }),
    timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
  });
}

async function ateamCreateApproval({ sessionId, policy, summary, requestedBy, payload }) {
  const url = `${ATEAM_BASE_URL}/api/approvals`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      policy,
      summary,
      requestedBy,
      payload
    }),
    timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
  });
}

async function ateamDecisionApproval({ sessionId, approvalId, decision, actor }) {
  const url = `${ATEAM_BASE_URL}/api/approvals/${encodeURIComponent(approvalId)}/decision`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      decision,
      actor
    }),
    timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
  });
}

function safeString(value, limit = 4000) {
  return String(value ?? "").trim().slice(0, limit);
}

function summarizeError(err) {
  const status = Number(err?.status || 0);
  const msg = safeString(err?.message || err || "", 240);
  return status ? `${msg} (HTTP ${status})` : msg;
}

function buildRelayFailureMessage(err) {
  const status = Number(err?.status || 0);
  const msg = String(err?.message || "");
  if (msg.includes("AbortError") || msg.includes("The operation was aborted")) {
    return "ATEAM is taking longer than expected to answer right now. Please try again in a moment.";
  }
  if (status >= 500) {
    return "ATEAM hit a server error while preparing the reply. Please try again in a moment.";
  }
  if (status === 404) {
    return "ATEAM's reply route is unavailable on this machine right now. Please check the local server.";
  }
  return "I hit a relay problem talking to ATEAM. Please try again in a moment.";
}

function isAllowedTelegramSource({ fromId, chatId }) {
  return (
    (Number.isFinite(allowlistState.allowedUserId) && Number(fromId) === allowlistState.allowedUserId) ||
    (Number.isFinite(allowlistState.allowedChatId) && Number(chatId) === allowlistState.allowedChatId)
  );
}

function currentAllowlistLabel() {
  const labels = [];
  if (Number.isFinite(allowlistState.allowedUserId)) labels.push(`user=${allowlistState.allowedUserId}`);
  if (Number.isFinite(allowlistState.allowedChatId)) labels.push(`chat=${allowlistState.allowedChatId}`);
  if (!labels.length) labels.push("unlinked");
  return `${labels.join(" ")} (${allowlistState.source})`;
}

async function maybeBootstrapTelegramLink(message) {
  if (!allowlistState.bootstrapMode) return false;

  const chatId = numericIdOrNaN(message?.chat?.id);
  const userId = numericIdOrNaN(message?.from?.id);
  const chatType = String(message?.chat?.type || "").trim().toLowerCase();
  const text = safeString(message?.text || "", 240).toLowerCase();

  if (!Number.isFinite(chatId) || !Number.isFinite(userId) || chatType !== "private") {
    return false;
  }
  if (!(text.startsWith("/link") || text.startsWith("/start"))) {
    return false;
  }

  writeAllowlist({
    allowedUserId: userId,
    allowedChatId: chatId,
    linkedAt: new Date().toISOString()
  });
  allowlistState = resolveAllowlistState();

  await telegramSendMessage(
    chatId,
    "Linked this private Telegram chat to ATEAM remote control.\n" +
      `User id: ${userId}\n` +
      `Chat id: ${chatId}\n` +
      "You can now send messages here and receive replies remotely."
  );
  console.log(`[telegram-gateway] Linked private chat ${chatId} to user ${userId}.`);
  return true;
}

function buildTelegramMeta(update, messageText) {
  const from = update?.from || {};
  const chat = update?.chat || {};
  return {
    source: {
      kind: "telegram",
      userId: from?.id,
      chatId: chat?.id
    },
    threadId: "telegram",
    text: safeString(messageText, 4000),
    telegram: {
      messageId: update?.message_id,
      date: update?.date,
      from: from
        ? {
            id: from.id,
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            languageCode: from.language_code
          }
        : null,
      chat: chat
        ? {
            id: chat.id,
            type: chat.type,
            username: chat.username,
            title: chat.title
          }
        : null
    }
  };
}

function extractOrchestratorReply(output) {
  const events = Array.isArray(output?.emit_events) ? output.emit_events : [];
  const messages = events
    .filter((evt) => String(evt?.type || "") === "agent_message")
    .map((evt) => safeString(evt?.text || evt?.title || "", 4000))
    .filter(Boolean);
  if (!messages.length) return "";
  return messages[messages.length - 1];
}

function findApprovalRequests(output) {
  const events = Array.isArray(output?.emit_events) ? output.emit_events : [];
  return events.filter((evt) => String(evt?.type || "") === "approval_requested");
}

function buildApprovalKeyboard(approvalId) {
  const approve = `apv|${approvalId}|approved`;
  const reject = `apv|${approvalId}|rejected`;
  return {
    inline_keyboard: [
      [
        { text: "Approve", callback_data: approve },
        { text: "Reject", callback_data: reject }
      ]
    ]
  };
}

async function handleTelegramMessage(message) {
  if (!message?.chat?.id) return;

  const bootstrapped = await maybeBootstrapTelegramLink(message);
  if (
    !isAllowedTelegramSource({
      fromId: message?.from?.id,
      chatId: message?.chat?.id
    })
  ) {
    return;
  }

  const chatId = message.chat.id;
  const sessionId = `tg_${chatId}`;
  const text = safeString(message.text || "");
  if (!text) return;

  if (text === "/whoami") {
    await telegramSendMessage(
      chatId,
      `Allowed route: ${currentAllowlistLabel()}\n` +
        `Your user id: ${numericIdOrNaN(message?.from?.id)}\n` +
        `This chat id: ${numericIdOrNaN(message?.chat?.id)}`
    );
    return;
  }
  if (text === "/start" || text === "/help" || (bootstrapped && text === "/link")) {
    await telegramSendMessage(
      chatId,
      "ATEAM Telegram remote control is online.\n" +
        "Send a task, question, or update and I will route it through ATEAM.\n" +
        "Commands: /help, /whoami"
    );
    return;
  }

  console.log(`[telegram-gateway] IN chat=${chatId} session=${sessionId}: ${text.slice(0, 140)}`);
  try {
    await ateamAppendEvent(sessionId, {
      type: "user_message",
      actor: "telegram",
      lane: "telegram",
      summary: text,
      meta: buildTelegramMeta(message, text)
    });

    const result = await ateamAgentCommand({
      taskId: sessionId,
      message: text,
      mode: "talk"
    });

    const reply = safeString(result?.reply || "", 4000);
    if (!reply) {
      await telegramSendMessage(
        chatId,
        "ATEAM received your message but returned an empty reply. Please try again in a moment."
      );
      console.warn(`[telegram-gateway] Empty reply chat=${chatId} session=${sessionId}`);
      return;
    }

    await ateamAppendEvent(sessionId, {
      type: "agent_message",
      actor: safeString(result?.agent || "Coach", 80) || "Coach",
      lane: "telegram",
      summary: reply,
      meta: {
        source: "agent_command",
        taskId: sessionId,
        agent: result?.agent || "Coach",
        mode: "talk",
        transport: { kind: "telegram", chatId }
      }
    });
    await telegramSendMessage(chatId, reply);
    console.log(`[telegram-gateway] OUT chat=${chatId} session=${sessionId}: ${reply.slice(0, 140)}`);
  } catch (err) {
    console.warn(
      `[telegram-gateway] Message handling error chat=${chatId} session=${sessionId}: ${summarizeError(err)}`
    );
    try {
      await telegramSendMessage(chatId, buildRelayFailureMessage(err));
    } catch (sendErr) {
      console.warn(
        `[telegram-gateway] Failed to send relay error chat=${chatId} session=${sessionId}: ${summarizeError(sendErr)}`
      );
    }
  }
}

function parseApprovalCallback(data) {
  const raw = String(data || "").trim();
  const parts = raw.split("|");
  if (parts.length !== 3) return null;
  if (parts[0] !== "apv") return null;
  const approvalId = parts[1];
  const decision = parts[2];
  if (!approvalId) return null;
  if (decision !== "approved" && decision !== "rejected") return null;
  return { approvalId, decision };
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery?.message?.chat?.id;
  if (!chatId) return;
  if (
    !isAllowedTelegramSource({
      fromId: callbackQuery?.from?.id,
      chatId
    })
  ) {
    return;
  }
  const sessionId = `tg_${chatId}`;

  const parsed = parseApprovalCallback(callbackQuery?.data);
  if (!parsed) return;

  const { approvalId, decision } = parsed;
  console.log(`[telegram-gateway] CALLBACK chat=${chatId} session=${sessionId}: ${approvalId} -> ${decision}`);
  await ateamDecisionApproval({
    sessionId,
    approvalId,
    decision,
    actor: "telegram"
  });

  await telegramAnswerCallbackQuery(callbackQuery.id, decision === "approved" ? "Approved" : "Rejected");

  const { output } = await ateamPlanOrchestration({
    session_id: sessionId,
    thread_id: "telegram",
    page: "telegram",
    user_goal: `Approval ${decision}: ${approvalId}`,
    approval: { id: approvalId, decision }
  });

  const emitEvents = Array.isArray(output?.emit_events) ? output.emit_events : [];
  for (const evt of emitEvents) {
    if (!evt || typeof evt !== "object") continue;
    if (evt.type === "agent_message") {
      await ateamAppendEvent(sessionId, {
        type: "agent_message",
        actor: safeString(evt?.source?.display || evt?.source?.agent_id || "agent", 80) || "agent",
        lane: "telegram",
        summary: safeString(evt?.text || evt?.title || ""),
        meta: { ...evt, threadId: "telegram", transport: { kind: "telegram", chatId } }
      });
    }
  }

  const approvals = findApprovalRequests(output);
  for (const req of approvals) {
    const policy = safeString(req?.data?.policy || req?.policy || "manual", 120) || "manual";
    const summary = safeString(req?.text || req?.title || "Approval requested", 240) || "Approval requested";
    const requestedBy = safeString(req?.source?.display || req?.source?.agent_id || "orchestrator", 80) || "orchestrator";
    const payload =
      req?.data?.payload && typeof req.data.payload === "object" ? req.data.payload : (req?.data || {});

    const created = await ateamCreateApproval({
      sessionId,
      policy,
      summary,
      requestedBy,
      payload
    });

    const createdApprovalId = created?.approval?.id;
    if (!createdApprovalId) continue;

    const msgText = `Approval requested:\n${summary}`;
    await telegramSendMessage(chatId, msgText, { replyMarkup: buildApprovalKeyboard(createdApprovalId) });
    await ateamAppendEvent(sessionId, {
      type: "agent_message",
      actor: "telegram_gateway",
      lane: "telegram",
      summary: msgText,
      meta: {
        approvalId: createdApprovalId,
        policy,
        summary,
        threadId: "telegram",
        transport: { kind: "telegram", chatId }
      }
    });
  }

  const reply = extractOrchestratorReply(output);
  if (reply) {
    await telegramSendMessage(chatId, reply);
  }
}

async function assertAteamReachable() {
  try {
    const url = `${ATEAM_BASE_URL}/health`;
    const res = await fetchJson(url, { timeoutMs: ATEAM_REQUEST_TIMEOUT_MS });
    if (res?.ok) {
      console.log(`[telegram-gateway] Connected to ATEAM at ${ATEAM_BASE_URL}`);
      return true;
    }
  } catch (err) {
    console.warn(`[telegram-gateway] ATEAM not reachable at ${ATEAM_BASE_URL}:`, err?.message || err);
  }
  return false;
}

async function assertAteamApiReady() {
  // We rely on the Mission Control event + orchestrator endpoints.
  // If you're running a different ATEAM copy (or an older server), /health may work but these may 404.
  const checks = [
    { name: "events", url: `${ATEAM_BASE_URL}/events/gateway_probe?limit=1` },
    // Some older ATEAM copies had GET /events but not POST /events; ensure we can append events before polling.
    {
      name: "events_post",
      url: `${ATEAM_BASE_URL}/events/gateway_probe`,
      method: "POST",
      body: {
        type: "checkpoint",
        actor: "telegram_gateway",
        lane: "telegram",
        summary: "gateway probe",
        meta: { dedupeKey: "gateway_probe_post" }
      }
    },
    { name: "orchestrator", url: `${ATEAM_BASE_URL}/api/orchestrator/plan`, method: "POST", body: { page: "telegram", session_id: "gateway_probe", thread_id: "telegram" } }
  ];

  for (const check of checks) {
    try {
      if (check.method === "POST") {
        await fetchJson(check.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(check.body || {}),
          timeoutMs: ATEAM_REQUEST_TIMEOUT_MS
        });
      } else {
        await fetchJson(check.url, { timeoutMs: ATEAM_REQUEST_TIMEOUT_MS });
      }
    } catch (err) {
      const status = Number(err?.status || 0);
      const body = err?.body ? ` ${String(err.body).slice(0, 200)}` : "";
      console.error(
        `[telegram-gateway] ATEAM API check failed (${check.name}) at ${check.url}: ${err?.message || err} (HTTP ${status})${body}`
      );
      console.error(
        "[telegram-gateway] Fix: make sure you started ATEAM from the same repo copy as this gateway " +
          `(${path.resolve(__dirname, "..", "Server")}), and that it's listening on ATEAM_BASE_URL.`
      );
      return false;
    }
  }
  return true;
}

async function run() {
  await assertAteamReachable();
  const apiOk = await assertAteamApiReady();
  if (!apiOk) process.exit(1);

  try {
    const me = await telegramGetMe();
    if (me?.username) {
      console.log(`[telegram-gateway] Bot: @${me.username}`);
    }
    if (Number.isFinite(Number(me?.id)) && Number(me.id) === allowlistState.allowedUserId) {
      console.warn(
        "[telegram-gateway] WARNING: TELEGRAM_ALLOWED_USER_ID matches the bot's id. " +
          "This is usually wrong — allowlist should be YOUR Telegram user id (the human), not the bot id."
      );
    }
    const webhook = await telegramGetWebhookInfo();
    const webhookUrl = String(webhook?.url || "").trim();
    if (webhookUrl) {
      console.log(`[telegram-gateway] Webhook was set (${webhookUrl}). Disabling for long polling...`);
      const ok = await telegramDeleteWebhook({ dropPendingUpdates: true });
      console.log(`[telegram-gateway] deleteWebhook: ${ok ? "ok" : "failed"}`);
    }
  } catch (err) {
    console.warn("[telegram-gateway] Telegram preflight failed:", err?.message || err);
  }

  let offset = readOffset();
  console.log("[telegram-gateway] Starting long polling.");
  if (allowlistState.bootstrapMode) {
    console.log("[telegram-gateway] No Telegram allowlist configured. Send /link from your private chat to claim this bot.");
  } else {
    console.log(`[telegram-gateway] Allowed route: ${currentAllowlistLabel()}`);
  }
  console.log(`[telegram-gateway] ATEAM base url: ${ATEAM_BASE_URL}`);

  let backoffMs = 750;

  while (true) {
    try {
      const updates = await telegramGetUpdates(offset);
      if (updates.length) {
        for (const update of updates) {
          const updateId = Number(update?.update_id || 0);
          if (Number.isFinite(updateId) && updateId >= offset) {
            offset = updateId + 1;
            writeOffset(offset);
          }

          if (update?.message) {
            await handleTelegramMessage(update.message);
          } else if (update?.callback_query) {
            await handleCallbackQuery(update.callback_query);
          }
        }
      }
      backoffMs = 750;
    } catch (err) {
      const status = Number(err?.status || 0);
      const details = status ? ` (HTTP ${status})` : "";
      const url = err?.url ? ` ${String(err.url)}` : "";
      const body = err?.body ? ` ${String(err.body).slice(0, 300)}` : "";
      const msg = err?.message || String(err);
      console.warn("[telegram-gateway] Poll loop error:", `${msg}${details}${url}${body}`);
      await sleep(backoffMs);
      backoffMs = Math.min(15000, Math.round(backoffMs * 1.6));
    }
  }
}

run().catch((err) => {
  console.error("[telegram-gateway] Fatal error:", err);
  process.exit(1);
});
