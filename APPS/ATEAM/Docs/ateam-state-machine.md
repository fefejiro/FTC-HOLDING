---
title: ATEAM State Machine — Phase 1
version: 1.0
locked: 2026-04-08
---

# ATEAM State Machine

This document defines the canonical WorkflowRun state machine as it exists in code.
All states, transitions, and rules are grounded in `workflowEngine.js` and `workflowService.js`.

---

## Canonical States

Defined in `WORKFLOW_STATES` (`Server/lib/workflowEngine.js:322`):

```
draft
queued              ← legacy fallback; normalizeWorkflowState default
planning
awaiting_approval
approved
executing
generating_artifact ← UI label only; treat as executing
completed
failed
escalated
```

`normalizeWorkflowState(value)` — if value is not in this list, returns `"queued"`.
New code should never produce `"queued"` intentionally. It is the safe default for unknown input.

---

## Canonical Transition Graph

```
                  [intake submitted]
                        │
                        ▼
                      draft
                        │
              [brief generation starts]
                        │
                        ▼
                     planning
                        │
                 [brief complete]
                        │
                        ▼
               awaiting_approval
                    │       │
           [approved]       [rejected]
                │                │
                ▼                ▼
            approved           failed
                │
        [execution pack generated]
                │
                ▼
            executing
            │       │
     [done] │       │ [error]
            ▼       ▼
        completed  failed
```

`escalated` is a side branch from any active state when human intervention is required.
It does not automatically resolve to any other state.

---

## Transitions by Code Location

### `startRun()` — `workflowService.js`
- Creates run with state `"draft"`
- No transition occurs at creation

### `generatePack()` — `workflowService.js`
- Advances `draft` → `planning` at start
- Advances `planning` → `awaiting_approval` when brief is ready
- State history entries added for each step

### `approveRun()` — `workflowService.js`
- Input: runId, gate, actor
- Records `"approved"` in stateHistory
- Transitions run to `"executing"`
- Sets `run.approvals[gate] = "approved"`

### `mcHandleApprovalDecision()` — `app.js` (client)
- Reads `approval.payload.workflowRunId` and `approval.payload.gate`
- Calls `POST /api/workflow/runs/:id/approve` → `approveRun()` on server
- If approved: also triggers pack generation

---

## Phase → State Mapping

`mapWorkflowPhaseToState(phase)` — `workflowEngine.js:557`

| Phase | State |
|-------|-------|
| `intake` | `draft` |
| `analysis` | `planning` |
| `brief_approval` | `awaiting_approval` |
| `initiation` | `approved` |
| `prototype_pack` | `executing` |
| `pack_approval` | `awaiting_approval` |
| `handoff` | `completed` |
| `archived` | `completed` |

This mapping is used when importing or reconstructing run state from phase-based records.
New runs should use state directly; phase is a secondary label.

---

## Approval Gates

A WorkflowRun can have multiple approval gates. Phase 1 defines two:

| Gate | Timing | Approves |
|------|--------|---------|
| `brief` | After planning, before executing | The plan and brief |
| `pack` | After pack generation (optional in Phase 1) | The execution pack |

Each gate creates one ApprovalRecord. The gate name is stored in `approval.payload.gate`.

---

## State Rules

1. **States are write-once per transition.** A run in `executing` does not go back to `planning`.
2. **`completed` and `failed` are terminal.** No transitions out. A new run must be started.
3. **`approved` is transitional.** It should not persist; execution begins immediately.
4. **`queued` is a fallback.** Avoid producing it. If a run ends up in `queued`, it means normalization failed.
5. **UI labels vs. states.** `generating_artifact` and `escalated` may appear as status badges but do not gate transitions. The underlying state remains `executing` or `awaiting_approval` respectively.

---

## stateHistory Entry Format

Each state transition should produce a history entry:

```js
{
  state: "executing",           // canonical state after transition
  phase: "prototype_pack",      // optional phase label
  reason: "Brief approved by operator",
  actor: "operator",            // who triggered the transition
  createdAt: "ISO8601"
}
```

Written by `appendStateHistory()` in `workflowService.js`.
Capped at 20 entries per run.

---

## Divergence Notes (as of 2026-04-08)

| Item | Code reality | Target |
|------|-------------|--------|
| `normalizeWorkflowState` default | Returns `"queued"` for unknown | Should return `"draft"` for new intake — tracked, not fixed yet |
| `generating_artifact` in WORKFLOW_STATES | Present | Should be UI-only label; left in for backwards compatibility |
| `escalated` in WORKFLOW_STATES | Present | No transition logic wired; placeholder state |
