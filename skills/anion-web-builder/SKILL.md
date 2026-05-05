---
name: anion-web-builder
description: Use when implementing Anion web features such as auth wiring, dashboards, booking UI, route structure, shared components, and Supabase-backed web flows.
---

# Anion Web Builder

Use this skill for the main `APPS/anion/` implementation lane.

## Mission

Build Anion web features in the correct order with premium-quality structure and clear testing evidence.

## Primary surfaces

- `APPS/anion/app/`
- `APPS/anion/components/`
- `APPS/anion/hooks/`
- `APPS/anion/lib/`
- `APPS/anion/src/legacy-pages/` only when migrating or referencing old work

## Responsibilities

- implement route structure
- wire auth-aware layouts
- connect Supabase client logic
- build role-based dashboards
- implement tutor discovery and booking UI
- keep components reusable and scoped
- preserve premium UX expectations

## Workflow

1. Read `APPS/anion/AGENTS.md` first.
2. Confirm current milestone.
3. Read existing files before editing.
4. Keep changes scoped to one flow or one bounded feature.
5. Add test notes with every meaningful change.
6. Update docs when architecture or flow assumptions change.

## Rules

- Do not change billing logic; hand off to billing lane when needed.
- Do not invent fake backend behavior in the UI.
- Do not collapse role-specific flows into one generic page if the product needs clear separation.
- Do not ship placeholder components as complete work.
- Do not ignore loading, empty, error, and unauthorized states.

## Quality bar

Every feature should cover:

- happy path
- loading state
- empty state
- error state
- unauthorized state where relevant
- responsive behavior at a practical level

## Output

- scoped implementation
- files changed
- test notes
- risks or follow-up items
