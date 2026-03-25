import crypto from "crypto";
import { getDb } from "./sqliteDb.js";
import { WORKFLOW_PHASES, normalizeWorkflowCategory } from "./workflowEngine.js";

function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value, fallback = "{}") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizePhase(value = "") {
  const normalized = safeText(value, 40).toLowerCase();
  if (WORKFLOW_PHASES.includes(normalized)) return normalized;
  return "intake";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function createWorkflowRunStore() {
  const db = getDb();

  const insertStmt = db.prepare(`
    INSERT INTO workflow_runs (
      id, created_ts, updated_ts, phase, requested_by, category, idea, title,
      questions_json, answers_json, brief_json, recommended_lane, risks_json,
      artifacts_json, approvals_json, links_json, handoff_json, meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectStmt = db.prepare("SELECT * FROM workflow_runs WHERE id = ? LIMIT 1");
  const listStmt = db.prepare("SELECT * FROM workflow_runs ORDER BY updated_ts DESC LIMIT ?");
  const listByPhaseStmt = db.prepare("SELECT * FROM workflow_runs WHERE phase = ? ORDER BY updated_ts DESC LIMIT ?");
  const updateStmt = db.prepare(`
    UPDATE workflow_runs
    SET updated_ts = ?, phase = ?, requested_by = ?, category = ?, idea = ?, title = ?,
        questions_json = ?, answers_json = ?, brief_json = ?, recommended_lane = ?,
        risks_json = ?, artifacts_json = ?, approvals_json = ?, links_json = ?,
        handoff_json = ?, meta_json = ?
    WHERE id = ?
  `);

  function rowToRun(row) {
    if (!row) return null;
    return {
      id: String(row.id),
      createdTs: String(row.created_ts),
      updatedTs: String(row.updated_ts),
      phase: normalizePhase(row.phase),
      requestedBy: safeText(row.requested_by, 80),
      category: normalizeWorkflowCategory(row.category),
      idea: safeText(row.idea, 1200),
      title: safeText(row.title, 160),
      questions: normalizeArray(safeJsonParse(row.questions_json, [])),
      answers: normalizeObject(safeJsonParse(row.answers_json, {})),
      brief: normalizeObject(safeJsonParse(row.brief_json, {})),
      recommendedLane: safeText(row.recommended_lane, 120),
      risks: normalizeArray(safeJsonParse(row.risks_json, [])),
      artifacts: normalizeObject(safeJsonParse(row.artifacts_json, {})),
      approvals: normalizeObject(safeJsonParse(row.approvals_json, {})),
      links: normalizeObject(safeJsonParse(row.links_json, {})),
      handoff: normalizeObject(safeJsonParse(row.handoff_json, {})),
      meta: normalizeObject(safeJsonParse(row.meta_json, {}))
    };
  }

  function create({
    phase = "intake",
    requestedBy = "public",
    category = "website",
    idea = "",
    title = "",
    questions = [],
    answers = {},
    brief = {},
    recommendedLane = "",
    risks = [],
    artifacts = {},
    approvals = {},
    links = {},
    handoff = {},
    meta = {}
  } = {}) {
    const id = `wfr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    insertStmt.run(
      id,
      now,
      now,
      normalizePhase(phase),
      safeText(requestedBy, 80) || "public",
      normalizeWorkflowCategory(category),
      safeText(idea, 1200),
      safeText(title, 160),
      safeJsonStringify(normalizeArray(questions), "[]"),
      safeJsonStringify(normalizeObject(answers)),
      safeJsonStringify(normalizeObject(brief)),
      safeText(recommendedLane, 120),
      safeJsonStringify(normalizeArray(risks), "[]"),
      safeJsonStringify(normalizeObject(artifacts)),
      safeJsonStringify(normalizeObject(approvals)),
      safeJsonStringify(normalizeObject(links)),
      safeJsonStringify(normalizeObject(handoff)),
      safeJsonStringify(normalizeObject(meta))
    );
    return get(id);
  }

  function get(id) {
    const workflowRunId = safeText(id, 120);
    if (!workflowRunId) return null;
    return rowToRun(selectStmt.get(workflowRunId));
  }

  function list({ phase = "", limit = 40 } = {}) {
    const normalizedPhase = safeText(phase, 40).toLowerCase();
    const lim = Math.max(1, Math.min(200, Number(limit) || 40));
    const rows = normalizedPhase
      ? listByPhaseStmt.all(normalizePhase(normalizedPhase), lim)
      : listStmt.all(lim);
    return (Array.isArray(rows) ? rows : []).map(rowToRun).filter(Boolean);
  }

  function update(id, patch = {}) {
    const current = get(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
      phase: normalizePhase(patch.phase ?? current.phase),
      requestedBy: safeText(patch.requestedBy ?? current.requestedBy, 80) || "public",
      category: normalizeWorkflowCategory(patch.category ?? current.category),
      idea: safeText(patch.idea ?? current.idea, 1200),
      title: safeText(patch.title ?? current.title, 160),
      questions: normalizeArray(patch.questions ?? current.questions),
      answers: normalizeObject(patch.answers ?? current.answers),
      brief: normalizeObject(patch.brief ?? current.brief),
      recommendedLane: safeText(patch.recommendedLane ?? current.recommendedLane, 120),
      risks: normalizeArray(patch.risks ?? current.risks),
      artifacts: normalizeObject(patch.artifacts ?? current.artifacts),
      approvals: normalizeObject(patch.approvals ?? current.approvals),
      links: normalizeObject(patch.links ?? current.links),
      handoff: normalizeObject(patch.handoff ?? current.handoff),
      meta: normalizeObject(patch.meta ?? current.meta)
    };
    const updatedTs = new Date().toISOString();
    updateStmt.run(
      updatedTs,
      next.phase,
      next.requestedBy,
      next.category,
      next.idea,
      next.title,
      safeJsonStringify(next.questions, "[]"),
      safeJsonStringify(next.answers),
      safeJsonStringify(next.brief),
      next.recommendedLane,
      safeJsonStringify(next.risks, "[]"),
      safeJsonStringify(next.artifacts),
      safeJsonStringify(next.approvals),
      safeJsonStringify(next.links),
      safeJsonStringify(next.handoff),
      safeJsonStringify(next.meta),
      String(current.id)
    );
    return get(current.id);
  }

  return {
    create,
    get,
    list,
    update
  };
}
