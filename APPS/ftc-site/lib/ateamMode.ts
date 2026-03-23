export const ateamModeStageLabels = ["Memory", "Office", "Team", "Factory"] as const;

export const ateamModeStages = [
  {
    title: ateamModeStageLabels[0],
    description:
      "ATEAM starts by grounding the request in context, goals, and durable memory before work moves."
  },
  {
    title: ateamModeStageLabels[1],
    description:
      "Office triages the ask, sets the operating lane, and routes the right attention to the right operator."
  },
  {
    title: ateamModeStageLabels[2],
    description:
      "Team keeps owners, handoffs, and active roles visible so the work does not disappear into black-box automation."
  },
  {
    title: ateamModeStageLabels[3],
    description:
      "Factory turns the scoped brief into tracked build, QA, review, and ship movement that people can actually follow."
  }
] as const;

export const ateamModeHighlights = [
  "Memory-first intake that keeps the brief grounded in context instead of vague prompt input",
  "Office routing that shows how ATEAM assigns attention and operating lanes",
  "Team visibility that makes ownership and handoffs legible during the run",
  "Factory delivery language that maps ideas into build, QA, review, and ship"
] as const;

export const ateamModeSupportPoints = [
  "Memory-led intake",
  "Office orchestration",
  "Team visibility",
  "Factory delivery"
] as const;

export const ateamModeSummary =
  "ATEAM mode shows how Memory, Office, Team, and Factory line up around a believable next step.";
