# Architecture V1

## Runtime Shape

ATEAM V1 is split across:

- `APPS/ATEAM`: canonical backend/runtime
- `APPS/ftc-site/app/ateam`: public shell

## Frontend

Public workflow surface:

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`

Current public responsibilities:

- guided intake
- visible plan review
- explicit approval actions
- progress/state display
- artifact preview/download
- recent runs visibility
- request template selection
- agent role library visibility
- pre-approval editable-plan scaffolding
- filtered history browsing by category and state

## Backend

Core workflow files:

- `Server/lib/workflowEngine.js`
- `Server/lib/workflowService.js`
- `Server/lib/workflowRunStore.js`
- `Server/server.js`

Responsibilities:

- normalize request intent
- generate visible plan
- persist request, plan, evaluation, state, and state history
- manage approvals
- expose workflow catalog metadata for templates and roles
- apply template defaults and persisted plan edits without changing the stable route surface
- generate the decision-pack artifact bundle
- return public-safe run views

## Storage

Current workflow truth lives in `ateam_workflow_runs`.

Backends supported:

- local SQLite
- direct Postgres
- Supabase-compatible Postgres layer

Additive V1 fields:

- `request_json`
- `plan_json`
- `evaluation_json`
- `state`
- `state_history_json`

Migration added:

- `supabase/migrations/20260407000100_ateam_v1_reframe.sql`

## Existing Supporting Stores

- `ateam_workflow_runs`: run truth
- `ateam_work_items`: public-safe job visibility
- `ateam_approvals`: approval gates

## Artifact Model

The existing decision pack remains the default V1 output.

In V1 documentation, treat it as a composed artifact bundle:

- normalized request summary
- visible plan
- primary artifact preview
- next-step recommendation

## Model Layer

OpenAI remains the primary provider for V1, with existing stub behavior retained for local fallback.

V1 remains single-agent and artifact-first.

## Phase 2 Additions

Phase 2 deliberately stays inside the same architecture instead of introducing a second orchestration layer.

Key additions in the current pass:

- catalog-style backend metadata for workflow templates and agent roles
- template-aware intake merging inside `workflowService.js`
- persisted editable-plan patches layered on top of the normalized plan in `workflowEngine.js`
- public UI support for templates, role visibility, editable-plan review, and richer recent-run browsing
