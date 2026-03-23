import fs from "fs/promises";
import path from "path";

const DRAFT_STATUSES = ["draft", "pending_approval", "approved", "scheduled", "rejected"];

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  const raw = normalizeString(value).toLowerCase();
  if (DRAFT_STATUSES.includes(raw)) return raw;
  return "draft";
}

function defaultStore() {
  return {
    version: 1,
    signals: [],
    topics: [],
    drafts: [],
    updatedAt: null
  };
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

function normalizeSignal(value) {
  if (!value || typeof value !== "object") return null;
  const id = normalizeString(value.id);
  const title = normalizeString(value.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    summary: normalizeString(value.summary),
    source: normalizeString(value.source),
    url: normalizeString(value.url),
    createdAt: normalizeString(value.createdAt) || null,
    updatedAt: normalizeString(value.updatedAt) || null
  };
}

function normalizeTopic(value) {
  if (!value || typeof value !== "object") return null;
  const id = normalizeString(value.id);
  const title = normalizeString(value.title);
  if (!id || !title) return null;
  const signalIds = Array.isArray(value.signalIds)
    ? value.signalIds.map((id) => normalizeString(id)).filter(Boolean)
    : [];
  return {
    id,
    title,
    rationale: normalizeString(value.rationale),
    signalIds,
    createdAt: normalizeString(value.createdAt) || null,
    updatedAt: normalizeString(value.updatedAt) || null
  };
}

function normalizeDraft(value) {
  if (!value || typeof value !== "object") return null;
  const id = normalizeString(value.id);
  if (!id) return null;
  return {
    id,
    topicId: normalizeString(value.topicId),
    topicTitle: normalizeString(value.topicTitle),
    hook: normalizeString(value.hook),
    explanation: normalizeString(value.explanation),
    insight: normalizeString(value.insight),
    cta: normalizeString(value.cta),
    status: normalizeStatus(value.status),
    scheduledFor: normalizeString(value.scheduledFor) || null,
    createdAt: normalizeString(value.createdAt) || null,
    updatedAt: normalizeString(value.updatedAt) || null
  };
}

export function createContentPipelineStore({ memoryDir }) {
  const contentDir = path.join(memoryDir, "content_pipeline");
  const contentFile = path.join(contentDir, "pipeline.json");

  async function ensure() {
    await fs.mkdir(contentDir, { recursive: true });
    if (!(await exists(contentFile))) {
      await writeJson(contentFile, defaultStore());
    }
  }

  async function readStore() {
    await ensure();
    const raw = await readJson(contentFile, defaultStore());
    const store = defaultStore();

    if (Array.isArray(raw.signals)) {
      store.signals = raw.signals.map(normalizeSignal).filter(Boolean);
    }
    if (Array.isArray(raw.topics)) {
      store.topics = raw.topics.map(normalizeTopic).filter(Boolean);
    }
    if (Array.isArray(raw.drafts)) {
      store.drafts = raw.drafts.map(normalizeDraft).filter(Boolean);
    }

    store.updatedAt = normalizeString(raw.updatedAt) || null;
    return store;
  }

  async function writeStore(store) {
    const next = {
      ...defaultStore(),
      ...store,
      updatedAt: new Date().toISOString()
    };
    await writeJson(contentFile, next);
    return next;
  }

  async function listStore() {
    return readStore();
  }

  async function addSignal({ title, summary = "", source = "", url = "" } = {}) {
    const cleanTitle = normalizeString(title);
    if (!cleanTitle) {
      const err = new Error("signal_title_required");
      err.code = "INVALID_SIGNAL";
      throw err;
    }
    const store = await readStore();
    const now = new Date().toISOString();
    const signal = {
      id: createId("signal"),
      title: cleanTitle,
      summary: normalizeString(summary),
      source: normalizeString(source),
      url: normalizeString(url),
      createdAt: now,
      updatedAt: now
    };
    store.signals.unshift(signal);
    await writeStore(store);
    return signal;
  }

  async function addTopic({ title, rationale = "", signalIds = [] } = {}) {
    const cleanTitle = normalizeString(title);
    if (!cleanTitle) {
      const err = new Error("topic_title_required");
      err.code = "INVALID_TOPIC";
      throw err;
    }
    const store = await readStore();
    const now = new Date().toISOString();
    const topic = {
      id: createId("topic"),
      title: cleanTitle,
      rationale: normalizeString(rationale),
      signalIds: Array.isArray(signalIds)
        ? signalIds.map((id) => normalizeString(id)).filter(Boolean)
        : [],
      createdAt: now,
      updatedAt: now
    };
    store.topics.unshift(topic);
    await writeStore(store);
    return topic;
  }

  async function addDraft({
    topicId = "",
    topicTitle = "",
    hook = "",
    explanation = "",
    insight = "",
    cta = "",
    status = "draft",
    scheduledFor = null
  } = {}) {
    const cleanTopicTitle = normalizeString(topicTitle);
    const cleanHook = normalizeString(hook);
    if (!cleanTopicTitle && !cleanHook) {
      const err = new Error("draft_requires_topic_or_hook");
      err.code = "INVALID_DRAFT";
      throw err;
    }
    const store = await readStore();
    const now = new Date().toISOString();
    const draftStatus = normalizeStatus(status);
    if (!DRAFT_STATUSES.includes(draftStatus)) {
      const err = new Error("invalid_draft_status");
      err.code = "INVALID_DRAFT_STATUS";
      err.allowed = DRAFT_STATUSES;
      throw err;
    }
    const draft = {
      id: createId("draft"),
      topicId: normalizeString(topicId),
      topicTitle: cleanTopicTitle,
      hook: cleanHook,
      explanation: normalizeString(explanation),
      insight: normalizeString(insight),
      cta: normalizeString(cta),
      status: draftStatus,
      scheduledFor: normalizeString(scheduledFor) || null,
      createdAt: now,
      updatedAt: now
    };
    store.drafts.unshift(draft);
    await writeStore(store);
    return draft;
  }

  async function updateDraft(draftId, patch = {}) {
    const cleanId = normalizeString(draftId);
    if (!cleanId) {
      const err = new Error("draft_id_required");
      err.code = "INVALID_DRAFT";
      throw err;
    }
    const store = await readStore();
    const index = store.drafts.findIndex((draft) => draft.id === cleanId);
    if (index < 0) {
      const err = new Error("draft_not_found");
      err.code = "DRAFT_NOT_FOUND";
      throw err;
    }

    const prev = store.drafts[index];
    const nextStatus = patch.status ? normalizeStatus(patch.status) : prev.status;
    if (!DRAFT_STATUSES.includes(nextStatus)) {
      const err = new Error("invalid_draft_status");
      err.code = "INVALID_DRAFT_STATUS";
      err.allowed = DRAFT_STATUSES;
      throw err;
    }

    const next = {
      ...prev,
      topicId: patch.topicId !== undefined ? normalizeString(patch.topicId) : prev.topicId,
      topicTitle: patch.topicTitle !== undefined ? normalizeString(patch.topicTitle) : prev.topicTitle,
      hook: patch.hook !== undefined ? normalizeString(patch.hook) : prev.hook,
      explanation: patch.explanation !== undefined ? normalizeString(patch.explanation) : prev.explanation,
      insight: patch.insight !== undefined ? normalizeString(patch.insight) : prev.insight,
      cta: patch.cta !== undefined ? normalizeString(patch.cta) : prev.cta,
      status: nextStatus,
      scheduledFor: patch.scheduledFor !== undefined ? normalizeString(patch.scheduledFor) || null : prev.scheduledFor,
      updatedAt: new Date().toISOString()
    };

    store.drafts[index] = next;
    await writeStore(store);
    return next;
  }

  return {
    ensure,
    listStore,
    addSignal,
    addTopic,
    addDraft,
    updateDraft,
    allowedDraftStatuses: [...DRAFT_STATUSES]
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
