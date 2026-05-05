# PeacePad v2 UX Contract

This contract keeps ChatGPT app, web, and mobile clients aligned by centralizing UX semantics in:
- `actions`
- `ui.chips`
- `ui.cards`

Clients should not infer primary UX actions from random strings in `data`.

## Versioning
- `ui.version` is mandatory and currently fixed at `1`.
- Any future contract expansion should be additive or version-gated.

## Conflict Meter Chip
- Always represented in `ui.chips`.
- Required shape:
  - `id: "conflict_meter"`
  - `label: "Conflict: Low" | "Conflict: Medium" | "Conflict: High"`
  - `variant: "info" | "warning" | "danger"`
  - `expandable: true`

Interpretation:
- `Low`: informational risk
- `Medium`: active de-escalation advised
- `High`: support and safety prioritization advised

## Actions (authoritative UX buttons)

Supported action types:
- `copy`
- `run_module`
- `open_url`
- `save`
- `start_new_session`

Required IDs for medium/high conflict scenarios:
- `send_calm_response` (`copy`)
- `save_incident` (`save`)
- `find_support` (`run_module`)
- `start_new_session` (`start_new_session`)

Required IDs for safety-gated scenarios:
- `find_support` (`run_module` or `open_url`)
- `start_new_session` (`start_new_session`)

## Restart Conversation
- Action:
  - `id: "start_new_session"`
  - `type: "start_new_session"`
  - `payload: { "preserveProfile": true }`

Client behavior:
1. On tap/click, call `POST /v2/conversation/orchestrate` with `sessionId: null`.
2. Expect response with:
   - `session.isNew = true`
   - starter prompts in `ui.cards`

## Explain Layer
- Human-readable guidance is in:
  - `explain.summary`
  - `explain.reasons` (2-3 concise reasons max)

This allows consistent rendering across clients without parsing module-specific content.

## Conflict Source Semantics
- `analysis.conflict.source = "message_only"`
  - No prior conversation/session/module history was used.
- `analysis.conflict.source = "history_assisted"`
  - Prior stored session/history signals were used to inform conflict analysis.
