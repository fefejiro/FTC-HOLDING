# PeacePad Native source consolidation

## Source of truth

All new Native V2 work now starts from `main` at or after merge commit
`5e301627f`. Pull request #325 merged the product-core and visual branches on
2026-08-30. The former integration branch is retained temporarily as a
rollback reference; it is no longer a competing source of truth.

## What it combines

- Native account entry, invitations, messaging, records, calendar, parenting
  time, tasks, personality preferences, push handling and audio-call entry.
- Weather-aware activity ideas and calendar planning.
- Solo Prep Chat before a co-parent connection exists.
- The warm multi-colour home, full-bleed brand icon, call entry, and
  privacy-safe account export summary.

## Validation at consolidation

On 2026-08-30, the merged source passed the Native and infrastructure GitHub
gates, including TypeScript, guardrails, secret scan, and Jest coverage: 62
suites, 465 passing tests, 1 intentionally skipped, and exactly 75% branch
coverage. The production stores were not changed by this consolidation.

## Branch handling

| Branch | Purpose | Handling now |
| --- | --- | --- |
| `main` at/after `5e301627f` | Unified Native source | Active; use for all next work and device builds. |
| `work/peacepad-native-consolidated-20260829` | Merged integration source | Retain temporarily for rollback; do not build new work from it. |
| `fix/peacepad-icon-release-2.0.1-6` | Product-core input | Merged through #325; safe to mark retired after rollback retention review. |
| `work/peacepad-port-current-20260828` | Earlier visual/Prep Chat input | Superseded; PR #323 closed and the useful commits are included in #325. |
| `feat/peacepad-v2-full-core` / `pp-v2-onboarding` | Historical release worktree | Preserve untouched; it is stale and has an untracked local `app.json`. |

Do not build or install from a legacy branch. For a device test, record the
`main` commit, Android version code, APK hash, and Pixel transport ID.
Promote no build to a store until the exact installed artifact completes the
two-account and audio device gate.
