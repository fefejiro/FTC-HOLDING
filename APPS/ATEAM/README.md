# ATEAM

ATEAM is a local-first AI orchestration application with a browser UI and a Node.js backend.
It combines:

- A multi-agent command workspace (dashboard + talk mode)
- Event/timeline logging and review controls
- Speech clarity training workflows (record, analyze, drill recommendations)

This README reflects the current source of truth in `APPS/ATEAM` as audited on March 7, 2026.

## Runtime and Stack

- Frontend: static HTML/CSS/JS (`Public/index.html`, `Public/style.css`, `Public/app.js`)
- Backend: Node.js (ESM) + Express 5 (`Server/server.js`)
- AI provider: OpenAI Responses API (with local stub fallback)
- Voice provider: ElevenLabs TTS (optional)
- State persistence: local JSON and audio files in `memory/`
- Test framework: Jest (`Server/__tests__`)

## Entrypoints

- Frontend entrypoint: `Public/index.html` -> `app.js`
- Backend entrypoint: `Server/server.js`
- Backend start command: `npm start` (from `Server/`)

## API Surface (current)

- Health/config: `GET /health`
- Agent orchestration: `POST /agent/command`, `POST /agent/command/stream`, `POST /command` (legacy)
- Task/thread: `GET /task/thread/:taskId`, `POST /task/thread`, `POST /task/update`, `GET /tasks`, `GET /task/status/:taskId`
- Voice: `POST /voice/speak`, `GET /voice/capabilities`
- Event log: `GET /events/:sessionId`, `POST /events/:sessionId`
- Speech clarity: `/speech/*` routes for session creation, transcript save, audio upload, analysis, and reflection

## Environment Variables

Defined in `.env.example` and code paths in `Server/server.js` + `Server/lib/*`.
Primary groups:

- Core runtime: `PORT`, `LLM_MODE`, `ATEAM_PROMPT_EVENT_SESSION_ID`
- OpenAI: `OPENAI_API_KEY`, model, temperature, stream, timeout variables
- ElevenLabs: API key, model/output format, voice IDs, tuning, timeout variables
- Event log internals: `ATEAM_EVENT_LOG_DIR`, `ATEAM_EVENT_LOG_RENAME_RETRIES`, `ATEAM_EVENT_LOG_RENAME_BACKOFF_MS`

## Current Classification

Recommended classification: **Hybrid (app + reusable engine)**.

Why:

- It is already a usable application (UI + workflow + backend APIs).
- It also contains extractable capability logic (agent routing, context bundling, event pipeline, speech clarity analysis).
- Some modules are reusable, but current file-based storage and app-specific coupling need refactoring before platform-wide reuse.

See:

- `Docs/ARCHITECTURE.md`
- `Docs/MIGRATION_READINESS.md`
- `Docs/CAPABILITY_EXTRACTION.md`
