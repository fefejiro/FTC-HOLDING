export const ateamModeStageLabels = ["Memory", "Office", "Team", "Factory"] as const;

export const ateamModeStages = [
  {
    title: ateamModeStageLabels[0],
    eyebrow: "Context memory",
    description:
      "ATEAM starts by grounding the request in context, constraints, and prior signal before anything moves.",
    detail: "Goals, history, and the real shape of the ask stay visible."
  },
  {
    title: ateamModeStageLabels[1],
    eyebrow: "Office routing",
    description:
      "Office routes the ask, sets the operating lane, and decides what deserves attention first.",
    detail: "Triage, timing, and the next move become explicit."
  },
  {
    title: ateamModeStageLabels[2],
    eyebrow: "Crew visibility",
    description:
      "Team keeps owners, handoffs, and live activity visible so the work does not disappear into a black box.",
    detail: "People, ownership, and current responsibility stay legible."
  },
  {
    title: ateamModeStageLabels[3],
    eyebrow: "Factory floor",
    description:
      "Factory turns the scoped brief into visible build, QA, review, and ship movement people can actually follow.",
    detail: "Execution is shown as a floor, not hidden behind a promise."
  }
] as const;

export const ateamModeHighlights = [
  "Memory keeps the brief grounded in context instead of vague prompt input",
  "Office shows the routing desk where attention and priority get assigned",
  "Team keeps owners and handoffs visible while the run is active",
  "Factory exposes the delivery floor instead of flattening everything into step numbers"
] as const;

export const ateamModeSupportPoints = [
  "Memory-led context",
  "Office orchestration",
  "Team visibility",
  "Factory delivery floor"
] as const;

export const ateamModeSummary =
  "ATEAM inside Una Labs keeps the path from rough idea to owned handoff visible through Memory, Office, Team, and Factory.";
