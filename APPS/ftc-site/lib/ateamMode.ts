export const ateamModeStageLabels = ["Memory", "Office", "Team", "Factory"] as const;

export const ateamModeStages = [
  {
    title: "Intake",
    eyebrow: "Open narrative",
    description:
      "ATEAM starts by receiving the rough idea as-is, then pulling out the signal that matters.",
    detail: "The client does not need to pre-structure the request before work begins."
  },
  {
    title: "Routing",
    eyebrow: "Work OS",
    description:
      "ATEAM turns intake into a run, routes it into jobs, and keeps the next move visible.",
    detail: "State, ownership, and reasons for movement stay legible."
  },
  {
    title: "Artifacts",
    eyebrow: "Client-ready output",
    description:
      "ATEAM produces briefs, prototype direction, smoke notes, and decision-pack artifacts from the run.",
    detail: "Outputs stay tied to the execution that created them."
  },
  {
    title: "Conversion",
    eyebrow: "Delivery handoff",
    description:
      "Once the direction is clear, Una Labs takes the run into real execution with a stronger project handoff.",
    detail: "The public intake and private operator control plane stay connected."
  }
] as const;

export const ateamModeHighlights = [
  "Public intake creates a real workflow run instead of a dead-end form",
  "Jobs, artifacts, and state changes stay visible through the same system",
  "Timeline history explains why things moved, not just where they landed",
  "Runs can evolve into projects once the value is clear"
] as const;

export const ateamModeSupportPoints = [
  "Narrative intake",
  "Run-based artifacts",
  "Visible job state",
  "Operator control plane"
] as const;

export const ateamModeSummary =
  "ATEAM inside Una Labs turns rough ideas into structured runs, visible work, and client-ready artifacts that can become real projects.";
