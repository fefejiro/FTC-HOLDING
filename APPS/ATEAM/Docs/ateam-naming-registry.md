---
title: ATEAM Naming Registry — Phase 0
version: 1.0
locked: 2026-04-08
---

# ATEAM Naming Registry

This document is the single source of truth for agent identities, role titles, and display names.
All code must match this. Where divergence exists, it is noted and flagged for update.

---

## Agent Roster

The canonical agent identity system uses three names per agent:

| `agent_id` (stable, internal) | `canonicalName` (system name) | `displayName` (screen name) | Role | Lane |
|-------------------------------|-------------------------------|------------------------------|------|------|
| `henry` | Henry | Manchi | Coordinator | coordination |
| `scout` | Scout | Tinye isi | Signals | signals |
| `codex` | Codex | Billy | Builder | build |
| `quill` | Quill | Eze | Writer | content |
| `charlie` | Charlie | Abobis | Build Support | build |
| `violet` | Violet | Violet | Think Tank | think_tank |
| `ralph` | Ralph | Go Well Daughter | QA | qa |
| `pixel` | Pixel | Nwa Baby | Design | design |
| `echo` | Echo | Otota | Voice | voice |
| `alex` | Alex | Alex | Ops | ops |

### Naming Rules

- `agent_id` — slug, lowercase, stable. Used in DB records, API payloads, code references.
- `canonicalName` — the system identity (used in handoff docs, internal references).
- `displayName` — the name shown to users in UI. Friendly, personal. May differ from canonical.
- Never hardcode display names in logic. Always look up via `OFFICE2_AGENT_DIRECTORY` in `config.js`.

---

## Where Agent Identities Live in Code

### `APPS/ATEAM/Public/modules/config.js`

The `OFFICE2_AGENT_DIRECTORY` array is the authoritative client-side registry.
Each entry has: `id`, `canonicalName`, `displayName`, `role`, `lane`, `silhouetteIcon`, `emoji`.

The older `OFFICE_AGENTS` array (4 entries: scout, quill, codex, henry) is a legacy UI fixture.
It should not be used for new logic.

### `APPS/ATEAM/Server/lib/workflowEngine.js`

`ownerAgentId` fields in `WORKFLOW_CATEGORY_PRESETS` reference `agent_id` values.
Current assignments: `henry` owns website, lead-automation, internal-tool, ai-lab; `codex` owns product-app.

### `APPS/ATEAM/Public/app.js`

`mcDisplayName(agentId)` — looks up displayName from `OFFICE2_AGENT_DIRECTORY`.
`mcCanonicalName(agentId)` — looks up canonicalName from `OFFICE2_AGENT_DIRECTORY`.

---

## UI Display Rules

- Mission Control header and agent cards: use `displayName`.
- Handoff docs, approval records, audit trail: use `canonicalName`.
- API payloads and DB records: use `agent_id`.
- Never show raw `agent_id` in any user-facing surface.

---

## Divergence Notes (as of 2026-04-08)

The following code locations still reference legacy role labels or display names that do not
match this registry and should be updated:

| Location | Issue |
|----------|-------|
| `OFFICE_AGENTS` array in `config.js` | Uses `Tinye isi` not `Tinye Isi` (minor), only 4 agents |
| `DEFAULT_HUMOR_LINES` in `config.js` | References `henry`, `scout`, `quill`, `codex` — correct IDs, no change needed |
| `WORKFLOW_CATEGORY_PRESETS` in `workflowEngine.js` | `ownerAgentId: "henry"` and `"codex"` — correct, no change needed |
| `AGENT_STATUS_ORDER` in `config.js` | Uses role labels ("Coach", "Builder", etc.) not agent IDs — acceptable for status sorting |

No renames of `agent_id` values are needed. The IDs are correct. Only display-layer cleanup needed.
