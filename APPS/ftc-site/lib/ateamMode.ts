export const ateamModeStageLabels = ["Intake", "System", "Work", "Output"] as const;

export const ateamModeStages = [
  {
    title: "Intake",
    eyebrow: "Structured intake",
    description:
      "ATEAM starts by capturing the request, context, constraints, and non-goals without losing the core signal.",
    detail: "The user does not need a polished brief before the workflow begins."
  },
  {
    title: "System",
    eyebrow: "Visible planning",
    description:
      "ATEAM turns intake into a visible run, shows the scoped plan, and explains why the next move is recommended.",
    detail: "State, ownership, assumptions, and blockers stay legible."
  },
  {
    title: "Work",
    eyebrow: "Governed execution",
    description:
      "ATEAM keeps the approval point visible so execution stays governed instead of silently moving ahead.",
    detail: "Human approval remains in the loop before outputs are packaged."
  },
  {
    title: "Output",
    eyebrow: "Decision-ready output",
    description:
      "ATEAM produces scoped artifacts and a clean handoff into Una Labs delivery once the direction is clear.",
    detail: "Outputs stay tied to the run and can evolve into a real project."
  }
] as const;

export const ateamModeHighlights = [
  "Public intake creates a real workflow run instead of a dead-end form",
  "Plans stay visible before approval so scope can be checked early",
  "Artifacts, state changes, and next steps stay tied to the same workflow",
  "Runs can evolve into delivery once the value and direction are clear"
] as const;

export const ateamModeSupportPoints = [
  "Narrative intake",
  "System visibility",
  "Visible work state",
  "Client-ready output",
  "Operator control plane"
] as const;

export const ateamModeSummary =
  "ATEAM inside Una Labs turns rough requests into structured intake, visible planning, governed execution, and decision-ready output that can become a real project.";
