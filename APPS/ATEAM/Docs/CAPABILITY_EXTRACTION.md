# ATEAM Capability Extraction Analysis

## Classification Decision

Selected result: **C. Hybrid (app + reusable engine)**.

Justification:

- ATEAM is already a complete end-user application (UI, workflows, backend APIs).
- It also contains reusable capability primitives that can serve other products after decoupling.
- Current implementation is still app-coupled (prompt/persona, local files, session semantics), so it is not yet a pure module.

## Capability Candidates

## 1. Agent Orchestration Core

Candidate modules:

- `Server/lib/agentRouter.js`
- `Server/lib/llmAdapter.js`
- `Server/lib/contextBundle.js`
- `Server/lib/toolRegistry.js`

Potential platform capability:

- Shared multi-agent command router + model fallback + context bundling engine

Extraction effort:

- Medium

Required decoupling:

- Remove ATEAM-specific prompt/persona defaults from generic core
- Abstract storage fetches behind interfaces
- Add request schema and policy boundaries

## 2. Workflow and Event Engine

Candidate modules:

- `Server/lib/eventLog.js`
- Task/thread stores (`threadStore`, `taskStore`)
- Timeline event contracts used by frontend

Potential platform capability:

- Cross-product workflow event ledger + task state transitions + timeline projection

Extraction effort:

- Medium-high

Required decoupling:

- Replace local JSON files with durable multi-tenant data backend
- Add idempotency keys and formal event schema versioning
- Introduce access controls

## 3. Speech Clarity Engine

Candidate modules:

- `Server/lib/speechClarity/speechClarityAnalyze.js`
- `Server/lib/speechClarity/speechClarityRoutes.js`
- `Server/lib/speechClarity/speechClarityStore.js`

Potential platform capability:

- Reusable speech/transcript analysis and drill recommendation microservice

Extraction effort:

- Low-medium

Why good candidate:

- Good test coverage
- Clear boundaries
- Mostly deterministic logic

## 4. Voice Synthesis Adapter

Candidate module:

- `Server/lib/elevenlabsTts.js`

Potential platform capability:

- Shared TTS provider adapter with profile tuning and graceful fallback behavior

Extraction effort:

- Low

## Not Yet Extraction-Ready

- Full frontend runtime (`Public/app.js`) is too monolithic and ATEAM-specific.
- Browser speech orchestration logic is tightly coupled to current Talk Mode UX.

## Recommended Hybrid Target

Keep as app:

- ATEAM UI experience
- ATEAM-specific prompt/persona and interaction patterns

Extract as shared capabilities:

- `capability-agent-runtime` (router + llm adapter + context contracts)
- `capability-event-workflow` (event/task/thread APIs and contracts)
- `capability-speech-clarity` (analysis + session APIs)
- `capability-voice-tts` (provider adapters)

## Practical Extraction Sequence

1. Define stable interfaces and schemas around current modules.
2. Move file storage calls behind adapters.
3. Publish modules into shared package/workspace scope.
4. Keep ATEAM app as first client of extracted capabilities.
5. Adopt extracted capabilities in PeacePad/SayWetin only after interface hardening.
