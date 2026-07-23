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

