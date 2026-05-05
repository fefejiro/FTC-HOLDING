# FTC HOLDING Copilot Instructions

This repository contains multiple FTC projects and product experiments. Treat it as a portfolio workspace, not a single app.

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
