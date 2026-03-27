import crypto from "crypto";

const DEFAULT_TABLES = {
  approvals: "ateam_approvals",
  workItems: "ateam_work_items",
  workflowRuns: "ateam_workflow_runs"
};

const STAGES = ["BACKLOG", "BUILD", "QA", "REVIEW", "SHIP"];

function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeJsonParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "approved" || value === "rejected" || value === "cancelled") return value;
  return "pending";
}

function normalizePolicy(policy) {
  return safeText(policy, 120);
}

function normalizeSummary(summary) {
  return safeText(summary, 280);
}

function normalizeRequestedBy(requestedBy) {
  return safeText(requestedBy, 80);
}

function normalizeStage(stage) {
  const raw = String(stage || "").trim().toUpperCase();
  if (STAGES.includes(raw)) return raw;
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

function normalizeHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      id: safeText(entry.id || `job_history_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`, 120),
      timestamp: safeText(entry.timestamp || new Date().toISOString(), 80),
      type: safeText(entry.type || "note", 40) || "note",
      title: safeText(entry.title || "Job update", 140) || "Job update",
      detail: safeText(entry.detail || "", 400),
      actor: safeText(entry.actor || "", 80),
      stage: normalizeStage(entry.stage || ""),
      reason: safeText(entry.reason || "", 220),
      blockerReason: safeText(entry.blockerReason || "", 220)
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
    type: safeText(type, 40) || "note",
    title: safeText(title, 140) || "Job update",
    detail: safeText(detail, 400),
    actor: safeText(actor, 80),
    stage: normalizeStage(stage),
    reason: safeText(reason, 220),
    blockerReason: safeText(blockerReason, 220)
  };
}

function deriveJobStatus(stage, risk, data = {}) {
  const explicitStatus = safeText(data.status, 40).toLowerCase();
  if (["queued", "in_progress", "blocked", "review", "done", "canceled"].includes(explicitStatus)) {
    return explicitStatus;
  }
  if (Boolean(data.blocked) || safeText(data.blockerReason, 220) || safeText(data.waitingReason, 220)) {
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
  if (Boolean(data.blocked) || safeText(data.blockerReason, 220) || safeText(data.waitingReason, 220)) {
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
    id: safeText(entry.id, 120),
    entityType: "job",
    entityId: safeText(entityId, 120),
    eventType: safeText(entry.type, 40) || "updated",
    message: safeText(entry.title || entry.detail || "Job updated", 320),
    metadata: {
      actor: safeText(entry.actor, 80),
      stage: normalizeStage(entry.stage || ""),
      reason: safeText(entry.reason, 220),
      blockerReason: safeText(entry.blockerReason, 220)
    },
    createdAt: safeText(entry.timestamp, 80) || new Date().toISOString()
  }));
}

function normalizeWorkflowCategory(category) {
  const normalized = safeText(category, 80).toLowerCase();
  return normalized || "website";
}

const WORKFLOW_PHASES = [
  "intake",
  "analysis",
  "brief_approval",
  "initiation",
  "prototype_pack",
  "pack_approval",
  "handoff",
  "archived"
];

function normalizePhase(value = "") {
  const normalized = safeText(value, 40).toLowerCase();
  if (WORKFLOW_PHASES.includes(normalized)) return normalized;
  return "intake";
}

function wrapPostgresError(error, code, details = "") {
  const err = new Error(details || String(error?.message || code));
  err.code = code;
  err.cause = error;
  return err;
}

function buildTables(tableNames = {}) {
  return {
    approvals: safeText(tableNames.approvals, 120) || DEFAULT_TABLES.approvals,
    workItems: safeText(tableNames.workItems, 120) || DEFAULT_TABLES.workItems,
    workflowRuns: safeText(tableNames.workflowRuns, 120) || DEFAULT_TABLES.workflowRuns
  };
}

function quoteIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Table identifier is required.");
  const parts = raw.split(".");
  for (const part of parts) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      throw new Error(`Unsafe SQL identifier: ${raw}`);
    }
  }
  return parts.map((part) => `"${part}"`).join(".");
}

export function createPostgresCoreStores({ pool, tableNames = {}, ready } = {}) {
  if (!pool) {
    throw new Error("Postgres pool is required for core stores.");
  }

  const ensureReady = typeof ready === "function" ? ready : async () => {};
  const tables = buildTables(tableNames);
  const sqlTables = {
    approvals: quoteIdentifier(tables.approvals),
    workItems: quoteIdentifier(tables.workItems),
    workflowRuns: quoteIdentifier(tables.workflowRuns)
  };

  async function query(text, values = []) {
    await ensureReady();
    return pool.query(text, values);
  }

  function rowToApproval(row) {
    if (!row) return null;
    const payload = normalizeObject(safeJsonParse(row.payload_json, {}));
    return {
      id: safeText(row.id, 120),
      createdTs: safeText(row.created_ts, 80),
      status: safeText(row.status, 40) || "pending",
      requestedBy: safeText(row.requested_by, 80),
      policy: safeText(row.policy, 120),
      summary: safeText(row.summary, 280),
      payload
    };
  }

  const approvalStore = {
    async create({ policy, summary, requestedBy, payload } = {}) {
      const row = {
        id: `apr_${crypto.randomUUID()}`,
        created_ts: new Date().toISOString(),
        status: "pending",
        requested_by: normalizeRequestedBy(requestedBy),
        policy: normalizePolicy(policy),
        summary: normalizeSummary(summary),
        payload_json: normalizeObject(payload)
      };
      try {
        const result = await query(
          `insert into ${sqlTables.approvals} (
            id, created_ts, status, requested_by, policy, summary, payload_json
          ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)
          returning *`,
          [row.id, row.created_ts, row.status, row.requested_by, row.policy, row.summary, JSON.stringify(row.payload_json)]
        );
        return rowToApproval(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_APPROVAL_CREATE_FAILED");
      }
    },
    async setStatus(id, status) {
      const approvalId = safeText(id, 120);
      if (!approvalId) return null;
      try {
        await query(`update ${sqlTables.approvals} set status = $2 where id = $1`, [approvalId, normalizeStatus(status)]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_APPROVAL_UPDATE_FAILED");
      }
      return this.get(approvalId);
    },
    async get(id) {
      const approvalId = safeText(id, 120);
      if (!approvalId) return null;
      try {
        const result = await query(`select * from ${sqlTables.approvals} where id = $1 limit 1`, [approvalId]);
        return rowToApproval(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_APPROVAL_GET_FAILED");
      }
    },
    async list({ status, limit = 50 } = {}) {
      const lim = Math.max(1, Math.min(200, Number(limit) || 50));
      const normalizedStatus = safeText(status, 40).toLowerCase();
      try {
        const result = normalizedStatus && normalizedStatus !== "all"
          ? await query(`select * from ${sqlTables.approvals} where status = $1 order by created_ts desc limit $2`, [normalizeStatus(normalizedStatus), lim])
          : await query(`select * from ${sqlTables.approvals} order by created_ts desc limit $1`, [lim]);
        return result.rows.map(rowToApproval).filter(Boolean);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_APPROVAL_LIST_FAILED");
      }
    }
  };

  function rowToWorkItem(row) {
    if (!row) return null;
    const data = normalizeObject(safeJsonParse(row.data_json, {}));
    const history = normalizeHistory(data.history);
    const blockerReason = safeText(data.blockerReason || data.blockedReason || data.waitingReason || "", 220);
    const waitingReason = safeText(data.waitingReason || "", 220);
    const stage = safeText(row.stage, 40) || "BACKLOG";
    const risk = safeText(row.risk, 20) || "low";
    return {
      id: safeText(row.id, 120),
      createdTs: safeText(row.created_ts, 80),
      title: safeText(row.title, 120),
      objective: safeText(row.objective, 600),
      stage,
      risk,
      ownerAgentId: safeText(row.owner_agent_id, 80),
      data,
      projectId: safeText(data.projectId, 120),
      workflowRunId: safeText(data.workflowRunId, 120),
      workflowStep: safeText(data.workflowStep, 80),
      approvalId: safeText(data.approvalId, 120),
      blockerReason,
      waitingReason,
      history,
      timeline: toTimeline(history, safeText(row.id, 120)),
      jobStatus: deriveJobStatus(stage, risk, data),
      stageNarrative: deriveStageNarrative(stage, data)
    };
  }

  const seedRows = (() => {
    const now = Date.now();
    const mk = (id, stage, ageMins, blocked = false, title, objective) => ({
      id,
      created_ts: new Date(now - ageMins * 60 * 1000).toISOString(),
      title: safeText(title, 120),
      objective: safeText(objective, 400),
      stage: normalizeStage(stage),
      risk: blocked ? "medium" : "low",
      owner_agent_id: "",
      data_json: { seed: true, blocked }
    });
    return [
      mk("wi_seed_council", "BUILD", 92, false, "Build Council", "Stand up council workflow"),
      mk("wi_seed_factory", "QA", 48, false, "Factory pass", "Polish factory alignment"),
      mk("wi_seed_calendar", "REVIEW", 28, false, "Calendar polish", "Match scheduled tasks header"),
      mk("wi_seed_memory", "BACKLOG", 180, false, "Memory journal", "Seed journal entry + viewer"),
      mk("wi_seed_office", "BACKLOG", 210, false, "Office HUD", "Wire live activity feed"),
      mk("wi_seed_pipeline", "BUILD", 62, false, "Pipeline", "Connect approvals to ship stage"),
      mk("wi_seed_integrations", "REVIEW", 120, true, "Integrations", "Telegram gateway + approvals")
    ];
  })();

  let seedPromise = null;
  async function seedIfEmpty() {
    if (seedPromise) return seedPromise;
    seedPromise = (async () => {
      const countResult = await query(`select count(*)::int as count from ${sqlTables.workItems}`);
      const count = Number(countResult.rows[0]?.count || 0);
      if (count > 0) return;
      for (const row of seedRows) {
        await query(
          `insert into ${sqlTables.workItems} (
            id, created_ts, title, objective, stage, risk, owner_agent_id, data_json
          ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          on conflict (id) do nothing`,
          [row.id, row.created_ts, row.title, row.objective, row.stage, row.risk, row.owner_agent_id, JSON.stringify(row.data_json)]
        );
      }
    })();
    try {
      await seedPromise;
    } finally {
      seedPromise = null;
    }
  }

  const workItemStore = {
    async create({ title, objective, stage, risk, ownerAgentId, data } = {}) {
      await seedIfEmpty();
      const normalizedStage = normalizeStage(stage);
      const normalizedOwner = safeText(ownerAgentId, 80);
      const normalizedData = data && typeof data === "object" && !Array.isArray(data) ? { ...data } : {};
      const blockerReason = safeText(normalizedData.blockerReason || normalizedData.blockedReason || normalizedData.waitingReason || "", 220);
      normalizedData.history = normalizeHistory(normalizedData.history);
      if (!normalizedData.history.length) {
        normalizedData.history = [
          createHistoryEntry({
            type: "created",
            title: "Job created",
            detail: safeText(objective || title, 320),
            actor: normalizedOwner || "system",
            stage: normalizedStage,
            reason: safeText(normalizedData.reason || "created", 220),
            blockerReason
          })
        ];
      }
      if (blockerReason) {
        normalizedData.blockerReason = blockerReason;
        normalizedData.blocked = true;
      }
      const row = {
        id: `wi_${crypto.randomUUID()}`,
        created_ts: new Date().toISOString(),
        title: safeText(title, 120),
        objective: safeText(objective, 600),
        stage: normalizedStage,
        risk: normalizeRisk(risk),
        owner_agent_id: normalizedOwner,
        data_json: normalizedData
      };
      try {
        const result = await query(
          `insert into ${sqlTables.workItems} (
            id, created_ts, title, objective, stage, risk, owner_agent_id, data_json
          ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          returning *`,
          [row.id, row.created_ts, row.title, row.objective, row.stage, row.risk, row.owner_agent_id, JSON.stringify(row.data_json)]
        );
        return rowToWorkItem(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORK_ITEM_CREATE_FAILED");
      }
    },
    async get(id) {
      await seedIfEmpty();
      const workItemId = safeText(id, 120);
      if (!workItemId) return null;
      try {
        const result = await query(`select * from ${sqlTables.workItems} where id = $1 limit 1`, [workItemId]);
        return rowToWorkItem(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORK_ITEM_GET_FAILED");
      }
    },
    async getMany(ids = []) {
      await seedIfEmpty();
      const safeIds = Array.isArray(ids) ? ids.map((id) => safeText(id, 120)).filter(Boolean) : [];
      if (!safeIds.length) return [];
      try {
        const result = await query(`select * from ${sqlTables.workItems} where id = any($1::text[])`, [safeIds]);
        const byId = new Map(result.rows.map((row) => [safeText(row.id, 120), rowToWorkItem(row)]));
        return safeIds.map((id) => byId.get(id)).filter(Boolean);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORK_ITEM_GET_MANY_FAILED");
      }
    },
    async list({ stage, limit = 50 } = {}) {
      await seedIfEmpty();
      const lim = Math.max(1, Math.min(200, Number(limit) || 50));
      const normalizedStage = safeText(stage, 40);
      try {
        const result = normalizedStage
          ? await query(`select * from ${sqlTables.workItems} where stage = $1 order by created_ts desc limit $2`, [normalizeStage(normalizedStage), lim])
          : await query(`select * from ${sqlTables.workItems} order by created_ts desc limit $1`, [lim]);
        return result.rows.map(rowToWorkItem).filter(Boolean);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORK_ITEM_LIST_FAILED");
      }
    },
    async setStage(id, stage, { dataPatch, actor = "", reason = "" } = {}) {
      await seedIfEmpty();
      const current = await this.get(id);
      if (!current) return null;
      const nextStage = normalizeStage(stage);
      const nextData = dataPatch && typeof dataPatch === "object" && !Array.isArray(dataPatch)
        ? { ...(current.data || {}), ...dataPatch }
        : { ...(current.data || {}) };
      const blockerReason = safeText(nextData.blockerReason || nextData.blockedReason || nextData.waitingReason || "", 220);
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
            title: current.stage !== nextStage ? `Moved to ${deriveStageNarrative(nextStage, nextData)}` : blockerReason ? "Job status updated" : "Job note updated",
            detail: current.stage !== nextStage ? `${current.stage} -> ${nextStage}` : blockerReason || safeText(reason, 220),
            actor,
            stage: nextStage,
            reason: safeText(reason, 220),
            blockerReason
          })
        );
      }
      nextData.history = history.slice(-60);
      try {
        await query(`update ${sqlTables.workItems} set stage = $2, data_json = $3::jsonb where id = $1`, [
          safeText(id, 120),
          nextStage,
          JSON.stringify(nextData)
        ]);
        return this.get(id);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORK_ITEM_UPDATE_FAILED");
      }
    }
  };

  function rowToWorkflowRun(row) {
    if (!row) return null;
    return {
      id: safeText(row.id, 120),
      createdTs: safeText(row.created_ts, 80),
      updatedTs: safeText(row.updated_ts, 80),
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

  const workflowRunStore = {
    async create({
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
      const row = {
        id: `wfr_${crypto.randomUUID()}`,
        created_ts: new Date().toISOString(),
        updated_ts: new Date().toISOString(),
        phase: normalizePhase(phase),
        requested_by: safeText(requestedBy, 80) || "public",
        category: normalizeWorkflowCategory(category),
        idea: safeText(idea, 1200),
        title: safeText(title, 160),
        questions_json: normalizeArray(questions),
        answers_json: normalizeObject(answers),
        brief_json: normalizeObject(brief),
        recommended_lane: safeText(recommendedLane, 120),
        risks_json: normalizeArray(risks),
        artifacts_json: normalizeObject(artifacts),
        approvals_json: normalizeObject(approvals),
        links_json: normalizeObject(links),
        handoff_json: normalizeObject(handoff),
        meta_json: normalizeObject(meta)
      };
      try {
        const result = await query(
          `insert into ${sqlTables.workflowRuns} (
            id, created_ts, updated_ts, phase, requested_by, category, idea, title,
            questions_json, answers_json, brief_json, recommended_lane, risks_json,
            artifacts_json, approvals_json, links_json, handoff_json, meta_json
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9::jsonb, $10::jsonb, $11::jsonb, $12, $13::jsonb,
            $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb
          ) returning *`,
          [
            row.id, row.created_ts, row.updated_ts, row.phase, row.requested_by, row.category, row.idea, row.title,
            JSON.stringify(row.questions_json), JSON.stringify(row.answers_json), JSON.stringify(row.brief_json), row.recommended_lane,
            JSON.stringify(row.risks_json), JSON.stringify(row.artifacts_json), JSON.stringify(row.approvals_json),
            JSON.stringify(row.links_json), JSON.stringify(row.handoff_json), JSON.stringify(row.meta_json)
          ]
        );
        return rowToWorkflowRun(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORKFLOW_RUN_CREATE_FAILED");
      }
    },
    async get(id) {
      const workflowRunId = safeText(id, 120);
      if (!workflowRunId) return null;
      try {
        const result = await query(`select * from ${sqlTables.workflowRuns} where id = $1 limit 1`, [workflowRunId]);
        return rowToWorkflowRun(result.rows[0]);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORKFLOW_RUN_GET_FAILED");
      }
    },
    async list({ phase = "", limit = 40 } = {}) {
      const lim = Math.max(1, Math.min(200, Number(limit) || 40));
      const normalizedPhase = safeText(phase, 40).toLowerCase();
      try {
        const result = normalizedPhase
          ? await query(`select * from ${sqlTables.workflowRuns} where phase = $1 order by updated_ts desc limit $2`, [normalizePhase(normalizedPhase), lim])
          : await query(`select * from ${sqlTables.workflowRuns} order by updated_ts desc limit $1`, [lim]);
        return result.rows.map(rowToWorkflowRun).filter(Boolean);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORKFLOW_RUN_LIST_FAILED");
      }
    },
    async update(id, patch = {}) {
      const current = await this.get(id);
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
      try {
        await query(
          `update ${sqlTables.workflowRuns}
           set updated_ts = $2, phase = $3, requested_by = $4, category = $5, idea = $6, title = $7,
               questions_json = $8::jsonb, answers_json = $9::jsonb, brief_json = $10::jsonb, recommended_lane = $11,
               risks_json = $12::jsonb, artifacts_json = $13::jsonb, approvals_json = $14::jsonb,
               links_json = $15::jsonb, handoff_json = $16::jsonb, meta_json = $17::jsonb
           where id = $1`,
          [
            safeText(current.id, 120), updatedTs, next.phase, next.requestedBy, next.category, next.idea, next.title,
            JSON.stringify(next.questions), JSON.stringify(next.answers), JSON.stringify(next.brief), next.recommendedLane,
            JSON.stringify(next.risks), JSON.stringify(next.artifacts), JSON.stringify(next.approvals),
            JSON.stringify(next.links), JSON.stringify(next.handoff), JSON.stringify(next.meta)
          ]
        );
        return this.get(current.id);
      } catch (error) {
        throw wrapPostgresError(error, "POSTGRES_WORKFLOW_RUN_UPDATE_FAILED");
      }
    }
  };

  return {
    approvalStore,
    workItemStore,
    workflowRunStore,
    capability: {
      provider: "postgres",
      configured: true,
      tables
    }
  };
}
