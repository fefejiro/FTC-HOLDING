# PeacePad v2 Conversation Orchestrator

## Purpose
`v2` provides a strict, evolvable assistant contract without changing existing `v1 /api` behavior.

Primary entrypoint:
- `POST /v2/conversation/orchestrate`

Supporting endpoints:
- `GET /v2/health`
- `POST /v2/router/intent`
- `POST /v2/modules/conflict-check`
- `POST /v2/modules/rewrite-message`
- `POST /v2/modules/support-discovery`

## v2 Boundary
- API prefix: `/v2/*`
- Server implementation: `server/v2/*`
- Documentation: `docs/v2/*`
- Additive migration files only: `server/migrations/*`
- Existing `v1` routes in `server/routes.ts` remain untouched.

## Canonical Envelope (all v2 endpoints)
Every v2 endpoint returns the same top-level envelope:
- `ok`
- `session`
- `intent`
- `analysis.conflict`
- `safety`
- `explain`
- `actions`
- `ui`
- `data`
- `errors`

Contract details:
- `ui.version` is always `1`.
- Conflict meter is always represented via `ui.chips`.
- User-operable buttons are expressed via `actions` only.
- Existing module payloads are preserved under `data` for compatibility.

## Orchestrator Responsibilities
`POST /v2/conversation/orchestrate` composes existing v2 modules with deterministic safety behavior:
1. Create/resume session.
2. Persist user message.
3. Resolve intent (`userChoice` first, otherwise router).
4. Run conflict check with deterministic fallback if AI/provider is unavailable.
5. Apply safety gating:
   - High-risk safety flags trigger support-first handoff and block rewrite.
6. Chain module execution when safe (`rewrite` or `support`).
7. Return canonical envelope with UX contract fields (`chips`, `actions`, `explain`).

## Data Tracking
Existing:
- `pp_v2_module_runs`
- `pp_v2_launcher_state`

New for orchestrator:
- `pp_v2_conversation_sessions`
- `pp_v2_conversation_messages`
- `pp_v2_coparent_profiles` (lightweight personalization hints; no invite/thread model)

## UX Contract Pointers
See `docs/v2/ux-contract.md` for:
- `ui.version` migration strategy
- Conflict chip and meter semantics
- `start_new_session` action behavior
- `message_only` vs `history_assisted` conflict source semantics
