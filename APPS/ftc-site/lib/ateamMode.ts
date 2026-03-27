export const ateamModeStageLabels = ["Intake", "System", "Work", "Output"] as const;

export const ateamModeStages = [
  {
    title: "Intake",
    eyebrow: "Open narrative",
    description:
      "ATEAM starts by receiving the rough idea as-is, then pulling out the signal that matters.",
    detail: "The client does not need to pre-structure the request before work begins."
  },
  {
    title: "System",
    eyebrow: "State and routing",
    description:
      "ATEAM turns intake into a run, keeps the current stage legible, and explains why the next move happened.",
    detail: "State, ownership, movement reason, and blockers stay visible."
  },
  {
    title: "Work",
    eyebrow: "Visible execution",
    description:
      "ATEAM routes the run into jobs, shows who owns the work, and keeps the timeline readable enough to trust.",
    detail: "Jobs and timeline stay on the public-safe view without exposing admin controls."
  },
  {
    title: "Output",
    eyebrow: "Client-ready pack",
    description:
      "ATEAM produces artifacts, a decision pack, and a clean handoff into Una Labs delivery once the direction is clear.",
    detail: "Outputs stay tied to the run and can evolve into a real project."
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
  "System visibility",
  "Visible work state",
  "Client-ready output",
  "Operator control plane"
] as const;

export const ateamModeSummary =
  "ATEAM inside Una Labs turns rough ideas into intake, system visibility, visible work, and client-ready output that can become a real project.";
