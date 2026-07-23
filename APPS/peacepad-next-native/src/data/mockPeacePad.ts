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
    integrityNote: "Mock hash shown after upload; original file remains user-controlled."
  },
  {
    id: "mock-pdf-001",
    title: "PDF index sample",
    kind: "PDF",
    linkedEvent: "Parenting arrangement",
    integrityNote: "Draft summary links back to this source; no legal conclusion."
  }
];

export const calmRewriteSample =
  "Could we confirm the pickup time for Saturday? I want to keep the plan clear and child-focused. If the time needs to change, please let me know by Friday evening.";
