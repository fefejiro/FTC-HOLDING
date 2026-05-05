import crypto from "crypto";
import { getDb } from "./sqliteDb.js";

const STAGES = ["BACKLOG", "BUILD", "QA", "REVIEW", "SHIP"];

function normalizeStage(stage) {
  const raw = String(stage || "").trim().toUpperCase();
  if (STAGES.includes(raw)) return raw;
  // Accept common lowercase inputs.
  const lower = String(stage || "").trim().toLowerCase();
  if (lower === "backlog") return "BACKLOG";
  if (lower === "build") return "BUILD";
  if (lower === "qa") return "QA";
  if (lower === "review") return "REVIEW";
  if (lower === "ship") return "SHIP";
  return "BACKLOG";
}

function normalizeRisk(risk) {
  const raw = String(risk || "").trim().toLowerCase();
  if (raw === "high" || raw === "medium") return raw;
  return "low";
}

function normalizeText(value, limit = 240) {
  return String(value || "").trim().slice(0, limit);
}

function safeParseJson(value) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function safeStringifyJson(value) {
  try {
    return JSON.stringify(value && typeof value === "object" ? value : {});
  } catch {
    return "{}";
  }
}

function normalizeHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      id: normalizeText(entry.id || `job_history_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`, 120),
      timestamp: normalizeText(entry.timestamp || new Date().toISOString(), 80),
      type: normalizeText(entry.type || "note", 40) || "note",
      title: normalizeText(entry.title || "Job update", 140) || "Job update",
      detail: normalizeText(entry.detail || "", 400),
      actor: normalizeText(entry.actor || "", 80),
      stage: normalizeStage(entry.stage || ""),
      reason: normalizeText(entry.reason || "", 220),
      blockerReason: normalizeText(entry.blockerReason || "", 220)
    }))
    .slice(-60);
}

function createHistoryEntry({
  type = "note",
  title = "Job update",
  detail = "",
  actor = "",
  stage = "BACKLOG",
  reason = "",
  blockerReason = ""
} = {}) {
  return {
    id: `job_history_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: normalizeText(type, 40) || "note",
    title: normalizeText(title, 140) || "Job update",
    detail: normalizeText(detail, 400),
    actor: normalizeText(actor, 80),
    stage: normalizeStage(stage),
    reason: normalizeText(reason, 220),
    blockerReason: normalizeText(blockerReason, 220)
  };
}

function deriveJobStatus(stage, risk, data = {}) {
  const explicitStatus = normalizeText(data.status, 40).toLowerCase();
  if (["queued", "in_progress", "blocked", "review", "done", "canceled"].includes(explicitStatus)) {
    return explicitStatus;
  }

  if (Boolean(data.blocked) || normalizeText(data.blockerReason, 220) || normalizeText(data.waitingReason, 220)) {
    return "blocked";
  }

  const safeRisk = String(risk || "").trim().toLowerCase();
  const normalizedStage = normalizeStage(stage);
  if (safeRisk === "high") return "blocked";
  if (normalizedStage === "BACKLOG") return "queued";
  if (normalizedStage === "BUILD") return "in_progress";
  if (normalizedStage === "QA" || normalizedStage === "REVIEW") return "review";
  if (normalizedStage === "SHIP") return "done";
  return "queued";
}

function deriveStageNarrative(stage, data = {}) {
  const normalizedStage = normalizeStage(stage);
  if (Boolean(data.blocked) || normalizeText(data.blockerReason, 220) || normalizeText(data.waitingReason, 220)) {
    return "Blocked";
  }
  if (normalizedStage === "BACKLOG") return "Queued";
  if (normalizedStage === "BUILD") return "Building";
  if (normalizedStage === "QA") return "Review";
  if (normalizedStage === "REVIEW") return "Decision";
  if (normalizedStage === "SHIP") return "Delivered";
  return "Queued";
}

function toTimeline(entries = [], entityId = "") {
  return normalizeHistory(entries).map((entry) => ({
    id: normalizeText(entry.id, 120),
    entityType: "job",
    entityId: normalizeText(entityId, 120),
    eventType: normalizeText(entry.type, 40) || "updated",
    message: normalizeText(entry.title || entry.detail || "Job updated", 320),
    metadata: {
      actor: normalizeText(entry.actor, 80),
      stage: normalizeStage(entry.stage || ""),
      reason: normalizeText(entry.reason, 220),
      blockerReason: normalizeText(entry.blockerReason, 220)
    },
    createdAt: normalizeText(entry.timestamp, 80) || new Date().toISOString()
  }));
}

export function createWorkItemStore() {
  const db = getDb();

  const insertStmt = db.prepare(
    `INSERT INTO work_items (
      id, created_ts, title, objective, stage, risk, owner_agent_id, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const updateStageStmt = db.prepare("UPDATE work_items SET stage = ?, data_json = ? WHERE id = ?");
  const selectStmt = db.prepare("SELECT * FROM work_items WHERE id = ? LIMIT 1");

  const listAllStmt = db.prepare("SELECT * FROM work_items ORDER BY created_ts DESC LIMIT ?");
  const listByStageStmt = db.prepare("SELECT * FROM work_items WHERE stage = ? ORDER BY created_ts DESC LIMIT ?");
  const countStmt = db.prepare("SELECT COUNT(*) as c FROM work_items");

  function rowToWorkItem(row) {
    if (!row) return null;
    const data = safeParseJson(row.data_json);
    const history = normalizeHistory(data.history);
    const blockerReason = normalizeText(
      data.blockerReason || data.blockedReason || data.waitingReason || "",
      220
    );
    const waitingReason = normalizeText(data.waitingReason || "", 220);
    const stage = String(row.stage || "BACKLOG");
    const risk = String(row.risk || "low");
    return {
      id: String(row.id),
      createdTs: String(row.created_ts),
      title: String(row.title || ""),
      objective: String(row.objective || ""),
      stage,
      risk,
      ownerAgentId: row.owner_agent_id ? String(row.owner_agent_id) : "",
      data,
      projectId: normalizeText(data.projectId || "", 120),
      workflowRunId: normalizeText(data.workflowRunId || "", 120),
      workflowStep: normalizeText(data.workflowStep || "", 80),
      approvalId: normalizeText(data.approvalId || "", 120),
      blockerReason,
      waitingReason,
      history,
      timeline: toTimeline(history, String(row.id)),
      jobStatus: deriveJobStatus(stage, risk, data),
      stageNarrative: deriveStageNarrative(stage, data)
    };
  }

  function seedIfEmpty() {
    const countRow = countStmt.get();
    const count = Number(countRow?.c || 0);
    if (count > 0) return;

    const now = Date.now();
    const mk = (id, stage, ageMins, blocked = false, title, objective) => ({
      id,
      stage,
      createdTs: new Date(now - ageMins * 60 * 1000).toISOString(),
      title,
      objective,
      risk: blocked ? "medium" : "low",
      ownerAgentId: "",
      data: { seed: true, blocked }
    });

    const seeds = [
      mk("wi_seed_council", "BUILD", 92, false, "Build Council", "Stand up council workflow"),
      mk("wi_seed_factory", "QA", 48, false, "Factory pass", "Polish factory alignment"),
      mk("wi_seed_calendar", "REVIEW", 28, false, "Calendar polish", "Match scheduled tasks header"),
      mk("wi_seed_memory", "BACKLOG", 180, false, "Memory journal", "Seed journal entry + viewer"),
      mk("wi_seed_office", "BACKLOG", 210, false, "Office HUD", "Wire live activity feed"),
      mk("wi_seed_pipeline", "BUILD", 62, false, "Pipeline", "Connect approvals to ship stage"),
      mk("wi_seed_integrations", "REVIEW", 120, true, "Integrations", "Telegram gateway + approvals")
    ];

    for (const item of seeds) {
      insertStmt.run(
        String(item.id),
        String(item.createdTs),
        normalizeText(item.title, 120),
        normalizeText(item.objective, 400),
        normalizeStage(item.stage),
        normalizeRisk(item.risk),
        normalizeText(item.ownerAgentId, 80),
        safeStringifyJson(item.data)
      );
    }
  }

  function create({ title, objective, stage, risk, ownerAgentId, data } = {}) {
    seedIfEmpty();
    const id = `wi_${crypto.randomUUID()}`;
    const createdTs = new Date().toISOString();
    const normalizedStage = normalizeStage(stage);
    const normalizedRisk = normalizeRisk(risk);
    const normalizedOwner = normalizeText(ownerAgentId, 80);
    const normalizedData =
      data && typeof data === "object" && !Array.isArray(data)
        ? { ...data }
        : {};
    const blockerReason = normalizeText(
      normalizedData.blockerReason || normalizedData.blockedReason || normalizedData.waitingReason || "",
      220
    );
    normalizedData.history = normalizeHistory(normalizedData.history);
    if (!normalizedData.history.length) {
      normalizedData.history = [
        createHistoryEntry({
          type: "created",
          title: "Job created",
          detail: normalizeText(objective || title, 320),
          actor: normalizedOwner || "system",
          stage: normalizedStage,
          reason: normalizeText(normalizedData.reason || "created", 220),
          blockerReason
        })
      ];
    }
    if (blockerReason) {
      normalizedData.blockerReason = blockerReason;
      normalizedData.blocked = true;
    }
    const payloadJson = safeStringifyJson(normalizedData);

    insertStmt.run(
      id,
      createdTs,
      normalizeText(title, 120),
      normalizeText(objective, 600),
      normalizedStage,
      normalizedRisk,
      normalizedOwner,
      payloadJson
    );

    return get(id);
  }

  function get(id) {
    seedIfEmpty();
    const workItemId = String(id || "").trim();
    if (!workItemId) return null;
    return rowToWorkItem(selectStmt.get(workItemId));
  }

  function getMany(ids = []) {
    seedIfEmpty();
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => get(id)).filter(Boolean);
  }

  function list({ stage, limit = 50 } = {}) {
    seedIfEmpty();
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const normalizedStage = String(stage || "").trim();
    const rows = normalizedStage
      ? listByStageStmt.all(normalizeStage(normalizedStage), lim)
      : listAllStmt.all(lim);
    return (Array.isArray(rows) ? rows : []).map(rowToWorkItem).filter(Boolean);
  }

  function setStage(id, stage, { dataPatch, actor = "", reason = "" } = {}) {
    seedIfEmpty();
    const workItemId = String(id || "").trim();
    if (!workItemId) return null;
    const current = get(workItemId);
    if (!current) return null;
    const nextStage = normalizeStage(stage);
    const nextData = dataPatch && typeof dataPatch === "object" && !Array.isArray(dataPatch)
      ? { ...(current.data || {}), ...dataPatch }
      : current.data || {};
    const blockerReason = normalizeText(
      nextData.blockerReason || nextData.blockedReason || nextData.waitingReason || "",
      220
    );
    if (blockerReason) {
      nextData.blockerReason = blockerReason;
      nextData.blocked = true;
    } else if (Object.prototype.hasOwnProperty.call(nextData, "blocked")) {
      nextData.blocked = Boolean(nextData.blocked);
    }
    const history = normalizeHistory(nextData.history || current.history);
    const shouldRecordHistory =
      current.stage !== nextStage ||
      Boolean(
        (dataPatch && typeof dataPatch === "object" && !Array.isArray(dataPatch) && (
          "blockerReason" in dataPatch ||
          "blockedReason" in dataPatch ||
          "waitingReason" in dataPatch ||
          "status" in dataPatch
        )) ||
        reason
      );
    if (shouldRecordHistory) {
      history.push(
        createHistoryEntry({
          type: current.stage !== nextStage ? "stage_changed" : "status_updated",
          title:
            current.stage !== nextStage
              ? `Moved to ${deriveStageNarrative(nextStage, nextData)}`
              : blockerReason
                ? "Job status updated"
                : "Job note updated",
          detail:
            current.stage !== nextStage
              ? `${current.stage} -> ${nextStage}`
              : blockerReason || normalizeText(reason, 220),
          actor,
          stage: nextStage,
          reason: normalizeText(reason, 220),
          blockerReason
        })
      );
    }
    nextData.history = history.slice(-60);
    updateStageStmt.run(nextStage, safeStringifyJson(nextData), workItemId);
    return get(workItemId);
  }

  return {
    create,
    get,
    getMany,
    list,
    setStage
  };
}

