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

## Runtime and Stack

- Frontend: static HTML/CSS/JS (`Public/index.html`, `Public/style.css`, `Public/app.js`)
- Backend: Node.js (ESM) + Express 5 (`Server/server.js`)
- AI provider: OpenAI Responses API with local stub fallback
- Voice provider: ElevenLabs TTS (optional)
- State persistence: local JSON/audio files in `memory/` for dev, with cloud-ready workflow interfaces already in place
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

Seeded local-first UI data is stored in `localStorage`:

- Memory journal: `MC_MEMORY_JOURNAL_V1`, UI state: `MC_MEMORY_JOURNAL_UI_V1`
- Scheduled tasks: `MC_SCHEDULED_TASKS_V1`
- Pixel office layout: `MC_OFFICE2_V1`
- Pixel factory items: `MC_FACTORY_V1`

Integration notes:

- The Office pixel room (`/office`) opens a Command Station drawer that reuses the existing Command Station panel from the Agents page (`/agents`).
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
- Public cloud workflow service: same backend in `ATEAM_PUBLIC_SERVICE_MODE=true`
- Cloud API runtime: Railway
- Public route layer: Cloudflare Worker / Pages

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
- OpenAI: `OPENAI_API_KEY`, model, temperature, stream, timeout variables
- ElevenLabs: API key, model/output format, voice IDs, tuning, timeout variables
- Bridge/phone: `ATEAM_KEY`, `ATEAM_BRIDGE_*`, `PHONE_PORT`
- Event log internals: `ATEAM_EVENT_LOG_DIR`, `ATEAM_EVENT_LOG_RENAME_RETRIES`, `ATEAM_EVENT_LOG_RENAME_BACKOFF_MS`

## Docs

Start here for architecture and cleanup context:

- `Docs/README.md`
- `Docs/ARCHITECTURE.md`
- `Docs/MIGRATION_READINESS.md`
- `RUNBOOK.md`

## Current Classification

Recommended classification: Hybrid (app + reusable engine).

Why:

- It is already a usable application (UI + workflow + backend APIs).
- It also contains extractable capability logic (agent routing, context bundling, event pipeline, workflow services).
- Some modules are reusable, but app-specific coupling still exists around local state and operator tooling.
