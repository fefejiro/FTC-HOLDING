# PeacePad Native source consolidation

## Source of truth

All new Native V2 work now starts from branch
`work/peacepad-native-consolidated-20260829`, currently at commit
`5545fc054`. This branch is the one integration line for Android and iOS.
It is based on the stronger Native product-core source and includes the
distinct visual and solo-support work from the separate refresh branch.

## What it combines

- Native account entry, invitations, messaging, records, calendar, parenting
  time, tasks, personality preferences, push handling and audio-call entry.
- Weather-aware activity ideas and calendar planning.
- Solo Prep Chat before a co-parent connection exists.
- The warm multi-colour home, full-bleed brand icon, call entry, and
  privacy-safe account export summary.

## Validation at consolidation

On 2026-08-30, the combined source passed TypeScript, guardrails, secret scan,
and all Jest suites: 62 suites, 457 passing tests, 1 intentionally skipped.
The production stores are not changed by this branch.

## Branch handling

| Branch | Purpose | Handling now |
| --- | --- | --- |
| `work/peacepad-native-consolidated-20260829` | Unified Native source | Active; use for all next work and device builds. |
| `fix/peacepad-icon-release-2.0.1-6` | Product-core source used as the integration base | Keep until the consolidation PR is merged. |
| `work/peacepad-port-current-20260828` | Earlier visual/Prep Chat source | Superseded by this integration; close its draft PR only after the consolidation PR exists. |
| `feat/peacepad-v2-full-core` / `pp-v2-onboarding` | Historical release worktree | Preserve untouched; it is stale and has an untracked local `app.json`. |

Do not build or install from a legacy branch. For a device test, record the
integration commit, Android version code, APK hash, and Pixel transport ID.
Promote no build to a store until the exact installed artifact completes the
two-account and audio device gate.
