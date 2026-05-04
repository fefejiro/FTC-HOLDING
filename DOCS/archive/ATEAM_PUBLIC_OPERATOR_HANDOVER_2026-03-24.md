# ATEAM Public-to-Operator Handover

Date: 2026-03-24

## Why this note exists

ATEAM public workflow work was implemented first in `C:\FTC HOLDING`, while local testing was happening from the nested repo at `C:\FTC HOLDING\FTC-HOLDING`. That repo split made local `/ateam` keep showing the old static demo even though the newer workflow existed elsewhere.

This note records the synced state now living in:

- `C:\FTC HOLDING\FTC-HOLDING\APPS\ATEAM`
- `C:\FTC HOLDING\FTC-HOLDING\APPS\ftc-site`

## Product shape

ATEAM is now split into two layers:

1. Public Una Labs layer
   - Route: `/ateam`
   - Purpose: guided idea intake, brief shaping, pack generation, and handoff
   - Audience: guests and future clients

2. Operator Mission Control layer
   - Route: `/ateam/operator/...`
   - Purpose: real ATEAM surfaces such as Office, Projects, Pipeline, Factory, Memory, and Team
   - Audience: internal operators

The public route is not meant to expose raw internal Mission Control by default. It creates a workflow run, then links approved work into the operator runtime.

## Current end-to-end workflow

### Public flow

1. User opens `/ateam`.
2. User enters one idea plus a category.
3. Una Labs creates a workflow run through the ATEAM workflow API.
4. ATEAM asks follow-up questions.
   - Audience
   - Core outcome
   - Constraints
   - Signals
5. ATEAM turns the answers into a normalized brief.
6. Brief approval acts as the first human gate.
7. Once the brief is approved, ATEAM links operator work into Mission Control.
8. ATEAM generates the prototype pack.
   - Figma-looking mockup screens
   - clickable prototype frames
   - smoke summary
   - implementation doc sections
   - next steps
9. Pack approval acts as the second human gate.
10. The run can then hand off into `/work-with-ftc` with the workflow payload attached.

### Operator flow

When the brief is approved, the workflow service creates linked work items and makes the run visible to the operator runtime:

- Projects holds the workflow-generated project context
- Office owns routing and approvals
- Pipeline shows work progression
- Factory is where build/QA/review/ship work lands

## Workflow phases

The workflow model currently supports:

- `intake`
- `analysis`
- `brief_approval`
- `initiation`
- `prototype_pack`
- `pack_approval`
- `handoff`
- `archived`

## Key routes

### Public Una Labs routes

- `/ateam`
- `/work-with-ftc`

### Public same-origin workflow API routes in ftc-site

- `POST /api/ateam/workflow/runs`
- `GET /api/ateam/workflow/runs/:runId`
- `POST /api/ateam/workflow/runs/:runId/answers`
- `POST /api/ateam/workflow/runs/:runId/approve`
- `POST /api/ateam/workflow/runs/:runId/generate-pack`

These are proxy routes inside `ftc-site`. They forward to the real ATEAM server.

### Real ATEAM server routes

- `GET /api/workflow/runs`
- `POST /api/workflow/runs`
- `GET /api/workflow/runs/:runId`
- `POST /api/workflow/runs/:runId/answers`
- `POST /api/workflow/runs/:runId/approve`
- `POST /api/workflow/runs/:runId/generate-pack`

### Operator runtime route

- `/ateam/operator`
- `/ateam/operator/:path*`

These are rewritten by `ftc-site` to the real ATEAM runtime.

## Local dev commands

From repo root `C:\FTC HOLDING\FTC-HOLDING`:

```powershell
npm.cmd --prefix APPS/ATEAM/Server start
```

In a second terminal:

```powershell
npm.cmd --prefix APPS/ftc-site run dev
```

Then open:

- `http://localhost:3001/ateam`
- `http://localhost:3001/ateam/operator/projects`
- `http://localhost:3001/ateam/operator/office`
- `http://localhost:3001/ateam/operator/factory`

If already inside `APPS/ATEAM/Server`, run `npm.cmd start` instead of using `--prefix`.

## Environment assumptions

### Local

`ftc-site` falls back to:

- `ATEAM_UPSTREAM_ORIGIN = http://127.0.0.1:3000`

when `NODE_ENV=development` and no explicit upstream is configured.

### Production

Production still needs a hosted ATEAM runtime. Set:

- `ATEAM_UPSTREAM_ORIGIN`

to the deployed ATEAM origin before expecting public `/ateam/operator` routes to work outside localhost.

## Important caveats

### Repo split trap

If local `/ateam` ever shows the old four-step demo again, the first thing to check is which repo copy was launched.

Expected working repo for this handover:

- `C:\FTC HOLDING\FTC-HOLDING`

### Public ATEAM is not raw Talk Mode

The current public intake uses a guided workflow client, not the internal `/talk` screen. That is intentional:

- public users get a controlled, structured intake
- operator Mission Control stays real and separate
- approved runs still flow into Office, Projects, Pipeline, and Factory

If a future iteration wants a more conversational guest entry, it should wrap the workflow APIs in a public-safe chat shell instead of exposing raw internal Talk Mode directly.

### Public Office and Factory visibility

Right now the public route produces a real workflow run and links real operator work, but it does not animate the full Mission Control UI inline for guests. If needed later, add public-safe progress surfaces that reflect workflow state and linked work items without exposing the full operator runtime.

## Most important files

### ATEAM backend

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowRunStore.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/lib/sqliteDb.js`
- `APPS/ATEAM/Server/server.js`

### ATEAM frontend runtime

- `APPS/ATEAM/Public/index.html`
- `APPS/ATEAM/Public/style.css`
- `APPS/ATEAM/Public/app.js`

### Una Labs public integration

- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/ateam/[surface]/page.tsx`
- `APPS/ftc-site/app/api/ateam/workflow/...`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/lib/ateamHandoff.ts`
- `APPS/ftc-site/lib/ateamUpstream.ts`
- `APPS/ftc-site/app/components/WorkIntakeForm.tsx`
- `APPS/ftc-site/app/api/intake/route.ts`
- `APPS/ftc-site/next.config.js`

## What was synced on 2026-03-24

The nested repo was brought in line with the working root implementation for:

- ATEAM workflow backend
- ATEAM Mission Control base-path integration files
- Una Labs `/ateam` workflow client
- same-origin workflow API routes
- workflow handoff into `/work-with-ftc`
- docs and runbook updates tied to this workflow

## Recommended next step

If the product direction is:

"guest enters an idea, sees ATEAM Office and Factory doing the work, then gets a polished output pack and next steps"

the next build pass should add:

1. a public-safe AI intake shell on top of the existing workflow APIs
2. a lightweight Office/Factory progress visualization driven by workflow state
3. a clearer distinction between guest-facing progress and operator-only Mission Control

That keeps the real workflow intact while improving the feeling of "ATEAM is actively working on my idea."
