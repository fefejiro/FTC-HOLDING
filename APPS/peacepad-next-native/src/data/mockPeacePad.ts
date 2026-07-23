export type PremiumModule = {
  id: string;
  title: string;
  promise: string;
  testFocus: string;
  status: "prototype" | "research" | "blocked";
};

export type TimelineItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  sourceCount: number;
  safetyLabel: string;
};

export type GoalOption = {
  id: string;
  title: string;
  description: string;
};

export type EvidenceItem = {
  id: string;
  title: string;
  kind: string;
  linkedEvent: string;
  integrityNote: string;
  status: "raw" | "processed" | "reviewed" | "export-ready";
  tag: string;
};

export type BinderMetric = {
  label: string;
  value: string;
  note: string;
};

export type PremiumWorkflow = {
  id: string;
  title: string;
  subtitle: string;
  premiumSignal: string;
};

export type ExportPackage = {
  id: string;
  title: string;
  includes: string[];
  caution: string;
};

export const premiumModules: PremiumModule[] = [
  {
    id: "calm-compose",
    title: "Calm Compose",
    promise: "Turn a heated draft into a child-centred message the user still controls.",
    testFocus: "Can a new user reach useful tone help in under 90 seconds?",
    status: "prototype"
  },
  {
    id: "parenting-time",
    title: "Parenting-Time Log",
    promise: "Record visits, public/supervised contact, missed pickups, and weekly child calls.",
    testFocus: "Can users log what happened without sounding accusatory or legalistic?",
    status: "prototype"
  },
  {
    id: "evidence-vault",
    title: "Evidence Vault",
    promise: "Keep screenshots, PDFs, receipts, and notes linked to timeline events.",
    testFocus: "Can uploads remain organized without exposing private data or implying legal proof?",
    status: "research"
  },
  {
    id: "court-prep",
    title: "Court Prep Workspace",
    promise: "Generate source-linked summaries for user or professional review.",
    testFocus: "Can summaries stay clearly labelled as drafts, not legal advice?",
    status: "research"
  }
];

export const timelineItems: TimelineItem[] = [
  {
    id: "visit-001",
    type: "Parenting time",
    title: "Public visit completed",
    detail: "Synthetic sample: two-hour visit completed at agreed location; user attached one note.",
    sourceCount: 1,
    safetyLabel: "User-entered record"
  },
  {
    id: "call-001",
    type: "Child call",
    title: "Weekly phone contact logged",
    detail: "Synthetic sample: call was scheduled, attempted, and marked completed.",
    sourceCount: 2,
    safetyLabel: "Draft timeline item"
  },
  {
    id: "doc-001",
    type: "Document",
    title: "Screenshot attached to event",
    detail: "Synthetic sample: file metadata shown without storing any real private document.",
    sourceCount: 1,
    safetyLabel: "Mock evidence"
  }
];

export const goalOptions: GoalOption[] = [
  {
    id: "calm-next-message",
    title: "Prepare my next message",
    description: "Get to a calmer draft before sending anything."
  },
  {
    id: "log-parenting-time",
    title: "Log parenting time",
    description: "Record visits, public contact, calls, and missed/rescheduled moments."
  },
  {
    id: "organize-records",
    title: "Organize my records",
    description: "Build a source-linked timeline from screenshots, PDFs, notes, and receipts."
  }
];

export const evidenceItems: EvidenceItem[] = [
  {
    id: "mock-screen-001",
    title: "Screenshot metadata sample",
    kind: "PNG metadata",
    linkedEvent: "Weekly child call",
    integrityNote: "Mock hash shown after upload; original file remains user-controlled.",
    status: "reviewed",
    tag: "completed child call"
  },
  {
    id: "mock-pdf-001",
    title: "PDF index sample",
    kind: "PDF",
    linkedEvent: "Parenting arrangement",
    integrityNote: "Draft summary links back to this source; no legal conclusion.",
    status: "processed",
    tag: "court order"
  }
];

export const calmRewriteSample =
  "Could we confirm the pickup time for Saturday? I want to keep the plan clear and child-focused. If the time needs to change, please let me know by Friday evening.";

export const binderMetrics: BinderMetric[] = [
  {
    label: "Evidence items",
    value: "24",
    note: "Screenshots, PDFs, receipts, call notes"
  },
  {
    label: "Parenting events",
    value: "9",
    note: "Visits, calls, changes, no-response logs"
  },
  {
    label: "Export readiness",
    value: "68%",
    note: "12 records still need review"
  }
];

export const premiumWorkflows: PremiumWorkflow[] = [
  {
    id: "binder",
    title: "Build my case binder",
    subtitle: "Upload, tag, review, and source-link records before export.",
    premiumSignal: "Premium because it saves hours of document chaos."
  },
  {
    id: "contact-proof",
    title: "Protect parenting contact",
    subtitle: "Log public visits, weekly child calls, missed attempts, and completed contact.",
    premiumSignal: "Premium because repeated patterns become visible."
  },
  {
    id: "lawyer-ready",
    title: "Prepare a lawyer-ready package",
    subtitle: "Generate an index, timeline, weekly summary, and source checklist.",
    premiumSignal: "Premium because the user leaves with a clean handoff."
  }
];

export const exportPackages: ExportPackage[] = [
  {
    id: "weekly-summary",
    title: "Weekly parenting-contact summary",
    includes: ["Completed child calls", "Missed/rescheduled attempts", "Attached source notes"],
    caution: "Draft for user/professional review. Not a legal filing."
  },
  {
    id: "binder-index",
    title: "Case binder index",
    includes: ["Evidence table", "Tags", "Dates", "Source references", "Review status"],
    caution: "Original files stay separate from AI summaries."
  },
  {
    id: "lawyer-handoff",
    title: "Lawyer-ready handoff package",
    includes: ["Timeline", "Document index", "Open questions", "Missing evidence prompts"],
    caution: "Designed to support a legal conversation, not replace one."
  }
];
