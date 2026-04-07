export type WorkflowPhase =
  | "intake"
  | "analysis"
  | "brief_approval"
  | "initiation"
  | "prototype_pack"
  | "pack_approval"
  | "handoff"
  | "archived";

export type WorkflowQuestion = {
  id: string;
  label: string;
  prompt: string;
  hint?: string;
  placeholder?: string;
  reason?: string;
};

export type WorkflowIntake = {
  goal?: string;
  context?: string;
  desiredOutput?: string;
  constraints?: string;
  nonGoals?: string;
};

export type WorkflowRequest = {
  rawInput: string;
  intake: WorkflowIntake;
  normalized: {
    goal: string;
    requestType: string;
    desiredArtifactType: string;
    inferredLane: string;
    audience?: string;
    scopeSummary?: string;
  };
  assumptions: string[];
  clarifiers: WorkflowQuestion[];
  routing: {
    recommendedLane: string;
    ownerAgentId: string;
    reason: string;
  };
  snapshots?: Record<
    string,
    {
      state: string;
      phase: string;
      summary: string;
      updatedAt: string;
      runId?: string;
    }
  >;
};

export type WorkflowPlan = {
  summary: string;
  proposedSteps: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  expectedArtifact: {
    type: string;
    title: string;
    summary: string;
  };
  assumptions: string[];
  blockers: string[];
  approvalActions: string[];
  singleAgent?: {
    ownerAgentId: string;
    lane: string;
  };
};

export type WorkflowEvaluation = {
  intentFidelity: number;
  scopeAdherence: number;
  artifactCompleteness: number;
  assumptionDiscipline: number;
  humanCorrectionNeeded: string;
  finalStatus: string;
  summary: string;
};

export type WorkflowBrief = {
  title: string;
  summary: string;
  audience: string;
  scope?: string;
  primaryGoal: string;
  signals?: string;
  likelyUserValue?: string;
  recommendedDirection?: string;
  quickVerdict?: string;
  decisionNote?: string;
  constraints: string[];
  goals: string[];
  successCriteria: string[];
  recommendedLane: string;
  phasedPlan: string[];
  operatorNotes?: string[];
  runLabel?: string;
};

export type WorkflowArtifactScreen = {
  id: string;
  title: string;
  caption: string;
  highlights: string[];
};

export type WorkflowArtifactCheck = {
  label: string;
  result: string;
  note: string;
};

export type WorkflowArtifactSection = {
  title: string;
  items: string[];
};

export type WorkflowArtifacts = {
  mockup?: {
    title: string;
    summary: string;
    screens: WorkflowArtifactScreen[];
  };
  prototype?: {
    title: string;
    summary: string;
    frames: Array<{
      id: string;
      title: string;
      purpose: string;
      interactions: string[];
    }>;
    stack: string[];
  };
  smoke?: {
    status: string;
    summary: string;
    checks: WorkflowArtifactCheck[];
  };
  doc?: {
    title: string;
    summary: string;
    sections: WorkflowArtifactSection[];
  };
  nextSteps?: string[];
};

export type WorkflowApprovals = {
  brief?: {
    approvalId?: string;
    status?: string;
    requestedAt?: string | null;
    decidedAt?: string | null;
    decidedBy?: string;
  };
  pack?: {
    approvalId?: string;
    status?: string;
    requestedAt?: string | null;
    decidedAt?: string | null;
    decidedBy?: string;
  };
};

export type WorkflowLinks = {
  projectId?: string;
  workItemIds?: string[];
  jobIds?: string[];
  ownerAgentId?: string;
};

export type ArtifactKind =
  | "brief"
  | "mockup"
  | "prototype"
  | "smoke_report"
  | "document"
  | "asset";

export type TimelineEntry = {
  id: string;
  entityType: "job" | "run" | "project";
  entityId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type StatusNarrative = {
  currentStage: string;
  label: string;
  summary: string;
  movementReason?: string;
  blockerReason?: string;
  responsible?: string;
  updatedAt?: string;
};

export type ArtifactSummary = {
  id: string;
  runId: string;
  projectId?: string;
  jobId?: string;
  type: ArtifactKind | string;
  kind?: ArtifactKind | string;
  title: string;
  summary: string;
  contentRef?: string;
  version?: number;
  stage?: string;
  createdAt: string;
  updatedAt?: string;
  promotionStatus?: string;
  promotedAt?: string;
  previewItems?: string[];
};

export type JobSummary = {
  id: string;
  title: string;
  objective: string;
  status: "queued" | "in_progress" | "blocked" | "review" | "done" | "canceled" | string;
  stage: string;
  stageKey?: string;
  ownerAgentId?: string;
  blockerReason?: string;
  waitingReason?: string;
  risk?: string;
  projectId?: string;
  workflowRunId?: string;
  workflowStep?: string;
  approvalId?: string;
  history?: Array<Record<string, unknown>>;
  timeline?: TimelineEntry[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  status:
    | "intake"
    | "discovery"
    | "planning"
    | "build"
    | "review"
    | "delivery"
    | "archived"
    | string;
  summary: string;
  ownerAgentId?: string;
  workflowRunId?: string;
  recommendedLane?: string;
  jobIds?: string[];
  artifactIds?: string[];
  activeJobCount?: number;
  blockedJobCount?: number;
  updatedAt?: string;
};

export type PublicFlowModule = {
  key: "intake" | "system" | "work" | "output" | string;
  title: string;
  state: string;
  summary: string;
  detail: string;
};

export type PublicFlowUnderstanding = {
  title: string;
  summary: string;
  audience?: string;
  firstWin?: string;
  recommendedLane?: string;
};

export type PublicFlow = {
  modules: PublicFlowModule[];
  understanding: PublicFlowUnderstanding;
};

export type OperatorIdentity = {
  email: string;
  role: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
};

export type WorkflowHandoffPayload = {
  version: 2;
  runId: string;
  createdAtMs: number;
  idea: string;
  categoryValue: string;
  categoryLabel: string;
  recommendedLane: string;
  phase: string;
  brief: {
    title: string;
    summary: string;
    audience: string;
    primaryGoal: string;
    likelyUserValue?: string;
    recommendedDirection?: string;
    quickVerdict?: string;
    goals: string[];
    constraints: string[];
    successCriteria: string[];
    phasedPlan: string[];
  };
  artifacts: {
    mockupTitle: string;
    prototypeTitle: string;
    smokeSummary: string;
    docTitle: string;
  };
  nextSteps: string[];
  status?: string;
  approvedAt?: string;
  approvedBy?: string;
};

export type WorkflowRun = {
  id: string;
  createdTs: string;
  updatedTs: string;
  phase: WorkflowPhase;
  state?: string;
  stateHistory?: Array<{
    state: string;
    phase: string;
    reason?: string;
    actor?: string;
    createdAt: string;
  }>;
  requestedBy: string;
  category: string;
  idea: string;
  title: string;
  questions: WorkflowQuestion[];
  answers: Record<string, string>;
  request?: WorkflowRequest;
  plan?: WorkflowPlan;
  evaluation?: WorkflowEvaluation;
  brief: Partial<WorkflowBrief>;
  recommendedLane: string;
  risks: string[];
  artifacts: WorkflowArtifacts;
  approvals: WorkflowApprovals;
  links: WorkflowLinks;
  handoff: Partial<WorkflowHandoffPayload> & Record<string, unknown>;
  meta: Record<string, unknown>;
  project?: ProjectSummary;
  jobs?: JobSummary[];
  artifactSummaries?: ArtifactSummary[];
  recentArtifact?: ArtifactSummary | null;
  statusNarrative?: StatusNarrative;
  history?: TimelineEntry[];
  publicFlow?: PublicFlow;
};

export const ateamWorkflowCategories = [
  {
    value: "auto",
    label: "Auto detect",
    detail: "Let ATEAM pick the best lane from the rough idea."
  },
  {
    value: "website",
    label: "Website",
    detail: "Landing pages, service sites, or marketing surfaces."
  },
  {
    value: "lead-automation",
    label: "Lead flow",
    detail: "Quotes, booking, routing, and follow-up logic."
  },
  {
    value: "product-app",
    label: "App",
    detail: "A product, portal, or app-like user flow."
  },
  {
    value: "internal-tool",
    label: "Internal tool",
    detail: "Ops dashboards, team workflows, or back-office systems."
  },
  {
    value: "ai-feature",
    label: "AI workflow",
    detail: "AI-assisted decision, content, or workflow surfaces."
  }
] as const;

export type WorkflowCategoryValue = (typeof ateamWorkflowCategories)[number]["value"];

export const ateamWorkflowSteps = [
  {
    key: "idea",
    label: "Idea in",
    detail: "Drop the rough concept."
  },
  {
    key: "structure",
    label: "Structure",
    detail: "Pull out the audience and first win."
  },
  {
    key: "route",
    label: "Route",
    detail: "Pick the fastest believable lane."
  },
  {
    key: "build",
    label: "Build pass",
    detail: "Generate a quick concept and route map."
  },
  {
    key: "pack",
    label: "Decision pack",
    detail: "Bundle the output and next move."
  }
] as const;

const PHASE_LABELS: Record<string, string> = {
  intake: "Idea in",
  analysis: "Structure",
  brief_approval: "Route",
  initiation: "Route",
  prototype_pack: "Build pass",
  pack_approval: "Build pass",
  handoff: "Decision pack",
  archived: "Archived"
};

export function formatWorkflowPhaseLabel(phase?: string | null) {
  const safe = String(phase || "").trim().toLowerCase();
  if (!safe) return "Idea in";
  return PHASE_LABELS[safe] || safe.replaceAll("_", " ").replace(/^\w/, (char) => char.toUpperCase());
}
