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
  ownerAgentId?: string;
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
  requestedBy: string;
  category: string;
  idea: string;
  title: string;
  questions: WorkflowQuestion[];
  answers: Record<string, string>;
  brief: Partial<WorkflowBrief>;
  recommendedLane: string;
  risks: string[];
  artifacts: WorkflowArtifacts;
  approvals: WorkflowApprovals;
  links: WorkflowLinks;
  handoff: Partial<WorkflowHandoffPayload> & Record<string, unknown>;
  meta: Record<string, unknown>;
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
