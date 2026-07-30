# PeacePad Next Native

Status: React Native / Expo successor lab; Gate 1 foundation in progress
Created: 2026-07-23

This workspace is a non-production prototype for testing the PeacePad Premium Delta experience while the submitted PeacePad iOS release remains frozen in Apple App Review.

## Hard boundary

This app must not replace, modify, or resubmit the current App Store build.

Current production release remains:

```text
APPS/peacepad
React Web -> Capacitor -> iOS App Store submission
```

This lab app is:

```text
APPS/peacepad-next-native
Expo / React Native prototype
mock data only
no production API writes
no App Store submission
```

## Prototype scope

- Premium onboarding.
- Goal selection.
- Calm-message composer.
- Parenting-time and child-call logs.
- Evidence/document vault concept.
- Source-linked timeline.
- Upgrade/value screen.

## Not in scope

- Production billing.
- Real court-document storage.
- Apple submission.
- Production API mutation.
- Call recording.
- Legal advice.
- React Native migration decision.

## Commands

```powershell
npm --workspace=@ftc/peacepad-next-native run guardrails
npm --workspace=@ftc/peacepad-next-native run typecheck
npm --workspace=@ftc/peacepad-next-native test
npm --workspace=@ftc/peacepad-next-native run test:coverage
npm --workspace=@ftc/peacepad-next-native run sim:doctor
npm --workspace=@ftc/peacepad-next-native run start
```

Install dependencies before running Expo if this workspace has not been installed yet:

```powershell
npm install
```

## QA and simulator proof

- Current status: `docs/STATUS.md`
- Feature QA matrix: `docs/QA_MATRIX.md`
- iOS simulator runbook: `docs/IOS_SIMULATOR_RUNBOOK.md`

The historical lab has rendered on MacInCloud iOS Simulator. The current Gate
1 commit still requires a fresh controlled Simulator pass and a real-iPhone
staging pass; automated proof is not presented as device proof.

## Decision gate

React Native migration can only be considered after:

1. Apple review completes for the submitted app.
2. PeacePad v1 is tested end to end on a real iPhone.
3. This lab app demonstrates materially better UX or capability.
4. Migration risks are documented and approved.
