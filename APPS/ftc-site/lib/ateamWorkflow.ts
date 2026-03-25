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
  { value: "website", label: "Website" },
  { value: "lead-automation", label: "Lead automation" },
  { value: "product-app", label: "App" },
  { value: "internal-tool", label: "Internal tool" },
  { value: "ai-feature", label: "AI workflow" }
] as const;

export const ateamWorkflowSteps = [
  {
    key: "idea",
<<<<<<< HEAD
    label: "Idea input",
    detail: "Start with one clear problem or concept."
  },
  {
    key: "analysis",
    label: "Analysis",
    detail: "ATEAM asks focused follow-ups and shapes the brief."
  },
  {
    key: "brief",
    label: "Brief approval",
    detail: "A human gate confirms lane, scope, and constraints."
  },
  {
    key: "pack",
    label: "Prototype pack",
    detail: "Generate concept screens, clickable flow, smoke summary, and operator notes."
  },
  {
    key: "handoff",
    label: "Handoff",
    detail: "Carry the run into Una Labs intake with the pack attached."
=======
    label: "Idea in",
    detail: "Start with one clear problem."
  },
  {
    key: "analysis",
    label: "Office pass",
    detail: "ATEAM shapes the fast brief."
  },
  {
    key: "brief",
    label: "Factory output",
    detail: "ATEAM turns it into a visible pack."
  },
  {
    key: "pack",
    label: "Send on",
    detail: "Carry it into Una Labs or operator view."
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
  }
] as const;

export function formatWorkflowPhaseLabel(phase?: string | null) {
  const safe = String(phase || "").trim().replaceAll("_", " ");
  if (!safe) return "intake";
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}
