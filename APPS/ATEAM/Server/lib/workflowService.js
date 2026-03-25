import {
  buildWorkflowBrief,
  buildWorkflowHandoff,
  buildWorkflowPack,
  buildWorkflowQuestions,
  buildWorkflowRisks,
  buildWorkflowWorkItems,
  normalizeWorkflowCategory,
  getWorkflowCategoryPreset
} from "./workflowEngine.js";

function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeAnswers(rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) return {};
  return Object.entries(rawAnswers).reduce((acc, [key, value]) => {
    const safeKey = safeText(key, 60);
    const safeValue = safeText(value, 400);
    if (safeKey && safeValue) acc[safeKey] = safeValue;
    return acc;
  }, {});
}

function ensureApprovalState(approvals = {}) {
  return approvals && typeof approvals === "object" && !Array.isArray(approvals) ? { ...approvals } : {};
}

function ensureLinks(links = {}) {
  return links && typeof links === "object" && !Array.isArray(links) ? { ...links } : {};
}

function createError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function createWorkflowService({
  workflowRunStore,
  approvalStore,
  workItemStore,
  emitEvent
}) {
  function logEvent(sessionId, type, actor, summary, meta = {}) {
    if (typeof emitEvent !== "function") return;
    emitEvent({
      sessionId,
      type,
      actor,
      lane: "office",
      summary,
      meta
    });
  }

  function getRunOrThrow(runId) {
    const run = workflowRunStore.get(runId);
    if (!run) throw createError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found.", 404);
    return run;
  }

  function startRun({ idea, category, requestedBy = "public", sessionId = "global_podcast", meta = {} }) {
    const safeIdea = safeText(idea, 1200);
    if (safeIdea.length < 12) {
      throw createError("INVALID_WORKFLOW_IDEA", "Share a bit more detail so ATEAM can shape the run.");
    }
    const normalizedCategory = normalizeWorkflowCategory(category, safeIdea);
    const preset = getWorkflowCategoryPreset(normalizedCategory);
    const questions = buildWorkflowQuestions({ idea: safeIdea, category: normalizedCategory });

    const run = workflowRunStore.create({
      phase: "analysis",
      requestedBy,
      category: normalizedCategory,
      idea: safeIdea,
      title: "",
      questions,
      recommendedLane: preset.recommendedLane,
      meta
    });

    logEvent(sessionId, "workflow_run_started", requestedBy, `Workflow run started for ${safeIdea.slice(0, 80)}`, {
      workflowRunId: run.id,
      category: normalizedCategory,
      recommendedLane: preset.recommendedLane
    });

    return run;
  }

  function captureAnswers(runId, { answers, actor = "public", sessionId = "global_podcast" }) {
    const run = getRunOrThrow(runId);
    const mergedAnswers = {
      ...(run.answers || {}),
      ...normalizeAnswers(answers)
    };
    const brief = buildWorkflowBrief({
      idea: run.idea,
      category: run.category,
      answers: mergedAnswers,
      runId: run.id
    });
    const risks = buildWorkflowRisks({
      brief,
      answers: mergedAnswers,
      category: run.category
    });

    const approvals = ensureApprovalState(run.approvals);
    let approvalId = safeText(approvals?.brief?.approvalId, 120);
    if (!approvalId) {
      const approval = approvalStore.create({
        policy: "workflow_brief",
        summary: `Approve brief for ${brief.title}`,
        requestedBy: actor,
        payload: {
          workflowRunId: run.id,
          briefTitle: brief.title,
          recommendedLane: brief.recommendedLane
        }
      });
      approvalId = approval.id;
    }

    approvals.brief = {
      approvalId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      decidedBy: ""
    };

    const updated = workflowRunStore.update(run.id, {
      phase: "brief_approval",
      title: brief.title,
      answers: mergedAnswers,
      brief,
      recommendedLane: brief.recommendedLane,
      risks,
      approvals
    });

    logEvent(sessionId, "workflow_brief_ready", actor, `Workflow brief ready for ${brief.title}`, {
      workflowRunId: run.id,
      approvalId,
      recommendedLane: brief.recommendedLane
    });

    return updated;
  }

  function ensureLinkedWork(run) {
    const links = ensureLinks(run.links);
    const existingProjectId = safeText(links.projectId, 120);
    const existingWorkItemIds = Array.isArray(links.workItemIds) ? links.workItemIds.filter(Boolean) : [];
    if (existingProjectId && existingWorkItemIds.length) {
      return {
        projectId: existingProjectId,
        workItemIds: existingWorkItemIds
      };
    }

    const blueprint = buildWorkflowWorkItems(run);
    const createdItems = blueprint.items.map((item) =>
      workItemStore.create({
        title: item.title,
        objective: item.objective,
        stage: item.stage,
        ownerAgentId: item.ownerAgentId,
        data: item.data
      })
    );
    return {
      projectId: blueprint.projectId,
      workItemIds: createdItems.map((item) => item.id),
      ownerAgentId: blueprint.ownerAgentId
    };
  }

  function approveRun(runId, { gate, decision, actor = "operator", sessionId = "global_podcast" }) {
    const run = getRunOrThrow(runId);
    const safeGate = safeText(gate, 40).toLowerCase();
    const safeDecision = safeText(decision, 40).toLowerCase();

    if (!["brief", "pack"].includes(safeGate)) {
      throw createError("INVALID_WORKFLOW_GATE", "Approval gate must be brief or pack.");
    }
    if (!["approved", "rejected"].includes(safeDecision)) {
      throw createError("INVALID_WORKFLOW_DECISION", "Decision must be approved or rejected.");
    }

    const approvals = ensureApprovalState(run.approvals);
    const currentGate = approvals[safeGate] && typeof approvals[safeGate] === "object" ? { ...approvals[safeGate] } : {};
    const approvalId = safeText(currentGate.approvalId, 120);
    if (approvalId) {
      approvalStore.setStatus(approvalId, safeDecision);
    }

    currentGate.status = safeDecision;
    currentGate.decidedAt = new Date().toISOString();
    currentGate.decidedBy = actor;
    approvals[safeGate] = currentGate;

    const patch = { approvals };

    if (safeGate === "brief") {
      if (safeDecision === "approved") {
        const linked = ensureLinkedWork(run);
        patch.phase = "initiation";
        patch.links = {
          ...ensureLinks(run.links),
          projectId: linked.projectId,
          workItemIds: linked.workItemIds,
          ownerAgentId: linked.ownerAgentId || ensureLinks(run.links).ownerAgentId || "henry"
        };
      } else {
        patch.phase = "analysis";
      }
    }

    if (safeGate === "pack") {
      if (safeDecision === "approved") {
        patch.phase = "handoff";
        patch.handoff = {
          ...(run.handoff || {}),
          status: "ready",
          approvedAt: new Date().toISOString(),
          approvedBy: actor
        };
      } else {
        patch.phase = "initiation";
        patch.handoff = {
          ...(run.handoff || {}),
          status: "needs_revision"
        };
      }
    }

    const updated = workflowRunStore.update(run.id, patch);

    logEvent(sessionId, "workflow_approval_decision", actor, `Workflow ${safeGate} ${safeDecision}`, {
      workflowRunId: run.id,
      gate: safeGate,
      decision: safeDecision,
      approvalId
    });

    return updated;
  }

  function generatePack(runId, { actor = "operator", sessionId = "global_podcast" }) {
    const run = getRunOrThrow(runId);
    if (safeText(run.approvals?.brief?.status, 40).toLowerCase() !== "approved") {
      throw createError(
        "WORKFLOW_BRIEF_NOT_APPROVED",
        "Approve the brief before generating the prototype pack.",
        409
      );
    }

    const artifacts = buildWorkflowPack({ run });
    const handoff = buildWorkflowHandoff({
      run: {
        ...run,
        artifacts,
        phase: "pack_approval"
      }
    });

    const approvals = ensureApprovalState(run.approvals);
    let approvalId = safeText(approvals?.pack?.approvalId, 120);
    if (!approvalId) {
      const approval = approvalStore.create({
        policy: "workflow_pack",
        summary: `Approve pack for ${run.brief?.title || run.title || "workflow run"}`,
        requestedBy: actor,
        payload: {
          workflowRunId: run.id,
          packTitle: artifacts?.mockup?.title || ""
        }
      });
      approvalId = approval.id;
    }

    approvals.pack = {
      approvalId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      decidedBy: ""
    };

    const updated = workflowRunStore.update(run.id, {
      phase: "pack_approval",
      artifacts,
      handoff: {
        ...handoff,
        status: "pending_pack_approval"
      },
      approvals
    });

    logEvent(sessionId, "workflow_pack_generated", actor, `Workflow pack generated for ${run.brief?.title || run.title || "workflow run"}`, {
      workflowRunId: run.id,
      approvalId
    });

    return updated;
  }

  return {
    startRun,
    captureAnswers,
    approveRun,
    generatePack,
    getRun: getRunOrThrow,
    listRuns: ({ phase, limit } = {}) => workflowRunStore.list({ phase, limit })
  };
}
