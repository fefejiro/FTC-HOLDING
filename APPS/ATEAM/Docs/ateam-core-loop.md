---
title: ATEAM Core Loop — Phase 1
version: 1.0
locked: 2026-04-08
---

# ATEAM Core Loop

This document defines the canonical operating loop for Phase 1: from operator intent
to executing workflow. This is what a working ATEAM session looks like end-to-end.

---

## The Loop in Plain Language

1. **Operator states intent.** Types or speaks a goal into the entry view.
2. **ATEAM creates a run.** A WorkflowRun is created in `draft` state.
3. **Brief is generated.** Server builds a workflow brief: goal, plan, risks, questions.
4. **Operator reviews and approves.** Brief appears in Mission Control approvals queue.
5. **Run advances.** Approval decision moves the run from `awaiting_approval` → `approved` → `executing`.
6. **Execution pack is generated.** A decision pack (workItems, handoff, evaluation stub) is auto-generated.
7. **Operator sees run in flight.** Mission Control task list shows the run as active.

---

## Step-by-Step Flow

### Step 1 — Entry

**Surface:** `data-mc-page="entry"` view in `index.html`
**Trigger:** Operator submits the intent form (`#entry-form`)
**Handler:** `handleEntrySubmit()` in `app.js`
**Action:** `POST /api/workflow/runs` with `{ intake: { goal }, category, templateId }`

### Step 2 — Run Creation (Server)

**File:** `Server/lib/workflowService.js` → `startRun()`
**Action:**
- Creates WorkflowRun with state `draft`
- Creates an ApprovalRecord linked to the run (`approvalStore.create(...)`)
- Patches the ApprovalRecord payload with `{ workflowRunId, gate: "brief" }`
- Returns `{ run, approval }`

### Step 3 — Brief Generation

**File:** `Server/lib/workflowService.js` → `generatePack()` (called separately)
**Engine functions used:** `buildWorkflowRequest()`, `buildWorkflowPlan()`, `buildWorkflowBrief()`, `buildWorkflowRisks()`
**Trigger:** Either automatic after run creation or via `POST /api/workflow/runs/:id/pack`
**Run state during brief generation:** Advances from `draft` → `planning` → `awaiting_approval`

### Step 4 — Approval (Mission Control)

**Surface:** `data-mc-page="approvals"` view
**Handler:** `mcHandleApprovalDecision(approvalId, decision)` in `app.js`
**Action sequence:**
1. `apiDecideApproval(approvalId, decision)` — marks the ApprovalRecord `approved` or `rejected`
2. Reads `approval.payload.workflowRunId` and `approval.payload.gate`
3. `apiApproveWorkflowRun(runId, { gate, decision, actor })` — advances the WorkflowRun state
4. If approved: `apiGenerateWorkflowPack(runId)` — auto-generates execution pack

### Step 5 — State Advance (Server)

**File:** `Server/lib/workflowService.js` → `approveRun()`
**Action:**
- Records `approved` in stateHistory
- Transitions run to `executing`
- Returns updated run

### Step 6 — Execution Pack

**File:** `Server/lib/workflowService.js` → `generatePack()`
**Engine functions:** `buildWorkflowWorkItems()`, `buildWorkflowHandoff()`, `buildWorkflowEvaluation()`
**Output stored in:** `WorkflowRun.payload.pack`

### Step 7 — Visibility

**Surface:** `data-mc-page="tasks"` (dashboard) in Mission Control
**Data source:** `GET /api/workflow/runs?status=executing` → `apiListWorkflowRuns()`
**Shows:** Run title, state badge, owner, created time

---

## API Endpoints Involved

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/workflow/runs` | Create new run |
| POST | `/api/workflow/runs/:id/pack` | Generate brief/pack for run |
| POST | `/api/workflow/runs/:id/approve` | Advance run state via approval |
| POST | `/api/approvals/:id/decision` | Mark approval record resolved |
| GET | `/api/workflow/runs` | List runs (filterable by status) |
| GET | `/api/workflow/runs/:id` | Get single run |
| GET | `/api/approvals` | List approvals (filterable by status) |

---

## What "Done" Looks Like for Phase 1

The core loop is complete when:
- [ ] Intent entered in entry view creates a real WorkflowRun in DB
- [ ] Brief appears in Mission Control approvals without manual intervention
- [ ] Operator approval in MC advances run to `executing`
- [ ] Run appears in dashboard task list as active
- [ ] Rejection leaves run in `failed` or `awaiting_approval` depending on gate type

No voice, no multi-agent routing, no external integrations required for Phase 1 completion.
