# FTC HOLDING Copilot Instructions

This repository contains multiple FTC projects and product experiments. Treat it as a portfolio workspace, not a single app.

## Skills (load on demand)

Two skill libraries live in this monorepo. Load the matching `SKILL.md` before acting whenever a request matches its description; never duplicate skill content into prompts.

- `.github/skills/` — governance and product-shape skills:
  - `ftc-client-workflow` — client intake, scoping, handoff
  - `ftc-portal-qa-audit` — portal QA passes
  - `ftc-project-governance` — new project scaffolding, Jira/Confluence mirroring, portfolio status
  - `ftc-startup-strategy-skill` — venture/strategy framing
  - `saywetin-three-surface-ship` — SayWetin three-surface release coordination
- `skills/` (repo root) — operational/runtime skills:
  - `ftc-auth-foundation` — auth wiring across apps
  - `ftc-cli` — repo inspection, diagnostics, testing, deploy checks, docs hygiene, failure recovery (load this first when repo structure is unclear or a prior agent session failed)
  - `ftc-client-handoff` — client delivery handoff
  - `ftc-delivery-telemetry` — telemetry and portfolio status feeds
  - `ftc-deployment-recovery` — disciplined production-deploy recovery
  - `ftc-live-qa` — live QA passes
  - `ftc-multi-agent-orchestration` — multi-agent task routing
  - `ftc-saywetin-android-qa` — SayWetin Android device matrix QA
- `.agents/skills/` and `.windsurf/skills/` — Stripe-specific skills (`stripe-best-practices`, `stripe-projects`, `upgrade-stripe`); load when working in `workers/stripe-api/` or any Stripe integration.

When work touches a repo and the structure is unclear, load `skills/ftc-cli/SKILL.md` before guessing.

## General rules

- Keep changes scoped to the requested app, folder, or issue.
- Do not make unrelated edits.
- Do not change secrets, environment variables, production credentials, billing settings, or deployment configuration unless explicitly instructed.
- Do not introduce new dependencies unless required and clearly justified.
- Preserve existing naming, routing, design patterns, and brand positioning.
- Prefer small pull requests over broad refactors.
- Always include testing notes in the pull request summary.
- Do not claim tests passed unless they were actually run.
- If tests cannot be run, explain why.

## Expected project documentation

Where relevant, each app should eventually include:

- README.md
- PROJECT_BRIEF.md
- ARCHITECTURE.md
- ROADMAP.md
- TASKS.md
- TESTING.md
- DEPLOYMENT.md

Documentation should be practical, current, and specific to the app.

## Next.js production readiness

For Next.js apps, check whether the following exist where applicable:

- app/error.tsx
- app/global-error.tsx
- app/loading.tsx
- app/not-found.tsx
- app/manifest.ts
- sitemap
- robots
- metadata defaults
- OpenGraph metadata
- Twitter card metadata

Use existing UI patterns. Do not redesign the app unless asked.

## Pull request standard

Every pull request should include:

- Summary
- Files changed
- Testing performed
- Risks
- Follow-up recommendations

## FTC project context

Una Labs is the professional AI product studio.
ATEAM is the internal AI operating system and workflow layer.
PeacePad is a mediation-first co-parenting and family justice platform.
SayWetin is a global cultural companion for music, speech, slang, and context.
Garden Cleaners is a client service website and portal.
OG Trades Academy is a standalone forex education brand.
TradeUp is a Nigerian social trading and gamified challenge platform.
TrueGinja is a mobile-first hustle Work OS.
TowSignal is a dispatch and roadside signal workflow app.
