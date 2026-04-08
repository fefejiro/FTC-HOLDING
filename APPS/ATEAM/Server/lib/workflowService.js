import {
  applyWorkflowPlanPatch,
  buildWorkflowBrief,
  buildWorkflowEvaluation,
  buildWorkflowHandoff,
  buildWorkflowPack,
  buildWorkflowPlan,
  buildWorkflowQuestions,
  buildWorkflowRequest,
  buildWorkflowRisks,
  buildWorkflowWorkItems,
  getWorkflowCatalog,
  getWorkflowTemplate,
  getWorkflowCategoryPreset,
  mapWorkflowPhaseToState,
  normalizeWorkflowPlanPatch,
  normalizeWorkflowCategory,
  normalizeWorkflowState
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

function normalizeIntake(rawIntake = {}) {
  const raw = rawIntake && typeof rawIntake === "object" && !Array.isArray(rawIntake) ? rawIntake : {};
  return {
    goal: safeText(raw.goal, 260),
    context: safeText(raw.context, 360),
    desiredOutput: safeText(raw.desiredOutput, 180),
    constraints: safeText(raw.constraints, 260),
    nonGoals: safeText(raw.nonGoals, 260)
  };
}

function mergeIntakeWithTemplate(intake = {}, template = null) {
  const normalized = normalizeIntake(intake);
  const templateIntake = normalizeIntake(template?.intake || {});
  return {
    goal: normalized.goal || templateIntake.goal,
    context: normalized.context || templateIntake.context,
    desiredOutput: normalized.desiredOutput || templateIntake.desiredOutput,
    constraints: normalized.constraints || templateIntake.constraints,
    nonGoals: normalized.nonGoals || templateIntake.nonGoals
  };
}

function buildAnswerPatchFromIntake(intake = {}) {
  const normalized = normalizeIntake(intake);
  const next = {};
  if (normalized.goal) next.goal = normalized.goal;
  if (normalized.context) next.context = normalized.context;
  if (normalized.desiredOutput) next.desiredOutput = normalized.desiredOutput;
  if (normalized.constraints) next.constraints = normalized.constraints;
  if (normalized.nonGoals) next.nonGoals = normalized.nonGoals;
  return next;
}

function ensureApprovalState(approvals = {}) {
  return approvals && typeof approvals === "object" && !Array.isArray(approvals) ? { ...approvals } : {};
}

function ensureLinks(links = {}) {
  return links && typeof links === "object" && !Array.isArray(links) ? { ...links } : {};
}

function ensureMeta(meta = {}) {
  return meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : {};
}

function ensureRequest(request = {}) {
  return request && typeof request === "object" && !Array.isArray(request) ? { ...request } : {};
}

function ensurePlan(plan = {}) {
  return plan && typeof plan === "object" && !Array.isArray(plan) ? { ...plan } : {};
}

function ensureEvaluation(evaluation = {}) {
  return evaluation && typeof evaluation === "object" && !Array.isArray(evaluation) ? { ...evaluation } : {};
}

function normalizeStateHistory(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      state: normalizeWorkflowState(entry.state || entry.to || ""),
      phase: safeText(entry.phase || "", 40),
      reason: safeText(entry.reason, 220),
      actor: safeText(entry.actor, 80),
      createdAt: safeText(entry.createdAt || entry.timestamp, 80) || new Date().toISOString()
    }))
    .slice(-20);
}

function createStateHistoryEntry({ state = "", phase = "", reason = "", actor = "" } = {}) {
  return {
    state: normalizeWorkflowState(state || mapWorkflowPhaseToState(phase)),
    phase: safeText(phase, 40),
    reason: safeText(reason, 220),
    actor: safeText(actor, 80),
    createdAt: new Date().toISOString()
  };
}

function appendStateHistory(current = [], entry = {}) {
  const next = normalizeStateHistory(current);
  next.push(createStateHistoryEntry(entry));
  return next.slice(-20);
}

function safeList(value, limit = 8, itemLimit = 220) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeText(item, itemLimit))
    .filter(Boolean)
    .slice(0, limit);
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map((value) => safeText(value, 120)).filter(Boolean))
  );
}

function createTimelineEntry({
  entityType = "run",
  entityId = "",
  eventType = "updated",
  message = "Workflow updated",
  metadata = {}
} = {}) {
  return {
    id: `timeline_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    entityType: safeText(entityType, 20) || "run",
    entityId: safeText(entityId, 120),
    eventType: safeText(eventType, 40) || "updated",
    message: safeText(message, 320) || "Workflow updated",
    metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? { ...metadata } : {},
    createdAt: new Date().toISOString()
  };
}

function normalizeTimeline(entries = [], entityType = "run", entityId = "") {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      id: safeText(entry.id || `timeline_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`, 120),
      entityType: safeText(entry.entityType || entityType, 20) || entityType,
      entityId: safeText(entry.entityId || entityId, 120) || entityId,
      eventType: safeText(entry.eventType || entry.type || "updated", 40) || "updated",
      message: safeText(entry.message || entry.title || entry.detail || "Workflow updated", 320),
      metadata:
        entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
          ? { ...entry.metadata }
          : {},
      createdAt: safeText(entry.createdAt || entry.timestamp || new Date().toISOString(), 80)
    }))
    .slice(-80);
}

function appendRunTimeline(run, entry) {
  const meta = ensureMeta(run?.meta);
  const timeline = normalizeTimeline(meta.workflowTimeline, "run", safeText(run?.id, 120));
  timeline.push(
    createTimelineEntry({
      entityType: "run",
      entityId: safeText(run?.id, 120),
      ...entry
    })
  );
  return {
    ...meta,
    workflowTimeline: timeline.slice(-80)
  };
}

function buildArtifactRecord({
  id,
  runId,
  projectId = "",
  jobId = "",
  type,
  title,
  summary = "",
  contentRef = "",
  version = 1,
  stage = "",
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  promotionStatus = "",
  promotedAt = "",
  previewItems = []
}) {
  const normalizedType = safeText(type, 40);
  return {
    id: safeText(id, 120),
    runId: safeText(runId, 120),
    projectId: safeText(projectId, 120),
    jobId: safeText(jobId, 120),
    type: normalizedType,
    kind: normalizedType,
    title: safeText(title, 160),
    summary: safeText(summary, 320),
    contentRef: safeText(contentRef, 220),
    version: Math.max(1, Number(version) || 1),
    stage: safeText(stage, 80),
    createdAt: safeText(createdAt, 80) || new Date().toISOString(),
    updatedAt: safeText(updatedAt, 80) || new Date().toISOString(),
    promotionStatus: safeText(promotionStatus || (projectId ? "promoted" : "run_owned"), 40),
    promotedAt: safeText(promotedAt, 80),
    previewItems: safeList(previewItems, 6, 140)
  };
}

function normalizeArtifactRecords(records = []) {
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record && typeof record === "object" && !Array.isArray(record))
    .map((record) =>
      buildArtifactRecord({
        id: record.id,
        runId: record.runId,
        projectId: record.projectId,
        jobId: record.jobId,
        type: record.type || record.kind,
        title: record.title,
        summary: record.summary,
        contentRef: record.contentRef,
        version: record.version,
        stage: record.stage,
        createdAt: record.createdAt || record.createdTs,
        updatedAt: record.updatedAt || record.updatedTs,
        promotionStatus: record.promotionStatus,
        promotedAt: record.promotedAt,
        previewItems: record.previewItems
      })
    )
    .filter((record) => record.id && record.runId && record.type)
    .slice(-20);
}

function mergeArtifactRecords(existing = [], incoming = []) {
  const merged = new Map();
  for (const record of normalizeArtifactRecords(existing)) {
    merged.set(record.id, record);
  }
  for (const record of normalizeArtifactRecords(incoming)) {
    const current = merged.get(record.id);
    merged.set(record.id, {
      ...(current || {}),
      ...record,
      createdAt: current?.createdAt || record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString()
    });
  }
  return Array.from(merged.values()).slice(-20);
}

function promoteArtifactRecords(records = [], { projectId = "", actor = "", artifactIds = [] } = {}) {
  const safeProjectId = safeText(projectId, 120);
  const filterIds = new Set(uniqueStrings(artifactIds));
  const promotedAt = new Date().toISOString();
  return normalizeArtifactRecords(records).map((record) => {
    if (!safeProjectId) return record;
    if (filterIds.size && !filterIds.has(record.id)) return record;
    return {
      ...record,
      projectId: safeProjectId,
      promotionStatus: "promoted",
      promotedAt,
      updatedAt: promotedAt,
      promotedBy: safeText(actor, 80)
    };
  });
}

function phaseToProjectStatus(phase = "") {
  const safePhase = safeText(phase, 40).toLowerCase();
  if (safePhase === "analysis") return "intake";
  if (safePhase === "brief_approval") return "discovery";
  if (safePhase === "initiation") return "planning";
  if (safePhase === "prototype_pack") return "build";
  if (safePhase === "pack_approval") return "review";
  if (safePhase === "handoff") return "delivery";
  if (safePhase === "archived") return "archived";
  return "intake";
}

function phaseToNarrativeStage(phase = "") {
  const safePhase = safeText(phase, 40).toLowerCase();
  if (safePhase === "analysis") return "understanding";
  if (safePhase === "brief_approval") return "routing";
  if (safePhase === "initiation") return "scout_direction";
  if (safePhase === "prototype_pack") return "build";
  if (safePhase === "pack_approval") return "review";
  if (safePhase === "handoff") return "decision_pack";
  if (safePhase === "archived") return "archived";
  return "understanding";
}

function phaseNarrativeLabel(phase = "") {
  const stage = phaseToNarrativeStage(phase);
  if (stage === "understanding") return "Understanding";
  if (stage === "routing") return "Routing";
  if (stage === "scout_direction") return "Scout Direction";
  if (stage === "build") return "Build";
  if (stage === "review") return "Review";
  if (stage === "decision_pack") return "Decision Pack";
  if (stage === "archived") return "Archived";
  return "Understanding";
}

function buildDefaultStatusSummary(run, jobs = []) {
  const blockedJob = jobs.find((job) => job.status === "blocked");
  if (blockedJob) {
    return `A job is blocked${blockedJob.blockerReason ? `: ${blockedJob.blockerReason}` : " and needs operator attention."}`;
  }
  const safePhase = safeText(run?.phase, 40).toLowerCase();
  if (safePhase === "analysis") return "ATEAM is interpreting the idea and shaping the intake frame.";
  if (safePhase === "brief_approval") return "ATEAM has a brief ready and is lining up the strongest route forward.";
  if (safePhase === "initiation") return "ATEAM seeded the work and attached the run to live delivery jobs.";
  if (safePhase === "pack_approval") return "ATEAM generated the preview pack and staged it for decision.";
  if (safePhase === "handoff") return "ATEAM has a decision pack ready to turn into live Una Labs execution.";
  return "ATEAM is moving the intake toward a clear next step.";
}

function buildStatusNarrative(run, jobs = []) {
  const meta = ensureMeta(run?.meta);
  const transition = meta.lastTransition && typeof meta.lastTransition === "object" ? meta.lastTransition : {};
  const blockedJob = jobs.find((job) => job.status === "blocked");
  const responsible = safeText(
    blockedJob?.ownerAgentId || transition.responsible || run?.links?.ownerAgentId || "",
    80
  );
  return {
    currentStage: phaseToNarrativeStage(run?.phase),
    label: phaseNarrativeLabel(run?.phase),
    summary: safeText(transition.summary || buildDefaultStatusSummary(run, jobs), 320),
    movementReason: safeText(transition.reason || transition.movementReason, 220),
    blockerReason: safeText(blockedJob?.blockerReason || transition.blockerReason, 220),
    responsible,
    updatedAt: safeText(run?.updatedTs || transition.timestamp, 80) || new Date().toISOString()
  };
}

function buildArtifactRecords(run) {
  const meta = ensureMeta(run?.meta);
  const existing = normalizeArtifactRecords(meta.artifactRecords);
  if (existing.length) return existing;

  const artifacts = run?.artifacts && typeof run.artifacts === "object" ? run.artifacts : {};
  const runId = safeText(run?.id, 120) || "workflow_run";
  const updatedAt = safeText(run?.updatedTs || run?.createdTs, 80) || new Date().toISOString();
  const records = [];

  if (run?.brief && typeof run.brief === "object" && safeText(run.brief.title, 160)) {
    records.push(
      buildArtifactRecord({
        id: `${runId}_brief`,
        runId,
        type: "brief",
        title: run.brief.title,
        summary: run.brief.summary || run.brief.quickVerdict,
        stage: "routing",
        createdAt: updatedAt,
        updatedAt,
        previewItems: [...safeList(run.brief.goals || [], 3), ...safeList(run.brief.constraints || [], 2)]
      })
    );
  }
  if (artifacts?.mockup?.title) {
    records.push(
      buildArtifactRecord({
        id: `${runId}_mockup`,
        runId,
        type: "mockup",
        title: artifacts.mockup.title,
        summary: artifacts.mockup.summary,
        stage: "build",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts.mockup.screens || []).map((screen) => screen.title), 4)
      })
    );
  }
  if (artifacts?.prototype?.title) {
    records.push(
      buildArtifactRecord({
        id: `${runId}_prototype`,
        runId,
        type: "prototype",
        title: artifacts.prototype.title,
        summary: artifacts.prototype.summary,
        stage: "build",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts.prototype.frames || []).map((frame) => frame.title), 4)
      })
    );
  }
  if (artifacts?.smoke?.summary) {
    records.push(
      buildArtifactRecord({
        id: `${runId}_smoke`,
        runId,
        type: "smoke_report",
        title: artifacts.smoke.status || "Smoke report",
        summary: artifacts.smoke.summary,
        stage: "review",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts.smoke.checks || []).map((check) => `${check.label}: ${check.result}`), 4)
      })
    );
  }
  if (artifacts?.doc?.title) {
    records.push(
      buildArtifactRecord({
        id: `${runId}_document`,
        runId,
        type: "document",
        title: artifacts.doc.title,
        summary: artifacts.doc.summary,
        stage: "decision_pack",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts.doc.sections || []).map((section) => section.title), 4)
      })
    );
  }
  return records;
}

function mapJobSummary(item = {}) {
  const data = item?.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data : {};
  const history = Array.isArray(item.history) ? item.history : [];
  return {
    id: safeText(item.id, 120),
    title: safeText(item.title, 160),
    objective: safeText(item.objective, 400),
    status: safeText(item.jobStatus, 40) || "queued",
    stage: safeText(item.stageNarrative || item.stage, 80) || "Queued",
    stageKey: safeText(item.stage, 40),
    ownerAgentId: safeText(item.ownerAgentId, 80),
    blockerReason: safeText(item.blockerReason || data.blockerReason || "", 220),
    waitingReason: safeText(item.waitingReason || data.waitingReason || "", 220),
    risk: safeText(item.risk, 20) || "low",
    projectId: safeText(item.projectId || data.projectId, 120),
    workflowRunId: safeText(item.workflowRunId || data.workflowRunId, 120),
    workflowStep: safeText(item.workflowStep || data.workflowStep, 80),
    approvalId: safeText(item.approvalId || data.approvalId, 120),
    history,
    timeline: normalizeTimeline(
      history.map((entry) => ({
        entityType: "job",
        entityId: item.id,
        eventType: entry.type || "updated",
        message: entry.title || entry.detail || "Job updated",
        metadata: {
          stage: entry.stage,
          actor: entry.actor,
          reason: entry.reason,
          blockerReason: entry.blockerReason
        },
        createdAt: entry.timestamp
      })),
      "job",
      safeText(item.id, 120)
    )
  };
}

function buildProjectSummary(run, jobs = [], artifactSummaries = []) {
  const links = ensureLinks(run?.links);
  const brief = run?.brief && typeof run.brief === "object" ? run.brief : {};
  const blockedCount = jobs.filter((job) => job.status === "blocked").length;
  const activeCount = jobs.filter((job) => ["in_progress", "review"].includes(job.status)).length;
  return {
    id: safeText(links.projectId || `workflow_${run?.id}`, 120),
    name: safeText(brief.title || run?.title || run?.idea, 160) || "ATEAM project",
    status: phaseToProjectStatus(run?.phase),
    summary: safeText(
      brief.summary ||
        brief.quickVerdict ||
        `ATEAM is moving this intake through ${phaseNarrativeLabel(run?.phase).toLowerCase()}.`,
      320
    ),
    ownerAgentId: safeText(links.ownerAgentId || jobs[0]?.ownerAgentId || "henry", 80),
    workflowRunId: safeText(run?.id, 120),
    recommendedLane: safeText(run?.recommendedLane || brief.recommendedLane, 120),
    jobIds: uniqueStrings(jobs.map((job) => job.id)),
    artifactIds: uniqueStrings(artifactSummaries.map((artifact) => artifact.id)),
    activeJobCount: activeCount,
    blockedJobCount: blockedCount,
    updatedAt: safeText(run?.updatedTs, 80) || new Date().toISOString()
  };
}

function buildUnderstandingSummary(run = {}) {
  const brief = run?.brief && typeof run.brief === "object" ? run.brief : {};
  const safeIdea = safeText(run?.idea, 240);
  const recommendedLane = safeText(run?.recommendedLane || brief.recommendedLane, 120);
  return {
    title: safeText(brief.title, 160) || "What ATEAM understood",
    summary:
      safeText(brief.summary, 320) ||
      safeText(
        safeIdea
          ? `ATEAM is shaping this idea into a ${recommendedLane || "clear"} run with visible state and a believable first delivery move.`
          : "ATEAM is shaping the rough idea into a clearer delivery frame.",
        320
      ),
    audience: safeText(brief.audience, 160),
    firstWin: safeText(brief.primaryGoal || brief.quickVerdict, 220),
    recommendedLane
  };
}

function buildPublicFlow(run, jobs = [], artifactSummaries = []) {
  const statusNarrative = buildStatusNarrative(run, jobs);
  const understanding = buildUnderstandingSummary(run);
  return {
    modules: [
      {
        key: "intake",
        title: "Intake",
        state: safeText(run?.id, 120) ? "Run captured" : "Waiting for idea",
        summary: safeText(
          run?.idea
            ? "ATEAM has the rough idea and can continue from short clarifiers instead of a rigid form."
            : "The public flow starts with an open narrative instead of a dead-end intake form.",
          240
        ),
        detail: "Capture the rough idea and the last clarifiers without forcing the client to pre-structure everything."
      },
      {
        key: "system",
        title: "System",
        state: safeText(statusNarrative.label, 120) || "Waiting",
        summary: safeText(
          statusNarrative.summary || "ATEAM keeps the current stage, movement reason, and blocker context visible.",
          240
        ),
        detail: "Expose run state, lane, movement reason, and blocker context clearly enough to trust."
      },
      {
        key: "work",
        title: "Work",
        state: jobs.length ? `${jobs.length} visible job${jobs.length === 1 ? "" : "s"}` : "No jobs yet",
        summary: safeText(
          jobs.length
            ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} and ${normalizeTimeline(run?.meta?.workflowTimeline, "run", safeText(run?.id, 120)).length} timeline event${normalizeTimeline(run?.meta?.workflowTimeline, "run", safeText(run?.id, 120)).length === 1 ? "" : "s"} are currently visible.`
            : "Jobs and timeline movement will appear once ATEAM routes the run.",
          240
        ),
        detail: "Show public-safe jobs, ownership, and recent timeline movement without exposing admin controls."
      },
      {
        key: "output",
        title: "Output",
        state: safeText(run?.phase, 40).toLowerCase() === "handoff" ? "Decision pack ready" : "Building output",
        summary: safeText(
          artifactSummaries.length
            ? `${artifactSummaries.length} run-owned artifact${artifactSummaries.length === 1 ? "" : "s"} are tied to this execution and ready for the next move.`
            : "ATEAM will return run-owned artifacts and a clean project handoff once the pack is ready.",
          240
        ),
        detail: "Return run-owned artifacts, a decision pack, and the clearest next move into delivery."
      }
    ],
    understanding
  };
}

function linkArtifactsToJobs(artifacts = [], jobs = []) {
  const byStep = new Map(
    (Array.isArray(jobs) ? jobs : [])
      .filter(Boolean)
      .map((job) => [safeText(job.workflowStep, 80), safeText(job.id, 120)])
      .filter(([step, id]) => step && id)
  );

  return normalizeArtifactRecords(artifacts).map((artifact) => {
    if (safeText(artifact.jobId, 120)) return artifact;
    let workflowStep = "";
    if (artifact.type === "brief") workflowStep = "initiation";
    if (artifact.type === "mockup" || artifact.type === "prototype") workflowStep = "prototype_pack";
    if (artifact.type === "smoke_report") workflowStep = "smoke";
    if (artifact.type === "document") workflowStep = "handoff";
    return workflowStep && byStep.get(workflowStep)
      ? {
          ...artifact,
          jobId: byStep.get(workflowStep)
        }
      : artifact;
  });
}

function buildRecentArtifact(artifacts = []) {
  const normalized = normalizeArtifactRecords(artifacts);
  if (!normalized.length) return null;
  const preferredTypeOrder = ["document", "prototype", "mockup", "smoke_report", "brief"];
  const sorted = [...normalized].sort((left, right) => {
    const leftTypeRank = preferredTypeOrder.indexOf(String(left.type || ""));
    const rightTypeRank = preferredTypeOrder.indexOf(String(right.type || ""));
    if (leftTypeRank !== rightTypeRank) return (leftTypeRank === -1 ? 99 : leftTypeRank) - (rightTypeRank === -1 ? 99 : rightTypeRank);
    return String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
  });
  return sorted[0] || null;
}

function hasMeaningfulPlanPatch(planPatch = {}) {
  if (!planPatch || typeof planPatch !== "object" || Array.isArray(planPatch)) return false;
  const normalized = normalizeWorkflowPlanPatch(planPatch);
  return Boolean(
    normalized.summary ||
      normalized.editorNotes ||
      normalized.templateId ||
      normalized.blockers.length ||
      normalized.proposedSteps.length ||
      normalized.expectedArtifact.type ||
      normalized.expectedArtifact.title ||
      normalized.expectedArtifact.summary
  );
}

function buildWorkflowStateContext({
  run,
  phase,
  state,
  actor = "",
  reason = "",
  summary = "",
  request,
  plan
} = {}) {
  const nextPhase = safeText(phase || run?.phase || "", 40) || "intake";
  const nextState = normalizeWorkflowState(state || run?.state || mapWorkflowPhaseToState(nextPhase));
  const nextRequest = buildWorkflowRequest({
    idea: run?.idea,
    category: run?.category,
    intake: ensureRequest(request || run?.request).intake,
    answers: run?.answers,
    runId: run?.id,
    previousRequest: ensureRequest(request || run?.request),
    snapshot: {
      state: nextState,
      phase: nextPhase,
      summary,
      updatedAt: new Date().toISOString()
    }
  });
  const nextBrief = buildWorkflowBrief({
    idea: run?.idea,
    category: run?.category,
    answers: run?.answers,
    intake: nextRequest.intake,
    request: nextRequest,
    runId: run?.id
  });
  const nextPlan =
    plan ||
    buildWorkflowPlan({
      request: nextRequest,
      category: run?.category,
      brief: nextBrief,
      runId: run?.id
    });
  return {
    phase: nextPhase,
    state: nextState,
    request: nextRequest,
    brief: nextBrief,
    plan: nextPlan,
    stateHistory: appendStateHistory(run?.stateHistory, {
      state: nextState,
      phase: nextPhase,
      reason,
      actor
    })
  };
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

  async function getRunOrThrow(runId) {
    const run = await workflowRunStore.get(runId);
    if (!run) throw createError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found.", 404);
    return run;
  }

  async function presentRun(run) {
    const rawRun = run && typeof run === "object" ? run : null;
    if (!rawRun) return null;
    const links = ensureLinks(rawRun.links);
    const request =
      Object.keys(ensureRequest(rawRun.request)).length > 0
        ? ensureRequest(rawRun.request)
        : buildWorkflowRequest({
            idea: rawRun.idea,
            category: rawRun.category,
            intake: rawRun.answers,
            answers: rawRun.answers,
            runId: rawRun.id
          });
    const brief =
      Object.keys(rawRun.brief || {}).length > 0
        ? rawRun.brief
        : buildWorkflowBrief({
            idea: rawRun.idea,
            category: rawRun.category,
            answers: rawRun.answers,
            intake: request.intake,
            request,
            runId: rawRun.id
          });
    const plan =
      Object.keys(ensurePlan(rawRun.plan)).length > 0
        ? ensurePlan(rawRun.plan)
        : buildWorkflowPlan({
            request,
            category: rawRun.category,
            brief,
            runId: rawRun.id
          });
    const evaluation = ensureEvaluation(rawRun.evaluation);
    const state = normalizeWorkflowState(rawRun.state || mapWorkflowPhaseToState(rawRun.phase));
    const stateHistory = normalizeStateHistory(rawRun.stateHistory);
    const linkedIds = uniqueStrings([
      ...(Array.isArray(links.workItemIds) ? links.workItemIds : []),
      ...(Array.isArray(links.jobIds) ? links.jobIds : [])
    ]);
    const items =
      typeof workItemStore.getMany === "function"
        ? await workItemStore.getMany(linkedIds)
        : (await Promise.all(linkedIds.map((id) => workItemStore.get(id)))).filter(Boolean);
    const jobs = items.map(mapJobSummary);
    const artifactSummaries = linkArtifactsToJobs(buildArtifactRecords({ ...rawRun, brief, request, plan }), jobs);
    const project = buildProjectSummary({ ...rawRun, brief, request, plan, state }, jobs, artifactSummaries);
    const meta = ensureMeta(rawRun.meta);
    const recentArtifact = buildRecentArtifact(artifactSummaries);
    const catalog = getWorkflowCatalog();

    return {
      ...rawRun,
      brief,
      request,
      plan,
      evaluation,
      state,
      stateHistory,
      links: {
        ...links,
        workItemIds: linkedIds,
        jobIds: linkedIds
      },
      project,
      jobs,
      artifactSummaries,
      recentArtifact,
      availableTemplates: catalog.templates,
      agentRoles: catalog.agentRoles,
      statusNarrative: buildStatusNarrative(rawRun, jobs),
      history: normalizeTimeline(meta.workflowTimeline, "run", safeText(rawRun.id, 120)),
      publicFlow: buildPublicFlow(rawRun, jobs, artifactSummaries)
    };
  }

  async function startRun({
    idea,
    category,
    templateId = "",
    intake = {},
    requestedBy = "public",
    sessionId = "global_podcast",
    meta = {}
  }) {
    const safeIdea = safeText(idea, 1200);
    if (safeIdea.length < 12) {
      throw createError("INVALID_WORKFLOW_IDEA", "Share a bit more detail so ATEAM can shape the run.");
    }
    const template = getWorkflowTemplate(templateId);
    const normalizedCategory = normalizeWorkflowCategory(category || template?.category, safeIdea);
    const preset = getWorkflowCategoryPreset(normalizedCategory);
    const normalizedIntake = mergeIntakeWithTemplate(intake, template);
    const answers = buildAnswerPatchFromIntake(normalizedIntake);
    const request = buildWorkflowRequest({
      idea: safeIdea,
      category: normalizedCategory,
      intake: normalizedIntake,
      answers
    });
    const brief = buildWorkflowBrief({
      idea: safeIdea,
      category: normalizedCategory,
      answers,
      intake: normalizedIntake,
      request
    });
    const questions = buildWorkflowQuestions({
      idea: safeIdea,
      category: normalizedCategory,
      intake: normalizedIntake,
      answers
    });
    const plan = buildWorkflowPlan({
      request,
      category: normalizedCategory,
      brief
    });
    const templateAwarePlan = template
      ? applyWorkflowPlanPatch({
          basePlan: plan,
          patch: {
            templateId: template.id,
            editorNotes: `Started from template: ${template.label}`
          },
          actor: requestedBy
        })
      : plan;
    const approval = await approvalStore.create({
      policy: "workflow_brief",
      summary: `Approve plan for ${brief.title}`,
      requestedBy,
      payload: {
        idea: safeIdea,
        category: normalizedCategory,
        recommendedLane: brief.recommendedLane
      }
    });
    const stateHistory = [
      createStateHistoryEntry({
        state: "queued",
        phase: "intake",
        reason: "The run was accepted from public intake.",
        actor: requestedBy
      }),
      createStateHistoryEntry({
        state: "planning",
        phase: "analysis",
        reason: "ATEAM normalized the request and prepared a visible plan.",
        actor: "ateam_intake"
      }),
      createStateHistoryEntry({
        state: "awaiting_approval",
        phase: "brief_approval",
        reason: "The visible plan is ready for review.",
        actor: "henry"
      })
    ];

    const run = await workflowRunStore.create({
      phase: "brief_approval",
      state: "awaiting_approval",
      stateHistory,
      requestedBy,
      category: normalizedCategory,
      idea: safeIdea,
      title: brief.title,
      questions,
      answers,
      brief,
      recommendedLane: preset.recommendedLane,
      request: buildWorkflowRequest({
        idea: safeIdea,
        category: normalizedCategory,
        intake: normalizedIntake,
        answers,
        snapshot: {
          state: "awaiting_approval",
          phase: "brief_approval",
          summary: "ATEAM normalized the request and produced a visible plan.",
          updatedAt: new Date().toISOString()
        }
      }),
      plan: templateAwarePlan,
      approvals: {
        brief: {
          approvalId: approval.id,
          status: "pending",
          requestedAt: new Date().toISOString(),
          decidedAt: null,
          decidedBy: ""
        }
      },
      meta: {
        ...ensureMeta(meta),
        templateId: template?.id || "",
        templateLabel: template?.label || "",
        lastTransition: {
          currentStage: phaseToNarrativeStage("brief_approval"),
          summary: "ATEAM captured the idea, normalized the request, and prepared the first plan.",
          reason: "A new run was created from guided public intake.",
          responsible: "ateam_intake",
          timestamp: new Date().toISOString()
        }
      }
    });

    // Patch approval payload to include runId so Mission Control can wire approval → run state
    await approvalStore.patchPayload(approval.id, { workflowRunId: run.id, gate: "brief" });

    const updated = await workflowRunStore.update(run.id, {
      meta: appendRunTimeline(run, {
        eventType: "created",
        message: "Run created from intake",
        metadata: {
          actor: requestedBy,
          category: normalizedCategory,
          recommendedLane: preset.recommendedLane,
          approvalId: approval.id
        }
      })
    });

    logEvent(sessionId, "workflow_run_started", requestedBy, `Workflow run started for ${safeIdea.slice(0, 80)}`, {
      workflowRunId: run.id,
      category: normalizedCategory,
      recommendedLane: preset.recommendedLane
    });

    return await presentRun(updated);
  }

  async function captureAnswers(
    runId,
    { answers, intake = {}, planPatch = {}, templateId = "", actor = "public", sessionId = "global_podcast" }
  ) {
    const run = await getRunOrThrow(runId);
    const template = getWorkflowTemplate(templateId || ensureMeta(run.meta).templateId);
    const mergedAnswers = {
      ...(run.answers || {}),
      ...normalizeAnswers(answers)
    };
    const nextIntake = mergeIntakeWithTemplate(
      {
        ...ensureRequest(run.request).intake,
        ...normalizeIntake(intake)
      },
      template
    );
    const request = buildWorkflowRequest({
      idea: run.idea,
      category: run.category,
      intake: nextIntake,
      answers: mergedAnswers,
      runId: run.id,
      previousRequest: run.request,
      snapshot: {
        state: "awaiting_approval",
        phase: "brief_approval",
        summary: "ATEAM refreshed the visible plan from the latest user inputs.",
        updatedAt: new Date().toISOString()
      }
    });
    const brief = buildWorkflowBrief({
      idea: run.idea,
      category: run.category,
      answers: mergedAnswers,
      intake: request.intake,
      request,
      runId: run.id
    });
    const plan = buildWorkflowPlan({
      request,
      category: run.category,
      brief,
      runId: run.id
    });
    const persistedPlanPatch = run.plan?.editable?.patch;
    const mergedPlan = hasMeaningfulPlanPatch(planPatch)
      ? applyWorkflowPlanPatch({
          basePlan: plan,
          patch: {
            ...normalizeWorkflowPlanPatch(planPatch),
            templateId: template?.id || safeText(plan?.editable?.templateId, 80)
          },
          actor
        })
      : hasMeaningfulPlanPatch(persistedPlanPatch)
        ? applyWorkflowPlanPatch({
            basePlan: plan,
            patch: persistedPlanPatch,
            actor: run.plan?.editable?.editedBy || actor
          })
      : template
        ? applyWorkflowPlanPatch({
            basePlan: plan,
            patch: {
              templateId: template.id,
              editorNotes:
                safeText(plan?.editable?.editorNotes, 280) || `Using template: ${template.label}`
            },
            actor
          })
        : plan;
    const risks = buildWorkflowRisks({
      brief,
      answers: mergedAnswers,
      category: run.category,
      request
    });

    const approvals = ensureApprovalState(run.approvals);
    let approvalId = safeText(approvals?.brief?.approvalId, 120);
    if (!approvalId) {
      const approval = await approvalStore.create({
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

    const artifactRecords = mergeArtifactRecords(buildArtifactRecords(run), [
      buildArtifactRecord({
        id: `${run.id}_brief`,
        runId: run.id,
        type: "brief",
        title: brief.title,
        summary: brief.summary || brief.quickVerdict,
        stage: "routing",
        createdAt: run.createdTs,
        updatedAt: new Date().toISOString(),
        previewItems: [...safeList(brief.goals || [], 3), ...safeList(brief.constraints || [], 2)]
      })
    ]);

    const updated = await workflowRunStore.update(run.id, {
      phase: "brief_approval",
      state: "awaiting_approval",
      stateHistory: appendStateHistory(run.stateHistory, {
        state: "awaiting_approval",
        phase: "brief_approval",
        reason: "ATEAM refreshed the plan from the latest intake details.",
        actor
      }),
      title: brief.title,
      answers: mergedAnswers,
      request,
      plan: mergedPlan,
      brief,
      recommendedLane: brief.recommendedLane,
      risks,
      approvals,
      meta: appendRunTimeline(
        {
          ...run,
          meta: {
            ...ensureMeta(run.meta),
              artifactRecords,
              templateId: template?.id || ensureMeta(run.meta).templateId || "",
              templateLabel: template?.label || ensureMeta(run.meta).templateLabel || "",
              lastTransition: {
                currentStage: phaseToNarrativeStage("brief_approval"),
                summary: "ATEAM shaped the brief and queued the routing decision.",
              reason: "The intake answers were converted into a scoped brief.",
              responsible: "henry",
              timestamp: new Date().toISOString()
            }
          }
        },
        {
          eventType: "artifact_created",
          message: "Artifact generated: Brief v1",
          metadata: {
            actor,
            artifactId: `${run.id}_brief`,
            approvalId
          }
        }
      )
    });

    logEvent(sessionId, "workflow_brief_ready", actor, `Workflow brief ready for ${brief.title}`, {
      workflowRunId: run.id,
      approvalId,
      recommendedLane: brief.recommendedLane
    });

    return await presentRun(updated);
  }

  async function ensureLinkedWork(run) {
    const links = ensureLinks(run.links);
    const existingProjectId = safeText(links.projectId, 120);
    const existingWorkItemIds = Array.isArray(links.workItemIds) ? links.workItemIds.filter(Boolean) : [];
    if (existingProjectId && existingWorkItemIds.length) {
      return {
        projectId: existingProjectId,
        workItemIds: existingWorkItemIds,
        ownerAgentId: safeText(links.ownerAgentId, 80)
      };
    }

    const blueprint = buildWorkflowWorkItems(run);
    const createdItems = await Promise.all(
      blueprint.items.map((item) =>
        workItemStore.create({
        title: item.title,
        objective: item.objective,
        stage: item.stage,
        ownerAgentId: item.ownerAgentId,
        data: {
          ...(item.data || {}),
          reason: "created_from_workflow_run"
        }
      })
      )
    );
    return {
      projectId: blueprint.projectId,
      workItemIds: createdItems.map((item) => item.id),
      ownerAgentId: blueprint.ownerAgentId
    };
  }

  async function approveRun(runId, { gate, decision, actor = "operator", sessionId = "global_podcast" }) {
    const run = await getRunOrThrow(runId);
    const safeGate = safeText(gate, 40).toLowerCase();
    const safeDecision = safeText(decision, 40).toLowerCase();

    if (!["brief", "pack"].includes(safeGate)) {
      throw createError("INVALID_WORKFLOW_GATE", "Approval gate must be brief or pack.");
    }
    if (!["approved", "rejected", "regenerate"].includes(safeDecision)) {
      throw createError("INVALID_WORKFLOW_DECISION", "Decision must be approved, rejected, or regenerate.");
    }

    const approvals = ensureApprovalState(run.approvals);
    const currentGate = approvals[safeGate] && typeof approvals[safeGate] === "object" ? { ...approvals[safeGate] } : {};
    const approvalId = safeText(currentGate.approvalId, 120);
    if (approvalId && safeDecision !== "regenerate") {
      await approvalStore.setStatus(approvalId, safeDecision);
    }

    currentGate.status = safeDecision === "regenerate" ? "pending" : safeDecision;
    currentGate.decidedAt = safeDecision === "regenerate" ? null : new Date().toISOString();
    currentGate.decidedBy = safeDecision === "regenerate" ? "" : actor;
    approvals[safeGate] = currentGate;

    const patch = { approvals };
    const existingArtifacts = buildArtifactRecords(run);

    if (safeGate === "brief") {
      if (safeDecision === "regenerate") {
        const request = buildWorkflowRequest({
          idea: run.idea,
          category: run.category,
          intake: ensureRequest(run.request).intake,
          answers: run.answers,
          runId: run.id,
          previousRequest: run.request,
          snapshot: {
            state: "awaiting_approval",
            phase: "brief_approval",
            summary: "ATEAM regenerated the visible plan and reset the approval gate.",
            updatedAt: new Date().toISOString()
          }
        });
        const brief = buildWorkflowBrief({
          idea: run.idea,
          category: run.category,
          answers: run.answers,
          intake: request.intake,
          request,
          runId: run.id
        });
        patch.phase = "brief_approval";
        patch.state = "awaiting_approval";
        patch.stateHistory = appendStateHistory(run.stateHistory, {
          state: "planning",
          phase: "analysis",
          reason: "The user asked ATEAM to regenerate the visible plan.",
          actor
        });
        patch.stateHistory = appendStateHistory(patch.stateHistory, {
          state: "awaiting_approval",
          phase: "brief_approval",
          reason: "ATEAM regenerated the plan and returned it for approval.",
          actor: "henry"
        });
        patch.request = request;
        patch.brief = brief;
        patch.plan = buildWorkflowPlan({
          request,
          category: run.category,
          brief,
          runId: run.id
        });
        if (run.plan?.editable?.patch) {
          patch.plan = applyWorkflowPlanPatch({
            basePlan: patch.plan,
            patch: run.plan.editable.patch,
            actor: run.plan?.editable?.editedBy || actor
          });
        }
        patch.risks = buildWorkflowRisks({
          brief,
          answers: run.answers,
          category: run.category,
          request
        });
        patch.meta = appendRunTimeline(
          {
            ...run,
            meta: {
              ...ensureMeta(run.meta),
              lastTransition: {
                currentStage: phaseToNarrativeStage("brief_approval"),
                summary: "ATEAM regenerated the plan and sent it back for approval.",
                reason: "The user asked for a fresh planning pass.",
                responsible: "henry",
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            eventType: "regenerated",
            message: "Plan regenerated from approval gate",
            metadata: {
              actor,
              gate: safeGate
            }
          }
        );
      } else if (safeDecision === "approved") {
        const linked = await ensureLinkedWork(run);
        patch.phase = "initiation";
        patch.state = "approved";
        patch.stateHistory = appendStateHistory(run.stateHistory, {
          state: "approved",
          phase: "initiation",
          reason: "The plan was approved. ATEAM is seeding execution work.",
          actor
        });
        patch.stateHistory = appendStateHistory(patch.stateHistory, {
          state: "executing",
          phase: "initiation",
          reason: "ATEAM seeded the execution work items.",
          actor: "ateam_engine"
        });
        patch.state = "executing";
        patch.links = {
          ...ensureLinks(run.links),
          projectId: linked.projectId,
          workItemIds: linked.workItemIds,
          jobIds: linked.workItemIds,
          ownerAgentId: linked.ownerAgentId || ensureLinks(run.links).ownerAgentId || "henry"
        };
        patch.meta = appendRunTimeline(
          {
            ...run,
            meta: {
              ...ensureMeta(run.meta),
              artifactRecords: promoteArtifactRecords(existingArtifacts, {
                projectId: linked.projectId,
                actor,
                artifactIds: [`${run.id}_brief`]
              }),
              lastTransition: {
                currentStage: phaseToNarrativeStage("initiation"),
                summary: "ATEAM promoted the run into a project and seeded the first jobs.",
                reason: "The brief was approved and delivery work was created.",
                responsible: linked.ownerAgentId || "henry",
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            eventType: "approved",
            message: "Approved by operator: brief gate",
            metadata: {
              actor,
              gate: safeGate,
              projectId: linked.projectId,
              jobIds: linked.workItemIds
            }
          }
        );
      } else {
        patch.phase = "analysis";
        patch.state = "failed";
        patch.stateHistory = appendStateHistory(run.stateHistory, {
          state: "failed",
          phase: "analysis",
          reason: "The visible plan was rejected.",
          actor
        });
        patch.evaluation = buildWorkflowEvaluation({
          run,
          outcome: "rejected",
          failureReason: "The visible plan was rejected before execution."
        });
        patch.meta = appendRunTimeline(
          {
            ...run,
            meta: {
              ...ensureMeta(run.meta),
              lastTransition: {
                currentStage: phaseToNarrativeStage("analysis"),
                summary: "ATEAM sent the brief back for more clarity.",
                reason: "The brief approval was rejected.",
                responsible: "ateam_intake",
                blockerReason: "Brief approval was rejected.",
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            eventType: "rejected",
            message: "Rejected by operator: brief gate",
            metadata: {
              actor,
              gate: safeGate,
              blockerReason: "Brief approval was rejected."
            }
          }
        );
      }
    }

    if (safeGate === "pack") {
      if (safeDecision === "approved") {
        const projectId = safeText(run.links?.projectId, 120);
        patch.phase = "handoff";
        patch.state = "completed";
        patch.stateHistory = appendStateHistory(run.stateHistory, {
          state: "completed",
          phase: "handoff",
          reason: "The generated artifact passed the delivery gate.",
          actor
        });
        patch.handoff = {
          ...(run.handoff || {}),
          status: "ready",
          approvedAt: new Date().toISOString(),
          approvedBy: actor
        };
        patch.evaluation = buildWorkflowEvaluation({
          run: {
            ...run,
            phase: "handoff"
          },
          outcome: "completed"
        });
        patch.meta = appendRunTimeline(
          {
            ...run,
            meta: {
              ...ensureMeta(run.meta),
              artifactRecords: promoteArtifactRecords(existingArtifacts, { projectId, actor }),
              lastTransition: {
                currentStage: phaseToNarrativeStage("handoff"),
                summary: "The decision pack is ready to turn into live Una Labs execution.",
                reason: "The preview artifacts passed the decision gate.",
                responsible: ensureLinks(run.links).ownerAgentId || "henry",
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            eventType: "delivered",
            message: "Delivered to output",
            metadata: {
              actor,
              gate: safeGate,
              projectId
            }
          }
        );
      } else {
        patch.phase = "initiation";
        patch.state = "executing";
        patch.stateHistory = appendStateHistory(run.stateHistory, {
          state: "executing",
          phase: "initiation",
          reason: "The generated artifact needs another execution pass.",
          actor
        });
        patch.evaluation = buildWorkflowEvaluation({
          run,
          outcome: "rejected",
          failureReason: "The generated artifact was rejected and sent back for revision."
        });
        patch.handoff = {
          ...(run.handoff || {}),
          status: "needs_revision"
        };
        patch.meta = appendRunTimeline(
          {
            ...run,
            meta: {
              ...ensureMeta(run.meta),
              lastTransition: {
                currentStage: phaseToNarrativeStage("initiation"),
                summary: "ATEAM sent the pack back for another build pass.",
                reason: "The decision pack needs revisions.",
                responsible: ensureLinks(run.links).ownerAgentId || "henry",
                blockerReason: "Pack approval was rejected.",
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            eventType: "rejected",
            message: "Rejected by operator: pack gate",
            metadata: {
              actor,
              gate: safeGate,
              blockerReason: "Pack approval was rejected."
            }
          }
        );
      }
    }

    const updated = await workflowRunStore.update(run.id, patch);

    logEvent(sessionId, "workflow_approval_decision", actor, `Workflow ${safeGate} ${safeDecision}`, {
      workflowRunId: run.id,
      gate: safeGate,
      decision: safeDecision,
      approvalId
    });

    return await presentRun(updated);
  }

  async function generatePack(runId, { actor = "operator", sessionId = "global_podcast" }) {
    const run = await getRunOrThrow(runId);
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
      const approval = await approvalStore.create({
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

    const updatedAt = new Date().toISOString();
    const artifactRecords = mergeArtifactRecords(buildArtifactRecords(run), [
      buildArtifactRecord({
        id: `${run.id}_brief`,
        runId: run.id,
        projectId: safeText(run.links?.projectId, 120),
        type: "brief",
        title: run.brief?.title || run.title || "Workflow brief",
        summary: run.brief?.summary || run.brief?.quickVerdict,
        stage: "routing",
        createdAt: run.createdTs,
        updatedAt,
        previewItems: [...safeList(run.brief?.goals || [], 3), ...safeList(run.brief?.constraints || [], 2)]
      }),
      buildArtifactRecord({
        id: `${run.id}_mockup`,
        runId: run.id,
        projectId: safeText(run.links?.projectId, 120),
        type: "mockup",
        title: artifacts?.mockup?.title,
        summary: artifacts?.mockup?.summary,
        stage: "build",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts?.mockup?.screens || []).map((screen) => screen.title), 4)
      }),
      buildArtifactRecord({
        id: `${run.id}_prototype`,
        runId: run.id,
        projectId: safeText(run.links?.projectId, 120),
        type: "prototype",
        title: artifacts?.prototype?.title,
        summary: artifacts?.prototype?.summary,
        stage: "build",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts?.prototype?.frames || []).map((frame) => frame.title), 4)
      }),
      buildArtifactRecord({
        id: `${run.id}_smoke`,
        runId: run.id,
        projectId: safeText(run.links?.projectId, 120),
        type: "smoke_report",
        title: artifacts?.smoke?.status || "Smoke report",
        summary: artifacts?.smoke?.summary,
        stage: "review",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts?.smoke?.checks || []).map((check) => `${check.label}: ${check.result}`), 4)
      }),
      buildArtifactRecord({
        id: `${run.id}_document`,
        runId: run.id,
        projectId: safeText(run.links?.projectId, 120),
        type: "document",
        title: artifacts?.doc?.title || "Decision pack",
        summary: artifacts?.doc?.summary,
        stage: "decision_pack",
        createdAt: updatedAt,
        updatedAt,
        previewItems: safeList((artifacts?.doc?.sections || []).map((section) => section.title), 4)
      })
    ]);

    const updated = await workflowRunStore.update(run.id, {
      phase: "pack_approval",
      state: "generating_artifact",
      stateHistory: appendStateHistory(run.stateHistory, {
        state: "generating_artifact",
        phase: "pack_approval",
        reason: "ATEAM generated the decision pack and staged it for review.",
        actor
      }),
      artifacts,
      handoff: {
        ...handoff,
        status: "pending_pack_approval"
      },
      approvals,
      meta: appendRunTimeline(
        {
          ...run,
          meta: {
            ...ensureMeta(run.meta),
            artifactRecords,
            lastTransition: {
              currentStage: phaseToNarrativeStage("pack_approval"),
              summary: "ATEAM generated the preview pack and staged it for review.",
              reason: "The brief was approved and the preview artifacts were created.",
              responsible: ensureLinks(run.links).ownerAgentId || "henry",
              timestamp: updatedAt
            }
          }
        },
        {
          eventType: "artifact_created",
          message: "Artifact generated: Decision pack",
          metadata: {
            actor,
            approvalId,
            artifactIds: artifactRecords.map((artifact) => artifact.id)
          }
        }
      )
    });

    logEvent(sessionId, "workflow_pack_generated", actor, `Workflow pack generated for ${run.brief?.title || run.title || "workflow run"}`, {
      workflowRunId: run.id,
      approvalId
    });

    return await presentRun(updated);
  }

  return {
    startRun,
    captureAnswers,
    approveRun,
    generatePack,
    getCatalog: () => getWorkflowCatalog(),
    getRun: async (runId) => presentRun(await getRunOrThrow(runId)),
    listRuns: async ({ phase, limit, category, state } = {}) => {
      const runs = await workflowRunStore.list({ phase, limit, category, state });
      return Promise.all(runs.map((run) => presentRun(run)));
    }
  };
}
