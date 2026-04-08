---
title: ATEAM Naming Registry — Phase 0
version: 1.1
locked: 2026-04-08
---

# ATEAM Naming Registry

This document is the single source of truth for agent identities.
All code must match this. Where divergence exists, it is noted and flagged for update.

---

## Naming Model

Each agent has exactly four fields:

| Field | What it is | Example |
|-------|-----------|---------|
| `agent_id` | Stable slug. Used in DB, API payloads, code references. Never changes. | `henry` |
| `role_title` | What the agent does. Used in audit trail, handoff docs, system references. | `Coordinator` |
| `display_name` | What shows on screen. Personal, friendly. May differ from role. | `Manchi` |
| `lane` | Which office zone this agent belongs to. | `coordination` |

No other name fields are part of the canonical model. See the note on `canonicalName` below.

---

## Official Roster — 8 Agents

| `agent_id` | `role_title` | `display_name` | `lane` |
|------------|-------------|----------------|--------|
| `henry` | Coordinator | Manchi | coordination |
| `scout` | Signals | Tinye Isi | signals |
| `codex` | Builder | Billy | build |
| `quill` | Writer | Eze | content |
| `charlie` | Build Support | Abobis | build |
| `violet` | Think Tank | Violet | think_tank |
| `ralph` | QA | Go Well Daughter | qa |
| `pixel` | Design | Nwa Baby | design |

This is the complete locked roster for Phase 1 and Phase 2.
Do not add agents to this table without an explicit decision.

---

## Supporting Entries (Not in Locked Roster)

Two entries exist in `OFFICE2_AGENT_DIRECTORY` in `config.js` but are not part of the 8 official agents.
They are present as system/channel slots and must not be given council seats, project ownership, or core loop roles.

| `agent_id` | Status | Notes |
|------------|--------|-------|
| `echo` | Channel slot | Voice/podcast output channel. `display_name: Otota`. Not a named persona in the operating model. |
| `alex` | System slot | Generic Ops placeholder. `display_name: Alex`. No distinct personality defined. |

These remain in `OFFICE2_AGENT_DIRECTORY` to avoid breaking the office layout. They do not appear in
the naming registry as authoritative agents.

---

## Note on `canonicalName` in Current Code

The current codebase (`OFFICE2_AGENT_DIRECTORY` in `config.js`, `app.js`) uses a `canonicalName` field
(e.g., "Henry", "Scout", "Codex") in addition to `displayName`.

**This field is not part of the canonical naming model.** It exists because the old design had three
layers: an internal ID, a system identity name, and a personal display name. That third layer is removed.

**Current code uses `canonicalName` in these places:**
- `mcCanonicalName(agentId)` — fallback when displayName not set (app.js:3164)
- Agent card secondary label: `agent.canonicalName` (app.js:4804)
- Tooltip title when canonicalName ≠ displayName (app.js:3739)
- `data-canonical-name` DOM attribute on office entities (app.js:3585)
- Ping button title (app.js:11088)

**Going forward:** Use `display_name` for all user-facing labels. Use `role_title` for system/audit references.
`canonicalName` should be treated as an alias for `display_name` until removed. No Phase 2 code should
introduce new uses of `canonicalName`.

**Code change needed (post-Phase 2 cleanup):** Remove `canonicalName` from `OFFICE2_AGENT_DIRECTORY`,
update `mcCanonicalName()` to return `role_title` instead, and replace `agent.canonicalName` references
with `agent.role` (role_title) in display contexts.

---

## Display Rules

| Context | Use |
|---------|-----|
| Mission Control UI — names, cards, labels | `display_name` |
| Approval records, handoff docs, audit trail | `role_title` |
| API payloads, DB records, code references | `agent_id` |
| Raw `agent_id` | Never shown in user-facing surfaces |

---

## Where These Fields Live in Code

| Location | Field name in code | Maps to |
|----------|-------------------|---------|
| `OFFICE2_AGENT_DIRECTORY[].id` | `agent_id` | ✓ |
| `OFFICE2_AGENT_DIRECTORY[].role` | `role_title` | ✓ |
| `OFFICE2_AGENT_DIRECTORY[].displayName` | `display_name` | ✓ (rename pending) |
| `OFFICE2_AGENT_DIRECTORY[].lane` | `lane` | ✓ |
| `OFFICE2_AGENT_DIRECTORY[].canonicalName` | — | Remove after Phase 2 |
| `mcDisplayName(id)` in `app.js` | Returns `display_name` | ✓ |
| `mcCanonicalName(id)` in `app.js` | Returns `canonicalName` | Replace with role_title lookup |
