---
title: ATEAM Sprint Freeze — Phase 0
version: 1.0
locked: 2026-04-08
---

# ATEAM Sprint Freeze

This document defines the rules that govern what can and cannot change during a sprint,
and what must be locked as ATEAM moves into Phase 1 core loop work.

---

## What Is Frozen

The following are locked and must not change during Phase 1 sprint work
without an explicit decision recorded in this doc:

### Architecture
- Module structure (see `ateam-architecture-lock.md`) — no new layers
- Client module namespace (`window.ATEAMModules`) — no migration to bundler
- Worker role — proxy only, no business logic
- SQLite as the only persistence layer — no Supabase, no Redis

### Naming
- `agent_id` values (`henry`, `scout`, `codex`, `quill`, `charlie`, `violet`, `ralph`, `pixel`, `echo`, `alex`) — no renames
- View routing keys (`data-mc-page` values) — no renames without updating config.js and app.js simultaneously
- API route patterns (`/api/workflow/runs/*`, `/api/approvals/*`) — no restructuring

### State Machine
- State names in `WORKFLOW_STATES` — no renames, no removals (see `ateam-state-machine.md`)
- Canonical state progression — see `ateam-state-machine.md`

---

## What Can Change During Sprints

- View content and layout (HTML inside view containers)
- New views added to `MC_ROUTE_BY_VIEW` and `MC_SEARCH_SHORTCUTS`
- New fields on WorkflowRun payload (non-breaking additions)
- New agent humor lines in `DEFAULT_HUMOR_LINES`
- UI-only CSS changes
- New API endpoints that do not conflict with existing routes
- Adding optional fields to existing API responses

---

## Sprint Rules

1. **One concern per commit.** A commit that touches both engine logic and UI is a red flag.
2. **No refactoring without a bug.** Do not clean up code that is not broken.
3. **No new abstractions for single-use operations.** Three similar lines are better than a premature helper.
4. **Read before writing.** Any session that modifies existing code must read the file first.
5. **Document divergence, don't hide it.** If a sprint decision creates a gap between this registry and live code, note it in the relevant doc — don't silently patch it.
6. **Worker changes require explicit sign-off.** Any change to `workers/ateam-edge/src/index.ts` must be confirmed by Mike before implementation.

---

## Current Sprint — Phase 1

**Goal:** Core intake→approval→execution loop is functional end-to-end.

**In scope:**
- Entry view → workflow run creation
- `draft → awaiting_approval` state transition on brief submission
- Approval decision in Mission Control → run advances to `approved → executing`
- Auto-generated decision pack on approval
- Run state visible in Mission Control task list

**Out of scope for Phase 1:**
- ElevenLabs voice output
- Multi-agent execution routing
- Telegram gateway integration
- Public-facing ATEAM deployment changes
- Any change to the Cloudflare Worker

---

## How to Propose a Change to a Frozen Item

1. Write a short note in the relevant doc describing what and why.
2. Get a verbal or chat confirmation from Mike.
3. Update the doc before implementing.
4. Commit the doc change and the code change together.
