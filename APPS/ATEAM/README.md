# ATEAM

ATEAM is an AI-native work operating system with:

- a private operator surface (`/office`, `/team`, `/factory`, `/command-station`)
- a workflow engine for intake, jobs, approvals, and artifacts
- optional local voice and Telegram bridge tooling for personal operation

This directory is the canonical source of truth for the ATEAM app. Local memory and runtime exhaust are intentionally kept separate from source files.

## Quick Start

From `APPS/ATEAM`:

```powershell
npm install
npm run start:server
```

Open `http://localhost:3000/office`.

For a no-key local stub run:

```powershell
Copy-Item .env.example .env
# then set LLM_MODE=stub in .env
npm run start:server
```

Supabase CLI is now available locally from this repo as a dev dependency. From `APPS/ATEAM`, use:

```powershell
npm run supabase:status
npm run supabase:login
npm run supabase:projects
npm run supabase:preflight
npm run storage:preflight
```

Notes:

- `supabase:start`, `supabase:status`, and other local stack commands require Docker Desktop.
- Remote project commands such as `supabase:projects`, `supabase:link`, and `supabase:db:push` require a Supabase access token from `npm run supabase:login`.
- In non-interactive shells like Codex, automatic browser login does not work. Use `supabase login --token <token>` in a normal terminal or set `SUPABASE_ACCESS_TOKEN` before running remote CLI commands here.
- `SUPABASE_PROJECT_REF` is the expected project identifier for scripted remote cutover commands.
- The current preferred managed runtime path is `ATEAM_STORAGE_BACKEND=postgres` with `ATEAM_DATABASE_URL` (or `DATABASE_URL`) pointed at the shared Supabase Postgres database.

## Runtime and Stack

- Frontend: static HTML/CSS/JS (`Public/index.html`, `Public/style.css`, `Public/app.js`)
- Backend: Node.js (ESM) + Express 5 (`Server/server.js`)
- AI provider: OpenAI Responses API with local stub fallback
- Voice provider: ElevenLabs TTS (optional)
- State persistence: local JSON/audio files in `memory/` for dev, with durable workflow storage now available through the shared Supabase-ready repository layer
- Test framework: Jest (`Server/__tests__`)

## Canonical Scripts

From `APPS/ATEAM`:

- `npm run start:server` - start the main local ATEAM server
- `npm run start:public` - run the server in public-workflow-only mode
- `npm run start:bridge` - start the local bridge on port `3001`
- `npm run start:phone` - start the phone voice bridge
- `npm run start:telegram` - start the Telegram gateway
- `npm run launch:office` - launch the local Office UI with a health check
- `npm run clean:local` - remove local runtime exhaust (`.local`, coverage, temp cwd markers)
- `npm run test:backend` - run backend tests
- `npm run verify:server` - quick syntax verification for server entrypoints

## Entrypoints and Boundaries

- Frontend entrypoint: `Public/index.html` -> `app.js`
- Backend entrypoint: `Server/server.js`
- Root entrypoint: `npm run start:server` (from `APPS/ATEAM`)

Keep these directories mentally separate:

- Source: `Public/`, `Server/`, `telegram-gateway/`, `Docs/`, `tools/`
- Local state: `memory/`
- Local runtime exhaust: `Server/.local/`, `Server/coverage/`, `telegram-gateway/.local/`, `Public/tmpclaude-*`

## Mission Control UI

ATEAM ships with a Mission Control UI shell and SPA-style routes served by the Express catch-all in `Server/server.js`.

Key files:

- Shell + routes + pages: `Public/index.html`
- Theme + layout styling: `Public/style.css`
- Page renderers + mission control behavior: `Public/app.js`
- Shared browser modules: `Public/modules/config.js`, `Public/modules/browser-utils.js`

Seeded local-first UI data is stored in `localStorage`:

- Memory journal: `MC_MEMORY_JOURNAL_V1`, UI state: `MC_MEMORY_JOURNAL_UI_V1`
- Scheduled tasks: `MC_SCHEDULED_TASKS_V1`
- Pixel office layout: `MC_OFFICE2_V1`
- Pixel factory items: `MC_FACTORY_V1`

Integration notes:

- The Office pixel room (`/office`) opens a Command Station drawer that reuses the existing Command Station panel from the Agents page (`/agents`).
- The Talk route (`/talk`, or `/ateam/operator/talk` behind the ops worker) is now the fastest intake surface: type the rough request or start voice intake first, then open session details only when you need transcript/timeline controls.
- The frontend supports being proxied under `/ateam`, but the public production surface now routes through the Railway API and Cloudflare Worker/Pages stack instead of depending on a local wrapper story.

## Telegram Remote Control

ATEAM includes a companion service that connects Telegram to the local event log and orchestrator:

- Service: `APPS/ATEAM/telegram-gateway`
- Long polling only (no webhooks)
- Allowlist-based (single Telegram user ID)
- Writes inbound/outbound Telegram messages into ATEAM event storage

See `APPS/ATEAM/telegram-gateway/README.md` for setup and run instructions.

## Local Bridge

ATEAM also supports a minimal local execution bridge for phone-to-laptop task handoff:

- File: `APPS/ATEAM/Server/bridge.js`
- Transport: `POST /run`
- Modes: `codex` or `shell`
- Protection: `x-ateam-key` header must match `ATEAM_KEY`

Run it from `APPS/ATEAM`:

```powershell
$env:ATEAM_KEY="replace-this"
npm run start:bridge
```

## Public/Private Runtime Split

- Local operator app: full `Server/server.js` + `Public/*`
- Shared cloud runtime: same backend on Railway, now intended to run in `ATEAM_AUTH_MODE=trusted_proxy`
- Public route layer: `workers/ateam-edge` owns `https://unalabs.cloud/ateam*` and only proxies public workflow endpoints
- Private route layer: `workers/ateam-ops` is the dedicated operator proxy for `https://ops.unalabs.cloud`

Public flow contract:

- `Intake`: capture the rough idea and short clarifiers
- `System`: expose run state, routing, movement reason, and blockers
- `Work`: show public-safe jobs and timeline movement
- `Output`: return run-owned artifacts and the project handoff

Private operator contract:

- `/ateam/operator/*` keeps the full Mission Control shell
- `/ateam/operator/talk` now opens as a simplified intake surface with text + voice first and advanced session controls behind a session-details toggle
- approvals, logs, overrides, Office, Team, Factory, and Memory stay private
- Cloudflare Access authenticates the browser on `ops.unalabs.cloud`, the ops worker validates the Access JWT (`CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD`), then injects trusted scope headers to Railway server-side only
- Direct browser-supplied `Authorization` / `X-ATEAM-*` headers are no longer the intended operator trust model
- If Access is not configured yet, the ops worker can fall back to secure Basic Auth so the private runtime is still usable without exposing operator APIs publicly

## API Surface

- Health/config: `GET /health`
- Agent orchestration: `POST /agent/command`, `POST /agent/command/stream`, `POST /command` (legacy)
- Task/thread: `GET /task/thread/:taskId`, `POST /task/thread`, `POST /task/update`, `GET /tasks`, `GET /task/status/:taskId`
- Voice: `POST /voice/speak`, `GET /voice/capabilities`
- Event log: `GET /events/:sessionId`, `POST /events/:sessionId`
- Workflow runs: `GET /api/workflow/runs`, `POST /api/workflow/runs`, `GET /api/workflow/runs/:runId`
- Workflow actions: `POST /api/workflow/runs/:runId/answers`, `POST /api/workflow/runs/:runId/approve`, `POST /api/workflow/runs/:runId/generate-pack`
- Speech clarity: `/speech/*`

## Environment Variables

Defined in `.env.example` and code paths in `Server/server.js` + `Server/lib/*`.

Primary groups:

- Core runtime: `PORT`, `LLM_MODE`, `ATEAM_PROMPT_EVENT_SESSION_ID`, `ATEAM_PUBLIC_SERVICE_MODE`, `ATEAM_ALLOWED_ORIGINS`
- Trusted proxy runtime: `ATEAM_AUTH_MODE=trusted_proxy`, `ATEAM_TRUSTED_PROXY_KEY`, `ATEAM_OPERATOR_AUDIT_SESSION_ID`
- Durable workflow storage: `ATEAM_STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_TABLE_ATEAM_*`
- OpenAI: `OPENAI_API_KEY`, model, temperature, stream, timeout variables
- ElevenLabs: API key, model/output format, voice IDs, tuning, timeout variables
- Bridge/phone: `ATEAM_KEY`, `ATEAM_BRIDGE_*`, `PHONE_PORT`
- Event log internals: `ATEAM_EVENT_LOG_DIR`, `ATEAM_EVENT_LOG_RENAME_RETRIES`, `ATEAM_EVENT_LOG_RENAME_BACKOFF_MS`

## Docs

Start here for architecture and cleanup context:

- `Docs/README.md`
- `Docs/product-v1/README.md`
- `Docs/ARCHITECTURE.md`
- `Docs/MIGRATION_READINESS.md`
- `RUNBOOK.md`

ATEAM V1 product direction now lives under `Docs/product-v1/`.

- `Docs/product-v1/README.md` is the entry point
- `DOCS/ATEAM_PUBLIC_OPERATOR_HANDOVER_2026-03-24.md` is historical context only

Operator edge runtime:

- `workers/ateam-edge`
- `workers/ateam-ops`

Managed storage rollout:

- Workflow runs, jobs, and approvals now resolve through `Server/lib/storage/repositories.js`.
- `ATEAM_STORAGE_BACKEND=local` keeps the current SQLite/local behavior.
- `ATEAM_STORAGE_BACKEND=postgres` uses a direct PostgreSQL connection and auto-applies the tracked workflow schema from `supabase/migrations/20260327000100_ateam_workflow_base.sql`.
- `ATEAM_STORAGE_BACKEND=supabase` switches workflow runs, jobs, and approvals to Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are present.
- If Supabase is requested but not configured, ATEAM falls back safely to `local` and reports that fallback in `/health`.
- Canonical CLI migration lives at [`supabase/migrations/20260327000100_ateam_workflow_base.sql`](supabase/migrations/20260327000100_ateam_workflow_base.sql). The legacy schema reference remains at [`Docs/SUPABASE_WORKFLOW_SCHEMA.sql`](Docs/SUPABASE_WORKFLOW_SCHEMA.sql).
- Run `npm run supabase:login` and `npm run supabase:link` before remote CLI operations.
- `npm run supabase:preflight -- -RequireRemote` checks whether token, project ref, URL, and service-role inputs are ready for remote cutover.
- `npm run supabase:cutover` links the project, pushes the tracked migration, and can optionally migrate existing workflow data.
- `npm run migrate:workflow:postgres -- --source-http` migrates live workflow runs, jobs, and approvals directly into the managed Postgres backend.
- `npm run storage:cutover` is the one-command managed runtime cutover for the direct Postgres path.
- Optional migration helper: `npm run migrate:workflow:supabase -- --source-http` or `npm run migrate:workflow:supabase -- --source-db <sqlite-path>`

## Current Classification

Recommended classification: Hybrid (app + reusable engine).

Why:

- It is already a usable application (UI + workflow + backend APIs).
- It also contains extractable capability logic (agent routing, context bundling, event pipeline, workflow services).
- Some modules are reusable, but app-specific coupling still exists around local state and operator tooling.
