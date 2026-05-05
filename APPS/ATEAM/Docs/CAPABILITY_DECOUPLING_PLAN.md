# ATEAM Capability Decoupling Plan

Scope: `APPS/ATEAM` only.  
Audit inputs: `Server/server.js`, `Server/lib/*`, and `Public/app.js` integration usage.

## 1. Capability Boundaries

| Capability group | Current modules | What it does now | Reusable outside ATEAM | App-coupled today | Needed to expose as capability API |
|---|---|---|---|---|---|
| Agent orchestration runtime | `lib/agentRouter.js`, `lib/llmAdapter.js`, `lib/toolRegistry.js`, `server.js` handler `handleAgentCommand` | Agent selection, intent/mood inference, tool hinting, LLM call with streaming/fallback, thread writeback | Yes, high | Prompt/persona content is ATEAM-specific; task/thread assumptions; no auth/tenant isolation | Introduce neutral prompt policy layer, explicit request schema, auth context, storage adapter interface |
| Context bundling service | `lib/contextBundle.js`, `lib/memoryStore.js` | Builds merged context from global/task memory + recent thread + rolling summary + client context pack | Yes, high | Uses ATEAM memory file layout and summary cadence assumptions | Storage abstraction, contract versioning for `contextBundle`, configurable summary policy |
| Event/workflow engine | `lib/eventLog.js`, `lib/threadStore.js`, `lib/taskStore.js`, route `/events/*`, `/task/*` | Append/read events, dedupe per turn/session, task status transitions, thread timeline state | Yes, high | File-based event/thread/task persistence; global session naming conventions | Durable DB-backed event ledger, idempotency keys, tenant/user resource ownership, retention policies |
| Speech clarity analysis | `lib/speechClarity/speechClarityAnalyze.js`, `lib/speechClarity/speechClarityRoutes.js`, `lib/speechClarity/speechClarityStore.js` | Session create/save, transcript analysis metrics, drill generation, audio upload/read | Yes, medium-high | Session metadata and reflection shape are ATEAM-specific; store is local files | Normalize API contract and version fields, move session/audio storage to cloud stores, auth scope |
| Voice synthesis adapter | `lib/elevenlabsTts.js`, `server.js` `/voice/*`, `lib/voice.js` (stub) | Text sanitization/shaping, profile-aware ElevenLabs synthesis, capability reporting | Yes, high | Profile names mapped to ATEAM UI semantics; direct env dependency | Provider-agnostic adapter interface, capability negotiation endpoint, per-tenant voice profile policy |
| Memory/session handling | `lib/memoryStore.js`, `lib/threadStore.js`, `lib/taskStore.js` | Global/task memory read/write, thread append/dedupe, task status store | Yes, medium | Depends on `memory/` folder structure and file naming; no ownership boundary | Replace with repository interfaces over DB/object store, tenant/user partitioning, optimistic concurrency rules |

## 2. Integration Notes from `Public/app.js`

- Frontend directly consumes these capability surfaces:
  - `/agent/command`, `/agent/command/stream`
  - `/task/thread`, `/task/update`, `/tasks`
  - `/events/:sessionId`
  - `/speech/*`
  - `/voice/*`
- Client currently sends ATEAM-specific payload shape:
  - `taskId`, `agent`, `mode`, `voiceStyle`, `contextPack`.
- `API_BASE` defaults to `http://localhost:3000` when not configured, which is a local runtime assumption.

## 3. Keep App-Coupled for Now

Keep inside ATEAM app shell for now:

- Talk-mode UX semantics and review-mode controls in `Public/app.js`
- Persona and voice-style naming semantics (`male_assistant`, `nigerian_professor_ss`, etc.)
- Timeline/chapter UX projection logic
- Legacy route compatibility endpoint `/command`

## 4. Capability-Ready Candidates

Capability-first candidates (can be extracted behind stable contracts):

- `speech_clarity` analysis and session APIs
- `voice_synthesis` adapter APIs
- `event_workflow` event/task/thread ledger APIs
- `agent_runtime` command orchestration and context APIs

## 5. Decoupling Preconditions

Before extraction:

1. Add auth/tenant envelope to all API resources.
2. Replace local filesystem stores with storage interfaces and cloud-backed implementations.
3. Version request/response contracts for agent, event, and speech routes.
4. Separate ATEAM persona policy from reusable orchestration logic.
