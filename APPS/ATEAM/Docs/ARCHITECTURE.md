# ATEAM Architecture (Current State)

Audit scope: `APPS/ATEAM` only.

## 1. High-Level Shape

ATEAM is a single-repo local app with one backend process and one static frontend bundle:

- `Public/`: browser client (no framework, no bundler)
- `Server/`: Express API + orchestration modules
- `memory/`: JSON/audio persistence on local filesystem

The backend serves both API routes and static frontend assets.

## 2. Runtime and Build

- Runtime: Node.js ESM (`"type": "module"`)
- Web server: Express 5
- Build system: none for frontend and backend (plain source files)
- Test runner: Jest (ESM mode via `NODE_OPTIONS=--experimental-vm-modules`)

## 3. Frontend Architecture

Frontend entry:

- `Public/index.html`
- `Public/app.js` (monolithic, 5,688 lines)
- `Public/style.css`

Frontend characteristics:

- State-heavy SPA-like behavior in one JS file
- Uses browser-native APIs:
  - `SpeechRecognition` / `webkitSpeechRecognition`
  - `MediaRecorder`
  - `navigator.mediaDevices.getUserMedia`
  - `navigator.mediaDevices.getDisplayMedia`
  - `speechSynthesis`
- Uses `localStorage` for view/mode/speaker/review and learning artifacts
- API base resolution:
  - `window.ATEAM_API_BASE`
  - `localStorage["ATEAM_API_BASE"]`
  - fallback to `http://localhost:3000`

## 4. Backend Architecture

Backend entry:

- `Server/server.js` (720 lines)

Key modules:

- Agent orchestration:
  - `lib/agentRouter.js`
  - `lib/llmAdapter.js`
  - `lib/contextBundle.js`
  - `lib/toolRegistry.js`
- Persistence:
  - `lib/threadStore.js`
  - `lib/taskStore.js`
  - `lib/memoryStore.js`
- Timeline/events:
  - `lib/eventLog.js`
  - `lib/eventBus.js` (present, currently not central in request path)
- Voice:
  - `lib/voice.js` (stub capability)
  - `lib/elevenlabsTts.js` (provider adapter)
- Speech clarity:
  - `lib/speechClarity/speechClarityStore.js`
  - `lib/speechClarity/speechClarityAnalyze.js`
  - `lib/speechClarity/speechClarityRoutes.js`

API routes:

- `/health`
- `/task/*`
- `/agent/*`
- `/command` (legacy)
- `/voice/*`
- `/events/*`
- `/speech/*`

## 5. Data and Persistence

Storage model is file-based and local:

- Threads: `memory/threads/*.json`
- Tasks: `memory/tasks/tasks.json`
- Project/task memory: `memory/projects/*.json`
- Global memory: `memory/global.json`
- Summaries: `memory/summaries/*.json`
- Event logs: `memory/events/*.json`
- Speech sessions/audio: `memory/speech_clarity/*.json` and `memory/speech_clarity/audio/*.webm`

No relational database is used in current architecture.

## 6. Dependency Inventory

`Server/package.json`:

- runtime: `express`, `dotenv`, `multer`
- dev/test: `jest`, `cross-env`

Top-level `APPS/ATEAM/package-lock.json` exists but is effectively empty (no root package definition).

## 7. Notable Architectural Findings

- Monolith frontend (`Public/app.js`) raises maintainability risk.
- Backend has clean module boundaries in `Server/lib`, but still app-coupled.
- Storage design is local-FS first; not cloud-multi-instance ready.
- API contracts are implicit (no schema validation layer).
- One functional defect observed:
  - `badRequest(...)` is called in `Server/server.js` but no `badRequest` function is defined in that file.
  - This can cause runtime `ReferenceError` on affected error paths.
