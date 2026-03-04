# PeacePad v2 Module Contracts

All contracts are validated with strict Zod schemas under `server/v2/schemas/*`.
All `/v2/*` responses include `x-request-id` for request/log correlation.

## `GET /v2/health`
Response:
- `status`: `"ok"`
- `version`: `"v2"`
- `time`: ISO datetime string
- `commit`: optional string (from commit env vars)
- `dependencies.database.reachable`: boolean
- `dependencies.database.checked_at`: ISO datetime string

Example response:
```json
{
  "status": "ok",
  "version": "v2",
  "time": "2026-03-04T09:00:00.000Z",
  "commit": "abc1234",
  "dependencies": {
    "database": {
      "reachable": true,
      "checked_at": "2026-03-04T09:00:00.000Z"
    }
  }
}
```

## `POST /v2/router/intent`
Request:
- `text` (required)
- `user_style` (optional)
- `coparent_style` (optional)
- `context` (optional):
  - `conversation_history` string[]
  - `session_id`
  - `user_id`

Response:
- `module_id`
- `conflict_level` (0-4)
- `safety_flags` string[]
- `recommended_action`
- `followup_questions` string[]
- `suggested_cards` array

Example response:
```json
{
  "module_id": "PP_MOD_REWRITE_MESSAGE",
  "conflict_level": 2,
  "safety_flags": ["high_conflict"],
  "recommended_action": "Generate calm, neutral, and boundary-safe drafts before sending.",
  "followup_questions": [
    "Do you want this to sound more calm, neutral, or firm?"
  ],
  "suggested_cards": [
    {
      "module_id": "PP_MOD_REWRITE_MESSAGE",
      "title": "Rewrite Message",
      "reason": "Prepare safer language before sending."
    }
  ]
}
```

## `POST /v2/modules/conflict-check`
Request:
- `text` (required)
- `conversation_history` string[] (optional)
- `user_style` / `coparent_style` (optional)
- `context.user_id` / `context.session_id` (optional)

Response:
- `conflict_level` (0-4)
- `signals` array: `{ type, key, description, weight }`
- `safety_flags` string[]
- `recommended_next_actions` string[]
- `do_not_say` string[]

## `POST /v2/modules/rewrite-message`
Request:
- `text` (required)
- `user_style` / `coparent_style` (optional)
- `conflict_level` (optional)
- `context.user_id` / `context.session_id` (optional)

Response:
- `rewritten_calm`
- `rewritten_neutral`
- `rewritten_boundary`
- `conflict_level` (0-4)
- `safety_flags` string[]
- `notes` string[]

## `POST /v2/modules/support-discovery`
Request:
- `query` (optional)
- `category` (optional)
- `conflict_level` (optional)
- `safety_flags` (optional)
- `limit` (optional)
- `context.user_id` / `context.session_id` (optional)
- `location` (optional): `latitude`, `longitude`, `city`, `country_code`

Response:
- `ranked_resources` array with:
  - `title`
  - `type`
  - `location`
  - `url`
  - `phone` (optional)
  - `disclaimer`
