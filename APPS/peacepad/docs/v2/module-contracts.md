# PeacePad v2 Module Contracts

All v2 responses are wrapped in the canonical envelope schema (`server/v2/schemas/envelope.ts`).

## Canonical Envelope

```json
{
  "ok": true,
  "session": {
    "sessionId": "uuid-or-null",
    "isNew": false,
    "userId": "user-or-null"
  },
  "intent": {
    "id": "module-or-null",
    "confidence": 0.72,
    "source": "router"
  },
  "analysis": {
    "conflict": {
      "score": 0.5,
      "level": "medium",
      "source": "message_only",
      "signals": []
    }
  },
  "safety": {
    "safeToProceed": true,
    "flags": [],
    "handoff": { "type": "none", "reason": null }
  },
  "explain": {
    "summary": "One-line explanation",
    "reasons": ["reason-1", "reason-2"]
  },
  "actions": [],
  "ui": {
    "version": 1,
    "chips": [],
    "cards": []
  },
  "data": {},
  "errors": []
}
```

Notes:
- `ui.version` is always `1`.
- Endpoint-specific legacy payloads live under `data`.
- Invalid requests and internal failures still return this envelope with `ok=false`.

## `POST /v2/conversation/orchestrate`

Request schema:
- `sessionId: string | null` (UUID string when provided)
- `user: { userId, locale, tz } | null`
- `mode: "narration" | "task"`
- `message: { text, source: "voice" | "typed" }`
- `userChoice: { moduleId } | null`
- `contextHints: { coparentTone, userTone } | null`
- `debug: boolean | null`

Behavior:
1. Create or resume a conversation session.
2. Persist user message.
3. Resolve intent (`userChoice` first, router fallback).
4. Run conflict check with deterministic fallback when provider fails.
5. Set conflict source:
   - `message_only` (no prior session/module history)
   - `history_assisted` (prior history used)
6. Safety gate on crisis flags (`self_harm_risk`, `immediate_danger`, `domestic_violence_risk`):
   - `safeToProceed=false`
   - `handoff.type="support"`
   - skip rewrite module
7. Return envelope with chips/actions/explain/data.

Example request:

```json
{
  "sessionId": null,
  "user": { "userId": "user-123", "locale": "en-CA", "tz": "America/Toronto" },
  "mode": "task",
  "message": { "text": "Help me respond without escalating this.", "source": "typed" },
  "userChoice": null,
  "contextHints": { "coparentTone": "direct", "userTone": "gentle" },
  "debug": false
}
```

Example response excerpt:

```json
{
  "ok": true,
  "session": { "sessionId": "54c5f14c-89fa-4762-9767-10cb9b178ad5", "isNew": true, "userId": "user-123" },
  "intent": { "id": "PP_MOD_REWRITE_MESSAGE", "confidence": 0.72, "source": "router" },
  "analysis": {
    "conflict": {
      "score": 0.5,
      "level": "medium",
      "source": "message_only",
      "signals": ["Pressure language detected."]
    }
  },
  "ui": {
    "version": 1,
    "chips": [{ "id": "conflict_meter", "label": "Conflict: Medium", "variant": "warning", "expandable": true }],
    "cards": []
  },
  "data": {
    "intentRoute": { "module_id": "PP_MOD_REWRITE_MESSAGE" },
    "conflictCheck": { "conflict_level": 2 }
  }
}
```

## `GET /v2/health`

- Returns canonical envelope.
- Health payload is in `data`:
  - `status`
  - `version`
  - `time`
  - `commit`
  - `dependencies.database`

## `POST /v2/router/intent`

Request:
- `text` (required)
- `user_style` (optional)
- `coparent_style` (optional)
- `context` (optional):
  - `conversation_history`
  - `session_id`
  - `user_id`

Response:
- Canonical envelope.
- Routed intent payload preserved under `data`.

## `POST /v2/modules/conflict-check`

Request:
- `text` (required)
- optional history/style/context fields

Response:
- Canonical envelope.
- Existing module payload preserved under `data`.

Fallback:
- If AI/provider fails, deterministic scoring is used:
  - denied-access language -> base `0.7`
  - insults/profanity -> `+0.1`
  - legal threats -> `+0.2`
  - clamped to `0..1`

## `POST /v2/modules/rewrite-message`

Request:
- `text` (required)
- optional style/context/conflict hints

Response:
- Canonical envelope.
- Rewrite variants preserved under `data`:
  - `rewritten_calm`
  - `rewritten_neutral`
  - `rewritten_boundary`

## `POST /v2/modules/support-discovery`

Request:
- optional `query`, `category`, `conflict_level`, `safety_flags`, `location`, `limit`, `context`

Response:
- Canonical envelope.
- Ranked support resources preserved under `data.ranked_resources`.
