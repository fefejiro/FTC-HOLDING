import { NextResponse } from "next/server";
import type {
  ArtifactSummary,
  PublicFlow,
  StatusNarrative,
  WorkflowAgentRole,
  WorkflowCatalog,
  WorkflowEvaluation,
  WorkflowIntake,
  WorkflowPlan,
  WorkflowQuestion,
  WorkflowRequest,
  WorkflowRun,
  WorkflowTemplate,
} from "./ateamWorkflow";
import {
  applyWorkflowPlanPatch,
  buildWorkflowBrief,
  buildWorkflowEvaluation,
  buildWorkflowHandoff,
  buildWorkflowPack,
  buildWorkflowPlan,
  buildWorkflowRequest,
  buildWorkflowRisks,
  getWorkflowCatalog,
  getWorkflowTemplate,
  normalizeWorkflowCategory,
} from "../../ATEAM/Server/lib/workflowEngine.js";
import { shouldUseLocalWorkflowFallback } from "./ateamWorkflowLocal";

const EDGE_SESSION_COOKIE = "ateam_edge_demo_session";
const EDGE_STORE_TTL_MS = 1000 * 60 * 60;

type WorkflowStateHistoryEntry = {
  state: string;
  phase: string;
  reason?: string;
  actor?: string;
  createdAt: string;
};

type EdgeStoreEntry = {
  updatedAt: number;
  runs: WorkflowRun[];
};

type EdgeStore = Map<string, EdgeStoreEntry>;

type LocalRunState = {
  phase: WorkflowRun["phase"];
  state: string;
  reason: string;
  actor?: string;
  summary: string;
};

const buildWorkflowRequestUnsafe = buildWorkflowRequest as (args: Record<string, unknown>) => WorkflowRequest;
const buildWorkflowBriefUnsafe = buildWorkflowBrief as (args: Record<string, unknown>) => WorkflowRun["brief"];
const buildWorkflowPlanUnsafe = buildWorkflowPlan as (args: Record<string, unknown>) => WorkflowPlan;
const applyWorkflowPlanPatchUnsafe = applyWorkflowPlanPatch as (args: Record<string, unknown>) => WorkflowPlan;
const buildWorkflowPackUnsafe = buildWorkflowPack as (args: Record<string, unknown>) => WorkflowRun["artifacts"];
const buildWorkflowHandoffUnsafe = buildWorkflowHandoff as (args: Record<string, unknown>) => WorkflowRun["handoff"];
const buildWorkflowEvaluationUnsafe = buildWorkflowEvaluation as (args: Record<string, unknown>) => WorkflowEvaluation;
const buildWorkflowRisksUnsafe = buildWorkflowRisks as (args: Record<string, unknown>) => string[];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function toText(value: unknown, limit = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function toList(values: unknown, limit = 4) {
  return (Array.isArray(values) ? values : [])
    .map((value) => toText(value, 180))
    .filter(Boolean)
    .slice(0, limit);
}

function nextRunId() {
  return `wfr_edge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseCookies(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.split("=");
    const name = String(key || "").trim();
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function getEdgeStore(): EdgeStore {
  const root = globalThis as typeof globalThis & { __ateamEdgeStore?: EdgeStore };
  if (!root.__ateamEdgeStore) root.__ateamEdgeStore = new Map();
  const cutoff = Date.now() - EDGE_STORE_TTL_MS;
  for (const [key, entry] of Array.from(root.__ateamEdgeStore.entries())) {
    if (!entry || entry.updatedAt < cutoff) root.__ateamEdgeStore.delete(key);
  }
  return root.__ateamEdgeStore;
}

function getSessionId(request: Request) {
  const cookies = parseCookies(request);
  const existing = toText(cookies[EDGE_SESSION_COOKIE], 80);
  if (existing) return { sessionId: existing, isNew: false };
  return { sessionId: crypto.randomUUID(), isNew: true };
}

function getSessionRuns(sessionId: string) {
  const entry = getEdgeStore().get(sessionId);
  return Array.isArray(entry?.runs) ? cloneJson(entry.runs) : [];
}

function setSessionRuns(sessionId: string, runs: WorkflowRun[]) {
  getEdgeStore().set(sessionId, {
    updatedAt: Date.now(),
    runs: cloneJson(runs),
  });
}

function getCatalog(): WorkflowCatalog {
  const raw = getWorkflowCatalog() as {
    templates?: WorkflowTemplate[];
    agentRoles?: WorkflowAgentRole[];
  };
  return {
    templates: Array.isArray(raw.templates) ? cloneJson(raw.templates) : [],
    agentRoles: Array.isArray(raw.agentRoles) ? cloneJson(raw.agentRoles) : [],
  };
}

function buildQuestions(request?: WorkflowRequest | null) {
  return Array.isArray(request?.clarifiers)
    ? cloneJson(request.clarifiers as WorkflowQuestion[])
    : [];
}

function appendStateHistory(
  existing: WorkflowRun["stateHistory"] | undefined,
  entry: WorkflowStateHistoryEntry
) {
  const history: WorkflowStateHistoryEntry[] = Array.isArray(existing) ? [...existing] : [];
  history.push(entry);
  return history;
}

function buildStatusNarrative(run: WorkflowRun): StatusNarrative {
  const state = toText(run.state || run.phase, 80).toLowerCase();
  if (state === "awaiting_approval") {
    return {
      currentStage: "Plan review",
      label: "Waiting for approval",
      summary: "ATEAM has a visible plan ready and is waiting for the next decision.",
      movementReason: "The request has been normalized and scoped into a first-pass plan.",
      updatedAt: run.updatedTs,
    };
  }
  if (state === "executing") {
    return {
      currentStage: "Execution",
      label: "Building the pack",
      summary: "ATEAM is turning the approved plan into artifacts and a scoped next move.",
      movementReason: "The run is in the artifact-generation path now.",
      updatedAt: run.updatedTs,
    };
  }
  if (state === "generating_artifact") {
    return {
      currentStage: "Packaging",
      label: "Packaging output",
      summary: "ATEAM has artifacts and is assembling the final decision pack.",
      movementReason: "The visible first pass is being bundled for handoff.",
      updatedAt: run.updatedTs,
    };
  }
  if (state === "completed") {
    return {
      currentStage: "Completed",
      label: "Decision pack ready",
      summary: "ATEAM finished the run and prepared the package for the next move.",
      movementReason: "The output is ready for review, download, and hand off.",
      updatedAt: run.updatedTs,
    };
  }
  if (state === "failed") {
    return {
      currentStage: "Stopped",
      label: "Run stopped",
      summary: "ATEAM did not move this run forward and it needs a reset or a new pass.",
      blockerReason: "The run was rejected before the output path completed.",
      updatedAt: run.updatedTs,
    };
  }
  return {
    currentStage: "Planning",
    label: "Structuring the run",
    summary: "ATEAM is turning the rough idea into a visible plan and route.",
    movementReason: "The request is being normalized into a first-pass structure.",
    updatedAt: run.updatedTs,
  };
}

function buildPublicFlow(run: WorkflowRun): PublicFlow {
  const statusNarrative = buildStatusNarrative(run);
  const title = toText(run.brief?.title, 160) || "What ATEAM understood";
  const summary =
    toText(run.brief?.summary, 280) ||
    "ATEAM is turning the rough idea into a clearer request, visible plan, and scoped next move.";
  return {
    modules: [
      {
        key: "intake",
        title: "Intake",
        state: run.idea ? "Run captured" : "Waiting for idea",
        summary: "The rough idea is captured without forcing the user into a rigid early form.",
        detail: "ATEAM uses guided prompts only where they improve clarity.",
      },
      {
        key: "system",
        title: "System",
        state: statusNarrative.label,
        summary: statusNarrative.summary,
        detail: "State, route, and movement reason stay visible instead of hidden behind a spinner.",
      },
      {
        key: "work",
        title: "Work",
        state: run.plan?.proposedSteps?.length ? "Plan visible" : "No plan yet",
        summary: run.plan?.proposedSteps?.length
          ? `${run.plan.proposedSteps.length} visible step${run.plan.proposedSteps.length === 1 ? "" : "s"} define the first pass.`
          : "ATEAM will show the proposed steps before the run moves forward.",
        detail: "The public flow keeps the plan inspectable before execution.",
      },
      {
        key: "output",
        title: "Output",
        state: run.state === "completed" ? "Decision pack ready" : "Building output",
        summary: run.recentArtifact
          ? "The primary artifact and next move are ready for review."
          : "ATEAM returns a decision pack, not just a conversation.",
        detail: "The output is designed to be easy to inspect, download, and hand off.",
      },
    ],
    understanding: {
      title,
      summary,
      audience: toText(run.brief?.audience, 160),
      firstWin: toText(run.brief?.primaryGoal, 220),
      recommendedLane: toText(run.recommendedLane || run.brief?.recommendedLane, 120),
    },
  };
}

function buildArtifactSummaries(run: WorkflowRun) {
  const createdAt = run.updatedTs || nowIso();
  const summaries: ArtifactSummary[] = [];

  if (run.artifacts?.doc?.title) {
    summaries.push({
      id: `${run.id}_doc`,
      runId: run.id,
      type: "document",
      kind: "document",
      title: run.artifacts.doc.title,
      summary: run.artifacts.doc.summary,
      createdAt,
      updatedAt: createdAt,
      previewItems: toList(run.artifacts.doc.sections?.flatMap((section) => section.items || []), 4),
    });
  }

  if (run.artifacts?.prototype?.title) {
    summaries.push({
      id: `${run.id}_prototype`,
      runId: run.id,
      type: "prototype",
      kind: "prototype",
      title: run.artifacts.prototype.title,
      summary: run.artifacts.prototype.summary,
      createdAt,
      updatedAt: createdAt,
      previewItems: toList(run.artifacts.prototype.stack || [], 4),
    });
  }

  if (run.artifacts?.mockup?.title) {
    summaries.push({
      id: `${run.id}_mockup`,
      runId: run.id,
      type: "mockup",
      kind: "mockup",
      title: run.artifacts.mockup.title,
      summary: run.artifacts.mockup.summary,
      createdAt,
      updatedAt: createdAt,
      previewItems: toList(run.artifacts.mockup.screens?.map((screen) => screen.title) || [], 4),
    });
  }

  return summaries;
}

function withTemplateId(plan: WorkflowPlan, templateId = ""): WorkflowPlan {
  return {
    ...plan,
    summary: toText(plan.summary, 320),
    proposedSteps: Array.isArray(plan.proposedSteps) ? plan.proposedSteps : [],
    expectedArtifact: {
      type: toText(plan.expectedArtifact?.type, 160),
      title: toText(plan.expectedArtifact?.title, 180),
      summary: toText(plan.expectedArtifact?.summary, 280),
    },
    blockers: Array.isArray(plan.blockers) ? plan.blockers : [],
    assumptions: Array.isArray(plan.assumptions) ? plan.assumptions : [],
    approvalActions: Array.isArray(plan.approvalActions) ? plan.approvalActions : ["approve", "reject", "regenerate"],
    editable: {
      ...(plan.editable || {}),
      templateId,
    },
  };
}

function enrichRun(rawRun: WorkflowRun): WorkflowRun {
  const catalog = getCatalog();
  const artifactSummaries = buildArtifactSummaries(rawRun);
  const recentArtifact = artifactSummaries[0] || null;
  return {
    ...cloneJson(rawRun),
    availableTemplates: catalog.templates,
    agentRoles: catalog.agentRoles,
    artifactSummaries,
    recentArtifact,
    statusNarrative: buildStatusNarrative(rawRun),
    publicFlow: buildPublicFlow({ ...rawRun, recentArtifact } as WorkflowRun),
  };
}

function persistRun(sessionId: string, nextRun: WorkflowRun) {
  const runs = getSessionRuns(sessionId);
  const index = runs.findIndex((run) => run.id === nextRun.id);
  if (index >= 0) runs[index] = cloneJson(nextRun);
  else runs.unshift(cloneJson(nextRun));
  runs.sort((left, right) => String(right.updatedTs || "").localeCompare(String(left.updatedTs || "")));
  setSessionRuns(sessionId, runs);
  return enrichRun(nextRun);
}

function findRun(sessionId: string, runId: string) {
  const match = getSessionRuns(sessionId).find((run) => run.id === runId);
  return match ? cloneJson(match) : null;
}

function applyState(run: WorkflowRun, next: LocalRunState) {
  const updatedAt = nowIso();
  const phase = next.phase;
  const state = next.state;
  const entry = {
    state,
    phase,
    reason: next.reason,
    actor: next.actor || "system",
    createdAt: updatedAt,
  };

  const request = buildWorkflowRequestUnsafe({
    idea: run.idea,
    category: run.category,
    intake: run.request?.intake || {},
    answers: run.answers || {},
    runId: run.id,
    previousRequest: run.request || {},
    snapshot: {
      state,
      phase,
      summary: next.summary,
      updatedAt,
    },
  }) as WorkflowRequest;

  const brief = buildWorkflowBriefUnsafe({
    idea: run.idea,
    category: run.category,
    answers: run.answers || {},
    intake: run.request?.intake || {},
    request,
    runId: run.id,
  }) as WorkflowRun["brief"];

  return {
    ...run,
    updatedTs: updatedAt,
    title: toText(brief?.title, 180) || run.title,
    phase,
    state,
    request,
    brief,
    recommendedLane: toText(brief?.recommendedLane, 140) || run.recommendedLane,
    risks: buildWorkflowRisksUnsafe({
      brief,
      answers: run.answers || {},
      category: run.category,
      request,
    }) as string[],
    questions: buildQuestions(request),
    stateHistory: appendStateHistory(run.stateHistory, entry),
  } satisfies WorkflowRun;
}

function parseBody(init?: RequestInit) {
  if (!init?.body) return {};
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function createRunForSession(sessionId: string, body: Record<string, unknown>) {
  const createdAt = nowIso();
  const runId = nextRunId();
  const catalog = getCatalog();
  const template = getWorkflowTemplate(toText(body.templateId, 80)) as WorkflowTemplate | null;
  const idea = toText(body.idea, 1200);
  const category = normalizeWorkflowCategory(toText(body.category || template?.category, 80), idea);
  const intake = {
    goal: toText((body.intake as WorkflowIntake | undefined)?.goal || template?.intake?.goal, 260),
    context: toText((body.intake as WorkflowIntake | undefined)?.context || template?.intake?.context, 360),
    desiredOutput: toText((body.intake as WorkflowIntake | undefined)?.desiredOutput || template?.intake?.desiredOutput, 180),
    constraints: toText((body.intake as WorkflowIntake | undefined)?.constraints || template?.intake?.constraints, 260),
    nonGoals: toText((body.intake as WorkflowIntake | undefined)?.nonGoals || template?.intake?.nonGoals, 260),
  };

  const request = buildWorkflowRequestUnsafe({
    idea,
    category,
    intake,
    answers: {},
    runId,
    snapshot: {
      state: "planning",
      phase: "analysis",
      summary: "ATEAM normalized the rough idea into a structured request.",
      updatedAt: createdAt,
    },
  }) as WorkflowRequest;

  const brief = buildWorkflowBriefUnsafe({
    idea,
    category,
    answers: {},
    intake: request.intake,
    request,
    runId,
  }) as WorkflowRun["brief"];

  let plan = buildWorkflowPlanUnsafe({
    request,
    category,
    brief,
    runId,
  }) as WorkflowPlan;

  plan = withTemplateId(plan, toText(template?.id || body.templateId, 80));

  const baseRun: WorkflowRun = {
    id: runId,
    createdTs: createdAt,
    updatedTs: createdAt,
    phase: "analysis",
    state: "planning",
    requestedBy: "public_web_edge",
    category,
    idea,
    title: toText(brief?.title, 180) || "ATEAM Workflow Run",
    questions: buildQuestions(request),
    answers: {},
    request,
    plan,
    brief,
    recommendedLane: toText(brief?.recommendedLane, 140),
    risks: buildWorkflowRisksUnsafe({ brief, answers: {}, category, request }),
    artifacts: {},
    approvals: {
      brief: {
        status: "requested",
        requestedAt: createdAt,
      },
      pack: {},
    },
    links: {
      ownerAgentId: toText(request.routing?.ownerAgentId, 80),
    },
    handoff: {},
    meta: {
      templateId: toText(template?.id || body.templateId, 80),
      source: "edge_fallback",
    },
    stateHistory: [
      {
        state: "planning",
        phase: "analysis",
        reason: "run_created",
        actor: "public",
        createdAt,
      },
    ],
  };

  const reviewRun = applyState(baseRun, {
    phase: "brief_approval",
    state: "awaiting_approval",
    reason: "plan_ready",
    actor: "system",
    summary: "ATEAM prepared a visible plan and is waiting for approval.",
  });

  return {
    ok: true,
    localFallback: true,
    run: persistRun(sessionId, reviewRun),
    catalog,
  };
}

function listRunsForSession(sessionId: string, searchParams: URLSearchParams) {
  const limit = Math.max(1, Math.min(24, Number(searchParams.get("limit") || "12")));
  const category = toText(searchParams.get("category"), 60).toLowerCase();
  const state = toText(searchParams.get("state"), 60).toLowerCase();
  let runs = getSessionRuns(sessionId);
  if (category && category !== "all") runs = runs.filter((run) => String(run.category || "").toLowerCase() === category);
  if (state && state !== "all") runs = runs.filter((run) => String(run.state || "").toLowerCase() === state);
  return {
    ok: true,
    localFallback: true,
    runs: runs.slice(0, limit).map((run) => enrichRun(run)),
    catalog: getCatalog(),
  };
}

function getRunForSession(sessionId: string, runId: string) {
  const run = findRun(sessionId, runId);
  if (!run) throw new Error("ATEAM could not find that edge fallback run anymore.");
  return {
    ok: true,
    localFallback: true,
    run: enrichRun(run),
    catalog: getCatalog(),
  };
}

function updateRunAnswersForSession(sessionId: string, runId: string, body: Record<string, unknown>) {
  const run = findRun(sessionId, runId);
  if (!run) throw new Error("ATEAM could not find that edge fallback run anymore.");
  const answers = body.answers && typeof body.answers === "object" ? cloneJson(body.answers as Record<string, string>) : {};
  const intake = body.intake && typeof body.intake === "object" ? cloneJson(body.intake as WorkflowIntake) : run.request?.intake || {};
  const planPatch = body.plan && typeof body.plan === "object" ? cloneJson(body.plan as Record<string, unknown>) : {};
  const templateId = toText(body.templateId, 80) || toText(run.meta?.templateId, 80);

  const request = buildWorkflowRequestUnsafe({
    idea: run.idea,
    category: run.category,
    intake,
    answers,
    runId: run.id,
    previousRequest: run.request || {},
    snapshot: {
      state: "awaiting_approval",
      phase: "brief_approval",
      summary: "ATEAM refreshed the run with the latest guidance.",
      updatedAt: nowIso(),
    },
  }) as WorkflowRequest;

  const brief = buildWorkflowBriefUnsafe({
    idea: run.idea,
    category: run.category,
    answers,
    intake: request.intake,
    request,
    runId: run.id,
  }) as WorkflowRun["brief"];

  let plan = buildWorkflowPlanUnsafe({
    request,
    category: run.category,
    brief,
    runId: run.id,
  }) as WorkflowPlan;

  const meaningfulPatch = Boolean(
    toText((planPatch as { summary?: string })?.summary, 120) ||
      Array.isArray((planPatch as { proposedSteps?: unknown[] })?.proposedSteps) ||
      Array.isArray((planPatch as { blockers?: unknown[] })?.blockers) ||
      toText((planPatch as { editorNotes?: string })?.editorNotes, 120) ||
      toText(templateId, 80)
  );

  if (meaningfulPatch) {
    plan = applyWorkflowPlanPatchUnsafe({
      basePlan: {
        ...plan,
        editable: {
          ...(plan.editable || {}),
          templateId,
        },
      },
      patch: {
        ...(planPatch || {}),
        templateId,
      },
      actor: "public_edge",
    }) as WorkflowPlan;
  } else {
    plan = withTemplateId(plan, templateId);
  }

  const nextRun = persistRun(sessionId, {
    ...run,
    updatedTs: nowIso(),
    answers,
    request,
    brief,
    plan,
    title: toText(brief?.title, 180) || run.title,
    phase: "brief_approval",
    state: "awaiting_approval",
    questions: buildQuestions(request),
    recommendedLane: toText(brief?.recommendedLane, 140) || run.recommendedLane,
    risks: buildWorkflowRisksUnsafe({
      brief,
      answers,
      category: run.category,
      request,
    }) as string[],
    approvals: {
      ...run.approvals,
      brief: {
        ...(run.approvals?.brief || {}),
        status: "requested",
        requestedAt: run.approvals?.brief?.requestedAt || nowIso(),
      },
    },
    meta: {
      ...(run.meta || {}),
      templateId,
      source: "edge_fallback",
    },
    stateHistory: appendStateHistory(run.stateHistory, {
      state: "awaiting_approval",
      phase: "brief_approval",
      reason: "answers_captured",
      actor: "public",
      createdAt: nowIso(),
    }),
  });

  return {
    ok: true,
    localFallback: true,
    run: nextRun,
    catalog: getCatalog(),
  };
}

function approveRunForSession(sessionId: string, runId: string, body: Record<string, unknown>) {
  const run = findRun(sessionId, runId);
  if (!run) throw new Error("ATEAM could not find that edge fallback run anymore.");
  const decision = toText(body.decision, 40).toLowerCase();
  const gate = toText(body.gate, 40).toLowerCase();
  const updatedAt = nowIso();

  if (gate === "brief" && decision === "regenerate") {
    const regenerated = applyState(run, {
      phase: "brief_approval",
      state: "awaiting_approval",
      reason: "plan_regenerated",
      actor: "public",
      summary: "ATEAM refreshed the visible plan using the latest context.",
    });
    regenerated.plan = withTemplateId(regenerated.plan as WorkflowPlan, toText(run.plan?.editable?.templateId || run.meta?.templateId, 80));
    return {
      ok: true,
      localFallback: true,
      run: persistRun(sessionId, regenerated),
      catalog: getCatalog(),
    };
  }

  if (gate === "brief" && decision === "rejected") {
    const rejected = applyState(run, {
      phase: "archived",
      state: "failed",
      reason: "brief_rejected",
      actor: "public",
      summary: "The run was stopped before execution because the plan was rejected.",
    });
    rejected.approvals = {
      ...rejected.approvals,
      brief: {
        ...(rejected.approvals?.brief || {}),
        status: "rejected",
        decidedAt: updatedAt,
        decidedBy: "public_edge",
      },
    };
    rejected.evaluation = buildWorkflowEvaluationUnsafe({
      run: rejected,
      outcome: "rejected",
    }) as WorkflowEvaluation;
    return {
      ok: true,
      localFallback: true,
      run: persistRun(sessionId, rejected),
      catalog: getCatalog(),
    };
  }

  if (gate === "brief" && decision === "approved") {
    const approved = applyState(run, {
      phase: "initiation",
      state: "executing",
      reason: "brief_approved",
      actor: "public",
      summary: "The plan was approved and ATEAM moved into execution.",
    });
    approved.approvals = {
      ...approved.approvals,
      brief: {
        ...(approved.approvals?.brief || {}),
        status: "approved",
        decidedAt: updatedAt,
        decidedBy: "public_edge",
      },
    };
    return {
      ok: true,
      localFallback: true,
      run: persistRun(sessionId, approved),
      catalog: getCatalog(),
    };
  }

  if (gate === "pack" && decision === "approved") {
    const completed = applyState(run, {
      phase: "handoff",
      state: "completed",
      reason: "pack_approved",
      actor: "public",
      summary: "ATEAM completed the run and prepared the handoff pack.",
    });
    completed.approvals = {
      ...completed.approvals,
      pack: {
        ...(completed.approvals?.pack || {}),
        status: "approved",
        requestedAt: completed.approvals?.pack?.requestedAt || updatedAt,
        decidedAt: updatedAt,
        decidedBy: "public_edge",
      },
    };
    completed.handoff = buildWorkflowHandoffUnsafe({ run: completed });
    completed.evaluation = buildWorkflowEvaluationUnsafe({
      run: completed,
      outcome: "completed",
    }) as WorkflowEvaluation;
    return {
      ok: true,
      localFallback: true,
      run: persistRun(sessionId, completed),
      catalog: getCatalog(),
    };
  }

  throw new Error("ATEAM edge fallback could not process that approval action.");
}

function generatePackForSession(sessionId: string, runId: string) {
  const run = findRun(sessionId, runId);
  if (!run) throw new Error("ATEAM could not find that edge fallback run anymore.");
  const packaging = applyState(run, {
    phase: "pack_approval",
    state: "generating_artifact",
    reason: "pack_generating",
    actor: "system",
    summary: "ATEAM generated the decision pack and is preparing the final handoff.",
  });
  packaging.artifacts = buildWorkflowPackUnsafe({ run: packaging });
  packaging.approvals = {
    ...packaging.approvals,
    pack: {
      ...(packaging.approvals?.pack || {}),
      status: "requested",
      requestedAt: nowIso(),
    },
  };
  return {
    ok: true,
    localFallback: true,
    run: persistRun(sessionId, packaging),
    catalog: getCatalog(),
  };
}

function edgeJson(payload: unknown, sessionId: string, isNewSession: boolean, status = 200) {
  const response = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-ateam-fallback": "edge-demo",
    },
  });
  if (isNewSession) {
    response.cookies.set(EDGE_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60,
    });
  }
  return response;
}

export async function handleAteamEdgeFallback(request: Request, path: string, init?: RequestInit) {
  const { sessionId, isNew } = getSessionId(request);
  const url = new URL(path, "https://unalabs.cloud");
  const method = String(init?.method || "GET").toUpperCase();
  const pathname = url.pathname;
  const body = parseBody(init);

  try {
    if (pathname === "/api/ateam/workflow/runs" && method === "GET") {
      return edgeJson(listRunsForSession(sessionId, url.searchParams), sessionId, isNew);
    }

    if (pathname === "/api/ateam/workflow/runs" && method === "POST") {
      return edgeJson(createRunForSession(sessionId, body), sessionId, isNew);
    }

    const match = pathname.match(/^\/api\/ateam\/workflow\/runs\/([^/]+)(?:\/(answers|approve|generate-pack))?$/i);
    if (!match) {
      return edgeJson({ ok: false, message: "ATEAM edge fallback does not recognize this workflow route." }, sessionId, isNew, 404);
    }

    const runId = decodeURIComponent(match[1] || "");
    const action = String(match[2] || "").toLowerCase();

    if (!action && method === "GET") {
      return edgeJson(getRunForSession(sessionId, runId), sessionId, isNew);
    }
    if (action === "answers" && method === "POST") {
      return edgeJson(updateRunAnswersForSession(sessionId, runId, body), sessionId, isNew);
    }
    if (action === "approve" && method === "POST") {
      return edgeJson(approveRunForSession(sessionId, runId, body), sessionId, isNew);
    }
    if (action === "generate-pack" && method === "POST") {
      return edgeJson(generatePackForSession(sessionId, runId), sessionId, isNew);
    }

    return edgeJson({ ok: false, message: "ATEAM edge fallback could not handle this workflow request." }, sessionId, isNew, 405);
  } catch (error) {
    return edgeJson(
      {
        ok: false,
        message: error instanceof Error ? error.message : "ATEAM edge fallback failed.",
      },
      sessionId,
      isNew,
      500
    );
  }
}

export async function shouldUseAteamEdgeFallback(response: Response) {
  const text = await response.clone().text();
  return shouldUseLocalWorkflowFallback(text, response.status);
}
