# Request Object Spec

## Purpose

The request object is the immutable source of truth for user intent across intake, planning, execution, artifact creation, and evaluation.

It prevents user intent from being spread loosely across `idea`, `answers`, `brief`, and `meta`.

## Shape

```json
{
  "rawInput": "Build a public intake workflow that shows a visible plan before execution.",
  "intake": {
    "goal": "Show the user a clear first plan before execution.",
    "context": "Public users do not know what ATEAM will do next.",
    "desiredOutput": "Decision pack",
    "constraints": "Keep operator controls private.",
    "nonGoals": "Do not expose Mission Control internals."
  },
  "normalized": {
    "goal": "Show a visible first plan before execution.",
    "requestType": "workflow_reframe",
    "desiredArtifactType": "decision_pack",
    "inferredLane": "Internal Tool / Ops System",
    "audience": "Public users",
    "scopeSummary": "Public-safe intake, visible planning, approval gate, and artifact bundle."
  },
  "assumptions": [
    "Goal was inferred from the rough idea because no explicit goal was supplied.",
    "ATEAM will produce a decision pack unless a different artifact is requested."
  ],
  "clarifiers": [
    {
      "id": "goal",
      "label": "Primary goal",
      "prompt": "What should feel clearly better first?"
    }
  ],
  "routing": {
    "recommendedLane": "Internal Tool / Ops System",
    "ownerAgentId": "henry",
    "reason": "The first pass is mostly about controlled workflow behavior and operator boundaries."
  },
  "snapshots": {
    "awaiting_approval": {
      "state": "awaiting_approval",
      "phase": "brief_approval",
      "summary": "ATEAM normalized the request and produced a visible plan.",
      "updatedAt": "2026-04-07T00:00:00.000Z",
      "runId": "wfr_example"
    }
  }
}
```

## Required Fields

- `rawInput`
- `intake`
- `normalized`
- `assumptions`
- `clarifiers`
- `routing`

## Optional Fields

- `snapshots`

## Normalization Rules

- Preserve the original rough idea exactly in `rawInput`
- Merge guided intake fields with any later answer patches
- Normalize goal, request type, artifact type, and lane explicitly
- Record assumptions instead of hiding them in prose
- Keep unresolved follow-ups in `clarifiers`
- Snapshot stage transitions into `snapshots` when the run changes materially

## Anti-Drift Rules

- Never overwrite `rawInput`
- Never silently remove constraints or non-goals during planning
- If context or desired output is inferred, record that in `assumptions`
- If the plan changes after user feedback, preserve the updated state in `snapshots`
- Treat `brief` as a downstream artifact, not the source of truth
