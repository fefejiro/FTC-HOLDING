# ATEAM Migration Readiness Report

Audit date: March 7, 2026  
Scope: `APPS/ATEAM` only  
Reference pattern: PeacePad stabilization pattern (Cloudflare edge + Railway compute + Supabase data)

## Executive Summary

ATEAM is functionally rich and already modular enough to migrate, but **not deployment- or platform-ready in current form**.

Readiness level: **Medium (engineering-ready, infra-not-ready)**.

## 1. Current Architecture

- Single Express backend serving APIs and static frontend
- Plain frontend assets (no framework bundling)
- Local filesystem as the system of record (`memory/`)
- OpenAI + ElevenLabs integrations via env vars
- Strong speech-clarity test coverage; weaker coverage for core agent orchestration flows

## 2. Risks and Blockers

### High

- File-based persistence (`memory/`) is not suitable for horizontal scaling or ephemeral compute.
- No authentication/authorization boundaries on APIs.
- Missing `badRequest` helper in `Server/server.js` despite route usage (runtime error risk on error paths).
- `.env.example` currently contains an OpenAI key-shaped value; template should be sanitized to placeholders only.

### Medium

- Monolithic frontend file (`Public/app.js` ~5.7k LOC) slows change velocity and raises regression risk.
- API contracts are implicit; no schema validation/versioning strategy.
- Large number of transient artifact files (`tmpclaude-*`, zero-byte stray files) increases repository noise.

### Low

- `eventBus.js` exists but appears secondary to file-based event flow; potential dead/underused complexity.
- Legacy endpoints (`/command`) increase surface area to maintain.

## 3. Dependency and Runtime Issues

- Backend tests pass when run in-band with ESM flag:
  - `set NODE_OPTIONS=--experimental-vm-modules && jest --runInBand`
- Default `npm run test:backend` can fail in this environment due process-spawn/PowerShell policy constraints.
- Dependencies are lightweight and migration-friendly (`express`, `multer`, `dotenv`).

## 4. Platform-Specific Coupling

### Direct Replit coupling

- No direct Replit runtime bindings found in active backend/frontend code.

### Local-host coupling

- Frontend defaults to `http://localhost:3000`.
- Persistence assumes local writable filesystem.
- Browser feature assumptions (speech APIs, media devices) are not uniformly available across browsers.

### Docs/path coupling

- Some historical docs and memory content still reference old absolute Windows paths (`C:\\Users\\mikef\\ATEAM`).

## 5. PeacePad Pattern Comparison

### Matches

- Clear API boundary between UI and backend routes
- Env-driven provider config
- Modular backend service files
- Health endpoint and runtime capability checks

### Conflicts

- ATEAM stores operational state on local disk; PeacePad pattern expects managed cloud data.
- ATEAM runs frontend and backend in one process; PeacePad pattern separates edge/static from compute.
- No tenant/auth model; platform reuse requires identity and tenancy controls.

## 6. Recommended Target Architecture

### Target

- Cloudflare: static frontend + edge routing/domain
- Railway: ATEAM API service
- Supabase: durable relational/document state + object storage for speech audio

### Data migration targets

- `memory/threads` -> conversation table
- `memory/tasks` -> task table
- `memory/projects` + `memory/global` + `memory/summaries` -> memory/profile tables
- `memory/events` -> append-only event table
- `memory/speech_clarity/audio` -> object storage bucket
- `memory/speech_clarity/*.json` -> session/analysis tables

### Implementation phases

1. Externalize persistence layer behind repository interfaces.
2. Move event/thread/task stores to Supabase-backed implementations.
3. Split deploy topology:
   - `Public/*` via Cloudflare
   - `Server/*` via Railway
4. Add auth and tenant scoping.
5. Stabilize API schema contracts and versioning.
6. Keep local adapter for offline/dev parity.

## 7. Migration Readiness Verdict

- Can migrate incrementally without aggressive restructuring.
- First hard blocker to clear: storage abstraction away from local filesystem.
- Second hard blocker: introduce auth/tenant boundaries.
- Third blocker: fix current runtime defects and clean config hygiene.
