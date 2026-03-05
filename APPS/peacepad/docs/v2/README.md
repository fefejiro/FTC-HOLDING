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
- Worker/Wrangler operational docs belong in repo-level `docs/ops/*` (not `APPS/peacepad/docs/v2/*`).
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

## ChatGPT Action Quickstart
- OpenAPI file: `docs/v2/openapi.yml`
- API base URL: `https://api.peacepad.ca`
- Auth header: `Authorization: Bearer <token>`
- Primary endpoint for most flows: `POST /v2/conversation/orchestrate`

Golden request payload (fresh session, narration):
```json
{
  "sessionId": "demo-session-001",
  "user": null,
  "mode": "narration",
  "message": {
    "text": "She said I cannot pick him up today.",
    "source": "typed"
  },
  "userChoice": null,
  "contextHints": null,
  "debug": false
}
```

Golden response keys (what to check first):
```json
{
  "session": { "sessionId": "demo-session-001" },
  "intent": { "id": "PP_MOD_REWRITE_MESSAGE" },
  "ui": { "version": 1 },
  "analysis": { "conflict": { "source": "message_only" } },
  "actions": [
    { "id": "send_calm_response", "type": "copy" }
  ]
}
```

Response envelope fields to wire in the Action:
- `session`
- `intent`
- `ui`
- `analysis`
- `actions`
- `explain`
- `safety`
- `errors`

Behavior notes:
- `ui.version` is currently fixed at `1`.
- For a fresh session, expect `analysis.conflict.source = "message_only"`.
- `analysis.conflict.source` is:
  - `message_only` when no history is used
  - `history_assisted` when conversation history contributes to analysis
- When conflict is safe-to-proceed, `actions` should include rewrite-oriented actions (for example `send_calm_response`).
