# PeacePad 2.0.1 release-candidate handover

Date: 2026-08-24  
Branch: `release/peacepad-2.0.1`  
Branch head: `657c3b9a0` (`docs: hand off PeacePad 2.0.1 candidate`)  
Release implementation commit: `aa8854a75` (`prepare PeacePad 2.0.1 release candidate`)

This is a reviewer handover for a candidate only. No App Store submission,
TestFlight upload, Google Play upload, or public release is claimed.

## Release contract

| Surface | Candidate value |
| --- | --- |
| Marketing version | `2.0.1` |
| iOS build | `5` |
| Android version code | `43` |
| iOS bundle / Android package | `ca.peacepad.family` |
| App Store record | `6793350735` |
| Runtime | Canada production configuration only |
| Google sign-in | Enabled only with valid Web/iOS OAuth IDs and matching iOS URL scheme |

## Reconciled source

- Started from the clean `feat/peacepad-v2-full-core` source at
  `8b18ac3179a3854ea2f6cd6d3b07cd451616bf24`.
- Reused only the focused onboarding/recovery and icon/workflow commits from
  the newer source; no historical mega-PR was merged wholesale.
- Preserved the existing authorization, regional, audit, deletion, and
  staging guardrails.
- Google OAuth is fail-safe: missing credentials remove the native plugin and
  hide Google controls in onboarding and linked-sign-in settings. Email and
  Apple remain available.

## Verified locally

Passed:

- `node scripts/check-lab-guardrails.cjs`
- `node scripts/check-secrets.cjs` — 141 files checked
- `git diff --check`
- Direct dynamic-config checks for production-without-Google and
  staging-with-valid-Google configuration

The clean worktree has no tracked or untracked source changes after the
candidate commit. Generated dependency-install output was moved outside the
worktree to `D:\PeacePadRelease\recovery\`.

## Not yet verified

- TypeScript, focused Jest, full Jest/coverage, Expo export, and native builds:
  the isolated install could not complete because the existing package lock
  and package manifest are out of sync; the available partial dependencies do
  not provide a valid Expo toolchain.
- iPhone or Android physical-device journey.
- Signed iOS/Android artifact IDs and hashes for this exact commit.
- Production OAuth credentials/provider callback behavior.
- TestFlight, Play Internal Testing, App Review, or public availability.

## Reviewer verdict

`DO NOT APPROVE FOR STORE SUBMISSION` yet. The source candidate is prepared,
but dependency reproducibility, exact-platform builds, provider validation, and
physical-device evidence remain release gates.
