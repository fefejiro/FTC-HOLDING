# PeacePad 2.0.1 release-candidate handover

Date: 2026-08-24
Branch: `fix/peacepad-2.0.1-android-production-profile-v2`
Initial release implementation: `aa8854a75` (`prepare PeacePad 2.0.1 release candidate`)
Current control head: `307b60945` (`release(peacepad): block store workflows until production writes are live`)
Control PR: [#294](https://github.com/fefejiro/FTC-HOLDING/pull/294) (merged)
Follow-up safety guard: PR #296 (merged); current head adds the same Canada
production-write preflight to iOS, Android AAB, and Play upload workflows.

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
- The ordinary lab manifest remains `0.0.1`; only explicit store modes resolve
  to marketing version `2.0.1`, preventing release identity from leaking into
  lab and Simulator builds.
- The Edge validation checks the environment-selected invitation scheme rather
  than rejecting the legitimate production bundle identifier globally.

## Reused Android release path

The repository also contains older `APPS/peacepad` Capacitor release notes.
Those notes document the legacy web-wrapper app and are not the V2 build
surface. V2 keeps the previously established EAS path: a Play App Signing-
compatible upload key, an AAB build, Internal Testing first, then Closed
Testing and phased Production promotion of the exact verified artifact.

The current candidate exposes two explicit Android EAS modes:

- `playstore-internal`: staging runtime, production writes disabled.
- `playstore-production`: Canada production runtime, explicit production-write
  authorization, version `2.0.1`, version code `43`.

The production profile remains guarded; it must not be built until production
OAuth, migration/rollback, canary, and physical-device gates are complete.

## Verified locally

Passed:

- `node scripts/check-lab-guardrails.cjs`
- `node scripts/check-secrets.cjs` — 141 files checked
- `git diff --check`
- Direct dynamic-config checks for production-without-Google and
  staging-with-valid-Google configuration
- `scripts/validate-supabase-edge-function.ps1` â€”
  `SUPABASE_EDGE_BOUNDARY_LOCAL_VERIFIED`

The clean worktree has no tracked or untracked source changes after the
candidate commit. Generated dependency-install output was moved outside the
worktree to `D:\PeacePadRelease\recovery\`.

## Not yet verified

- TypeScript, focused Jest, full Jest/coverage, Expo export, and native builds.
  A root clean install still reports a pre-existing monorepo lock mismatch.
  The focused PR relies on hosted CI for the authoritative clean-install and
  test result; no broad lockfile rewrite was accepted into this candidate.
- iPhone or Android physical-device journey.
- Signed iOS/Android artifact IDs and hashes for this exact commit.
- Production OAuth credentials/provider callback behavior.
- TestFlight, Play Internal Testing, App Review, or public availability.
- Android `playstore-production` signed AAB and Play promotion.

## Current evidence and blocker

- Hosted exact-head Native V2 gates passed at [run 32782416804](https://github.com/fefejiro/FTC-HOLDING/actions/runs/32782416804): isolated dependency install, secret scan, guardrails, TypeScript, Jest/coverage, Expo Doctor, and iOS export.
- The iOS production workflow now asserts source baseline `eb7c14399f3ffa67517acafd8f56a2a1b17fe284`, version `2.0.1`, build `5`, and matching IPA/evidence names.
- Canada production API health is reachable at `https://qzekqjewpugdotskrtni.supabase.co/functions/v1/peacepad-v2-api/health` and returns HTTP 200 with `environment=production`, `region=ca`, and `writesEnabled=false`.
- Static production-edge and cutover-contract checks pass, but production cutover remains blocked: no provider backup/PITR evidence, full migration rehearsal and rollback, controlled two-account production canary, physical-device journey, signed artifacts, or public store release has been verified.

## Reviewer verdict

`DO NOT APPROVE FOR STORE SUBMISSION` yet. The source candidate is prepared,
but dependency reproducibility, exact-platform builds, provider validation, and
physical-device evidence remain release gates.
