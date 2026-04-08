---
title: ATEAM Run Model — Phase 1
version: 1.0
locked: 2026-04-08
---

# ATEAM Run Model

This document defines the WorkflowRun object: what it contains, how it is built,
and what each field means. This is the central data structure of ATEAM.

---

## WorkflowRun Shape

```js
{
  id: "run_<uuid>",            // stable, unique, never reused
  title: "...",                // derived from intake.goal via deriveWorkflowTitle()
  state: "draft",              // canonical state — see ateam-state-machine.md
  category: "product-app",    // normalized workflow category
  templateId: "",              // optional, from WORKFLOW_CATEGORY_PRESETS
  ownerAgentId: "henry",       // agent_id of the coordinating agent
  requestedBy: "operator",     // actor who initiated the run
  createdAt: "ISO8601",
  updatedAt: "ISO8601",

  intake: {
    goal: "...",               // primary operator intent (up to 260 chars)
    context: "...",            // supporting context (up to 360 chars)
    desiredOutput: "...",      // what done looks like (up to 180 chars)
    constraints: "...",        // hard limits (up to 260 chars)
    nonGoals: "..."            // explicit exclusions (up to 260 chars)
  },

  request: { ... },            // built by buildWorkflowRequest() — structured from intake
  plan: { ... },               // built by buildWorkflowPlan() — phases, lanes, workItems
  brief: { ... },              // built by buildWorkflowBrief() — summary for approval
  risks: [],                   // built by buildWorkflowRisks()
  evaluation: { ... },         // built by buildWorkflowEvaluation() — success criteria
  handoff: { ... },            // built by buildWorkflowHandoff() — next-action doc

  approvals: {
    brief: "pending" | "approved" | "rejected",   // gate: brief approval
    pack: "pending" | "approved" | "rejected"     // gate: pack approval
  },

  stateHistory: [
    { state, phase, reason, actor, createdAt }    // last 20 entries
  ],

  meta: {
    workflowTimeline: [ ... ], // event log entries (last 80)
    answers: { ... },          // Q&A from questions phase
    snapshots: { ... }         // state-keyed snapshots
  },

  links: {
    approvalId: "apr_<uuid>",  // linked ApprovalRecord for current gate
    relatedRunIds: []
  }
}
```

---

## Key Field Rules

### `id`
- Format: `run_` + UUID, no hyphens stripped
- Generated server-side at creation. Never client-generated.

### `state`
- One of the values in `WORKFLOW_STATES` (see `ateam-state-machine.md`)
- Written by `workflowService.js` only. Never directly mutated by client.
- Normalized via `normalizeWorkflowState()` — unknown values default to `"queued"`

### `intake`
- Source of truth for operator intent. Everything else is derived from it.
- Normalized via `normalizeIntake()` in `workflowService.js`
- `goal` is the minimum required field. All others optional.

### `request`, `plan`, `brief`, `risks`, `evaluation`, `handoff`
- Built by pure functions in `workflowEngine.js`
- Never manually constructed in route handlers
- May be null/empty until the corresponding generation step runs

### `approvals`
- Tracks gate-level decisions on the run itself (not the ApprovalRecord)
- Separate from the `ApprovalStore` (which has its own record per gate)
- `approvals.brief` set to `"approved"` when `approveRun()` succeeds for brief gate

### `stateHistory`
- Append-only during a run's lifetime (capped at 20 entries)
- Each entry records: what state, why, who, when
- Created via `createStateHistoryEntry()` and `appendStateHistory()` in `workflowService.js`

### `meta.workflowTimeline`
- Human-readable event log (capped at 80 entries)
- Used for audit trail and eventually for timeline view in Mission Control

---

## ApprovalRecord

The ApprovalRecord is a separate object managed by `approvalStore.js`.
It is linked to a WorkflowRun via `payload.workflowRunId`.

```js
{
  id: "apr_<uuid>",
  status: "pending" | "approved" | "rejected" | "cancelled",
  requestedBy: "operator",
  policy: "...",              // human-readable approval policy (up to 120 chars)
  summary: "...",             // brief description for approver (up to 280 chars)
  createdTs: "ISO8601",
  payload: {
    workflowRunId: "run_...", // patched in after run creation
    gate: "brief" | "pack"   // which gate this approval covers
  }
}
```

**Link creation flow:**
1. `startRun()` creates both a WorkflowRun and an ApprovalRecord
2. `approvalStore.patchPayload(approval.id, { workflowRunId, gate })` links them
3. When MC reads the approval, it can find the run via `approval.payload.workflowRunId`

---

## WorkflowRun Lifecycle by State

See `ateam-state-machine.md` for full transition rules.

| State | What it means for the run |
|-------|--------------------------|
| `draft` | Just created; intake captured; no brief yet |
| `planning` | Brief is being or has been generated |
| `awaiting_approval` | Brief ready; waiting on operator decision |
| `approved` | Brief approved; transitional state before executing |
| `executing` | Active; execution pack generated; in-flight |
| `completed` | Done; all outputs delivered |
| `failed` | Terminal error or rejection |
| `queued` | Legacy / fallback state; avoid for new runs |
| `generating_artifact` | UI label only; maps to executing in practice |
| `escalated` | Requires human intervention beyond normal approval |
