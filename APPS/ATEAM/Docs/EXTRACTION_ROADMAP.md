# ATEAM Capability Extraction Roadmap

Scope: `APPS/ATEAM` only.  
Order: lowest-risk to highest-risk.
Execution state: Phase 0 complete and frozen. Phase 1 foundation scaffolding started.

## Phase 0: Safety Baseline (done in this pass)

- Add missing `badRequest(...)` helper in `Server/server.js`
- Sanitize `.env.example` key-like value to placeholder
- Add storage backend scaffold:
  - `Server/lib/storage/repositories.js`
  - `Server/lib/storage/backends/local.js`
  - `ATEAM_STORAGE_BACKEND` config wire-up in `Server/server.js`
- Add principal scope middleware scaffold:
  - `Server/lib/auth/principalScope.js`
  - `ATEAM_AUTH_MODE` local/header mode support
  - Scope guards on task/thread/event/agent route IDs in `Server/server.js`

## Phase 1 (Low risk): Speech Clarity Capability

Foundation hardening completed in current pass:

- Added `/capability/*` route namespace in `Server/server.js` (legacy routes untouched)
- Added contract envelope utilities in `Server/lib/capability/contracts.js`
  - request envelope: `requestId`, `contractVersion`, `scope`, `data`
  - normalized error shape: `{ ok:false, error, details, code, requestId, contractVersion }`
- Added capability route scaffolds in `Server/lib/capability/routes.js` for:
  - speech clarity
  - voice synthesis
  - workflow/events
  - context bundle
  - agent runtime (including stream endpoint)
- Added provider-agnostic JWT claim mode in `Server/lib/auth/principalScope.js` (`ATEAM_AUTH_MODE=jwt`)
- Added Supabase repository scaffold in `Server/lib/storage/backends/supabase.js`

Suggested capability endpoint group:

- `POST /capability/speech-clarity/session`
- `POST /capability/speech-clarity/session/{id}/transcript`
- `POST /capability/speech-clarity/session/{id}/analyze`
- `POST /capability/speech-clarity/session/{id}/audio`
- `GET /capability/speech-clarity/session/{id}`

Input contract:

- `mode`, `title`, `transcript_text`, `duration_seconds`, `audio` binary

Output contract:

- Session metadata, `metrics`, `drills`, artifact references

Access:

- Authenticated for user workloads
- Internal worker/service roles for background analysis extensions

Extraction status:

- Can be extracted early after storage adapter interface is in place

## Phase 2 (Low-medium risk): Voice Synthesis Adapter

Suggested endpoint:

- `POST /capability/voice/synthesize`
- `GET /capability/voice/capabilities`

Input contract:

- `text`, `profile` (`male|female|prof`), optional policy/options

Output contract:

- Audio stream/blob metadata, provider profile info, fallback metadata

Access:

- Internal only (recommended) or authenticated with strict quota controls

Extraction status:

- Keep inside ATEAM service boundary initially, expose as internal shared capability later

## Phase 3 (Medium risk): Event and Workflow Engine

Suggested endpoint group:

- `POST /capability/workflow/events/{sessionId}`
- `GET /capability/workflow/events/{sessionId}`
- `POST /capability/workflow/tasks/{taskId}/status`
- `GET /capability/workflow/tasks/{taskId}`

Input contract:

- Scoped identifiers + typed event payload or task status update payload

Output contract:

- Stored event/task state, dedupe metadata, timeline-ready payload

Access:

- Authenticated for product clients
- Internal write access for system-originated events

Extraction status:

- Extract after auth scope and DB-backed event/task stores are ready

## Phase 4 (Medium-high risk): Context Bundling Service

Suggested endpoint:

- `POST /capability/context/bundle`

Input contract:

- `taskId`, `agent`, `mode`, optional `contextPack`

Output contract:

- `contextBundle` with `recentThread`, `rollingSummary`, `profileLines`, optional `clientContext`

Access:

- Internal only

Extraction status:

- Extract after memory and summary stores are cloud-backed and tenant-scoped

## Phase 5 (High risk): Agent Runtime Orchestration

Suggested endpoint:

- `POST /capability/agent/respond`
- `POST /capability/agent/respond/stream`

Input contract:

- `taskId`, `message`, `agent`, `mode`, `voiceStyle`, `contextPack`

Output contract:

- `reply`, `agent`, `intent`, `mood`, `modelUsed`, `fallbackUsed`, route metadata

Access:

- Authenticated for product apps
- Internal-only options for privileged/system calls

Extraction status:

- Extract last among backend capabilities, after storage + auth + policy separation

## What Stays Inside ATEAM for Now

- `Public/app.js` talk-mode UX and UI state machine
- ATEAM-specific persona and voice naming semantics
- Legacy endpoint compatibility (`/command`)

## Blocking Dependencies Before Extraction

1. Storage abstraction and cloud adapters
2. Tenant/auth scoping middleware
3. Request/response schema versioning
4. Prompt policy separation (generic vs ATEAM persona)

## Pre-Deployment Checklist (before any repo migration)

1. Cloud-backed stores validated under dual-write/read parity
2. Tenant-scoped authorization checks in all write/read routes
3. Capability contracts documented and versioned
4. Integration tests for capability endpoints independent of ATEAM UI
