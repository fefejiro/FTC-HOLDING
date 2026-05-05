# ATEAM Storage Decoupling Plan

Scope: `APPS/ATEAM` only.  
Goal: map current local persistence to cloud-native stores without destructive refactor.

## 1. Current Local Persistence Patterns

Current backend uses local filesystem persistence in `memory/`:

- JSON stores for threads/tasks/memory/events/summaries
- Session JSON + `.webm` audio files for speech clarity
- Atomic write patterns (`*.tmp` + rename) in multiple stores

Primary writing modules:

- `lib/threadStore.js`
- `lib/taskStore.js`
- `lib/memoryStore.js`
- `lib/contextBundle.js` (summary cache snapshots)
- `lib/eventLog.js`
- `lib/speechClarity/speechClarityStore.js`
- `lib/workflowRunStore.js`
- `lib/workItemStore.js`
- `lib/approvalStore.js`

## 2. Mapping Table

| Current local store | Proposed cloud store | Reason |
|---|---|---|
| `memory/threads/{taskId}.json` | Supabase Postgres table `threads` + `thread_messages` | Queryability, concurrency safety, per-user/tenant access control |
| `memory/tasks/tasks.json` | Supabase Postgres table `tasks` + `task_status_history` | Deterministic status transitions, auditable workflow history |
| `memory/projects/{taskId}.json` | Supabase Postgres table `task_memory` | Structured memory snapshots with ownership and versioning |
| `memory/global.json` | Supabase Postgres table `workspace_memory` | Shared scoped memory per workspace/tenant |
| `memory/summaries/{taskId}.json` | Supabase Postgres table `context_summaries` | Summary lifecycle and cache invalidation across instances |
| `memory/events/{sessionId}.json` | Supabase Postgres table `session_events` (append-only) | Reliable event ingestion, dedupe by keys, timeline queries |
| `memory/speech_clarity/{sessionId}.json` | Supabase Postgres table `speech_sessions` | Session metadata and analysis persistence |
| `memory/speech_clarity/audio/{sessionId}.webm` | Object storage bucket (Supabase Storage or S3-compatible bucket) | Binary artifact storage, signed URL access, lifecycle policies |
| SQLite `workflow_runs` | Supabase Postgres table `ateam_workflow_runs` | Durable public/private workflow state across Railway restarts |
| SQLite `work_items` | Supabase Postgres table `ateam_work_items` | Durable job state, blockers, history, and operator visibility |
| SQLite `approvals` | Supabase Postgres table `ateam_approvals` | Durable approval gates and handoff decisions |
| In-process lane locks (`agentLaneLocks` map) | Keep ephemeral in process now; optional Redis later | Lock state is transient; only externalize if multi-instance concurrency is required |

## 3. What Can Remain Ephemeral

Can remain ephemeral in first cloud pass:

- Agent request lock map (`agentLaneLocks`)
- Non-durable in-flight context merge objects
- Health response computed values

Should not remain local-ephemeral if multi-instance:

- Event dedupe source of truth
- Thread and task state
- Speech session metadata

## 4. Proposed Data Domains

- Operational state domain: tasks, threads, events, context summaries (Postgres)
- Memory domain: workspace/task memory snapshots (Postgres)
- Media domain: speech audio artifacts (object storage)
- Telemetry/analytics domain: event projections and aggregates (Postgres views/materialized views later)

## 5. Incremental Migration Sequence

1. Introduce repository interfaces for each store (thread/task/memory/event/speech).
2. Keep current file-backed implementation as `local` adapter.
3. Add `supabase` adapter implementations behind same interfaces.
4. Add dual-write optional mode for migration validation.
5. Switch read-paths to cloud adapters per capability route.
6. Decommission file-backed writes only after parity checks.

## 6. Current Implementation Status (this pass)

Implemented in ATEAM backend:

- Storage backend factory:
  - `Server/lib/storage/repositories.js`
- Local backend adapter:
  - `Server/lib/storage/backends/local.js`
- Supabase workflow adapter:
  - `Server/lib/storage/backends/supabase.js`
  - `Server/lib/storage/backends/supabaseCore.js`
- `Server/server.js` now resolves storage via:
  - `createRepositories({ backend: ATEAM_STORAGE_BACKEND, memoryDir })`
- Added `.env.example` knob:
  - `ATEAM_STORAGE_BACKEND=local`
- Added durable table schema:
  - `Docs/SUPABASE_WORKFLOW_SCHEMA.sql`

Behavior note:

- Runtime remains local by default.
- Workflow runs, jobs, and approvals can now use Supabase when configured.
- Threads/tasks/memory/speech/content still use the local adapters today.
- If `ATEAM_STORAGE_BACKEND=supabase` is requested without credentials, the runtime falls back safely to `local`.

## 7. Uncertainty Notes

- Object storage provider choice is not encoded in current ATEAM code.
- Existing `memory/*.json` files outside active backend paths appear to be legacy/auxiliary artifacts and should be validated before migration cutoff.
