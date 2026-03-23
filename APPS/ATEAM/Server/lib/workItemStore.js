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
    return {
      id: String(row.id),
      createdTs: String(row.created_ts),
      title: String(row.title || ""),
      objective: String(row.objective || ""),
      stage: String(row.stage || "BACKLOG"),
      risk: String(row.risk || "low"),
      ownerAgentId: row.owner_agent_id ? String(row.owner_agent_id) : "",
      data: safeParseJson(row.data_json)
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
    const payloadJson = safeStringifyJson(data);

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

  function list({ stage, limit = 50 } = {}) {
    seedIfEmpty();
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const normalizedStage = String(stage || "").trim();
    const rows = normalizedStage
      ? listByStageStmt.all(normalizeStage(normalizedStage), lim)
      : listAllStmt.all(lim);
    return (Array.isArray(rows) ? rows : []).map(rowToWorkItem).filter(Boolean);
  }

  function setStage(id, stage, { dataPatch } = {}) {
    seedIfEmpty();
    const workItemId = String(id || "").trim();
    if (!workItemId) return null;
    const current = get(workItemId);
    if (!current) return null;
    const nextStage = normalizeStage(stage);
    const nextData = dataPatch && typeof dataPatch === "object" && !Array.isArray(dataPatch)
      ? { ...(current.data || {}), ...dataPatch }
      : current.data || {};
    updateStageStmt.run(nextStage, safeStringifyJson(nextData), workItemId);
    return get(workItemId);
  }

  return {
    create,
    get,
    list,
    setStage
  };
}

