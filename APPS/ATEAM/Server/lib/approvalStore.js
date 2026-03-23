import crypto from "crypto";
import { getDb } from "./sqliteDb.js";

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "approved" || value === "rejected" || value === "cancelled") return value;
  return "pending";
}

function normalizePolicy(policy) {
  return String(policy || "").trim().slice(0, 120);
}

function normalizeSummary(summary) {
  return String(summary || "").trim().slice(0, 280);
}

function normalizeRequestedBy(requestedBy) {
  return String(requestedBy || "").trim().slice(0, 80);
}

export function createApprovalStore() {
  const db = getDb();

  const insertStmt = db.prepare(
    `INSERT INTO approvals (
      id, created_ts, status, requested_by, policy, summary, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const updateStatusStmt = db.prepare("UPDATE approvals SET status = ? WHERE id = ?");
  const selectStmt = db.prepare("SELECT * FROM approvals WHERE id = ? LIMIT 1");
  const listStmt = db.prepare("SELECT * FROM approvals ORDER BY created_ts DESC LIMIT ?");
  const listByStatusStmt = db.prepare("SELECT * FROM approvals WHERE status = ? ORDER BY created_ts DESC LIMIT ?");

  function rowToApproval(row) {
    if (!row) return null;
    let payload = {};
    try {
      const parsed = JSON.parse(String(row.payload_json || "{}"));
      payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {}
    return {
      id: String(row.id),
      createdTs: String(row.created_ts),
      status: String(row.status),
      requestedBy: String(row.requested_by || ""),
      policy: String(row.policy || ""),
      summary: String(row.summary || ""),
      payload
    };
  }

  function create({ policy, summary, requestedBy, payload }) {
    const id = `apr_${crypto.randomUUID()}`;
    const createdTs = new Date().toISOString();
    const normalizedPolicy = normalizePolicy(policy);
    const normalizedSummary = normalizeSummary(summary);
    const normalizedRequestedBy = normalizeRequestedBy(requestedBy);
    const payloadJson = JSON.stringify(payload && typeof payload === "object" ? payload : {});
    insertStmt.run(
      id,
      createdTs,
      "pending",
      normalizedRequestedBy,
      normalizedPolicy,
      normalizedSummary,
      payloadJson
    );
    return { id, createdTs, status: "pending", requestedBy: normalizedRequestedBy, policy: normalizedPolicy, summary: normalizedSummary, payload: payload && typeof payload === "object" ? payload : {} };
  }

  function setStatus(id, status) {
    const approvalId = String(id || "").trim();
    if (!approvalId) return null;
    const nextStatus = normalizeStatus(status);
    updateStatusStmt.run(nextStatus, approvalId);
    return get(approvalId);
  }

  function get(id) {
    const approvalId = String(id || "").trim();
    if (!approvalId) return null;
    return rowToApproval(selectStmt.get(approvalId));
  }

  function list({ status, limit = 50 } = {}) {
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const rows =
      normalizedStatus && normalizedStatus !== "all"
        ? listByStatusStmt.all(normalizeStatus(normalizedStatus), lim)
        : listStmt.all(lim);
    return (Array.isArray(rows) ? rows : []).map(rowToApproval).filter(Boolean);
  }

  return {
    create,
    setStatus,
    get,
    list
  };
}

