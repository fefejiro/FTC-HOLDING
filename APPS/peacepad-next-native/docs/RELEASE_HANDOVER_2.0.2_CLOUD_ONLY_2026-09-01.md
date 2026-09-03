# PeacePad Native V2 — 2.0.2 cloud-only release handover

Updated: 2026-09-01

This is the resume ledger for the current PeacePad release. It is deliberately
cloud-first: do not create a new local checkout, native build, dependency tree,
or cache. Use `C:\ppn` only for narrow source-control work and execute release
operations through GitHub Actions, EAS, Supabase, App Store Connect, and Google
Play. Any unavoidable downloaded artifact belongs in `D:\PeacePadRelease\artifacts`.

## Canonical source

- Checkout: `C:\ppn`
- Branch: `peacepad-native-main`
- App-tree release source: `be7a4ef8d224cfd075ed5d89907e55c4841a29c6`
- App identity: `ca.peacepad.family`
- Release: `2.0.2`; Android version code `51`; iOS build `12`

Release-control changes can have a newer outer Git SHA without changing the app
tree. They were made to correct store workflow behaviour, not to generate a
second application candidate.

## Verified release evidence

### Backend and quality

- Production support fallback with Canada 211, ShelterSafe, Justice Canada,
  9-8-8 Canada, and Kids Help Phone was deployed by GitHub Actions run
  `33552795605`.
- The pre-release suite passed: 72 suites, 497 tests passed, 1 skipped,
  plus typecheck, guardrails, secret scan, and release checks.
- The support finder implementation is in
  `APPS/peacepad-next-native/src/support/SupportFinderScreen.tsx`; its backend
  fallback is in `APPS/peacepad-v2-platform/supabase/functions/peacepad-v2-api/index.ts`.

### Android

- EAS store build: `8b8a87c2-8d74-4e24-bf1e-2d930bb77797`
- Build source: the app-tree SHA above; EAS fingerprint
  `37f506377750482cc09e4eb53f2cf38dde883d3a`
- Signed AAB SHA-256:
  `5ce192f444edceb6c5f64540297917f45b26d0363173e323aae876f007af6124`
- Production build run: https://github.com/fefejiro/FTC-HOLDING/actions/runs/33557088101
- Verified Google Play production upload: https://github.com/fefejiro/FTC-HOLDING/actions/runs/33560771954

The earlier upload attempt `33560310473` stopped before any Play write because
an old EAS CLI could not query the new build. The verified SHA fallback was used
instead. Do not retry that old path or create a duplicate build.

### iOS

- EAS/App Store upload submission: `4f7bb23b-7887-4a84-8b52-7983b8a97bd6`
- App Store Connect app ID: `6793350735`
- App Store build resource: `25578ad2-a33e-48e3-b2df-96bf2de31c64`; processing
  state was `VALID`.
- App Store version resource: `92329c0d-9713-49ef-b176-a0528cf7222d`
- App Review submission: `034840e4-d38f-429b-9e05-1fc39460a7f2`
- Latest submit workflow: https://github.com/fefejiro/FTC-HOLDING/actions/runs/33566949736
- Recorded provider state after submission: `WAITING_FOR_REVIEW`, automatic
  release after approval.

The first prepare run created the version and attached the build, then received
Apple's benign `usesNonExemptEncryption already set` conflict. The release
controller was made idempotent and the subsequent prepare and submit runs
succeeded. Do not recreate the version or submission.

## One canonical cloud release path

- iOS: registered workflow `peacepad-v2-ios-production-release.yml`.
  Supported operations are `build-upload`, `asc-status`, `asc-prepare`, and
  `asc-submit`. Always run `asc-status` before a mutable operation.
- Android: `peacepad-v2-android-play-production-upload.yml`, with production as
  the only intended public track. Reuse a verified signed artifact by URL and
  SHA when EAS cannot inspect a historical build.
- The App Store controller is
  `APPS/peacepad-next-native/scripts/app-store-connect-release.mjs`. It uses
  the organization-approved Apple API configuration held in protected workflow
  secrets; never put credentials in source, logs, docs, or a local file.

## Current public-release boundary

The store-side gates have been completed, but public launch is not yet proven:

- Apple was waiting for review after the valid 2.0.2 build was submitted.
- Google Play had accepted the production upload, but the public listing had
  not yet exposed 2.0.2.

Uploaded, accepted, submitted, under review, and publicly available are
different states. On the next session, refresh both provider/public states
before describing PeacePad as launched.

## Auth incident captured 2026-09-02

The iPhone confirmation email opened `http://localhost:3000` and failed with
`ERR_CONNECTION_REFUSED`. In the canonical source at the release SHA,
`SupabaseSessionProvider` already sends the native redirect
`peacepad://auth/confirm` (and `peacepad://auth/reset-password` for recovery),
and the production Expo config registers the `peacepad` scheme. Therefore this
is a hosted Supabase Auth URL configuration/stale-provider issue, not evidence
that the native redirect code is missing.

The production Supabase Auth URL configuration uses `https://peacepad.ca` as
the site URL and allows the exact native redirects `peacepad://auth/confirm` and
`peacepad://auth/reset-password` (plus any explicitly approved web fallback).
Then send a new disposable confirmation email and prove that it opens the
PeacePad app. Do not use a `localhost` site URL in production. Google and Apple
provider settings must likewise be enabled for the production project and
matched to the native client IDs; keep their secrets out of source and logs.

The Auth URL contract was applied and read back successfully by the guarded
workflow run
`33699657066 <https://github.com/fefejiro/FTC-HOLDING/actions/runs/33699657066>`:
site URL `https://peacepad.ca`, native confirmation and recovery redirects,
and no `localhost` entry. The old email must not be treated as a valid test
result; request a fresh confirmation link because Auth links are single-use
and may carry the old redirect target. A physical iPhone retest is still
required before calling the login journey verified.

## Safe resume checklist

1. `git -C C:\ppn status --short --branch`; preserve unrelated dirty files.
2. Read this document and inspect the latest GitHub workflow runs before any
   dispatch.
3. Check Apple with the registered iOS workflow `operation=asc-status`; do not
   run prepare/submit unless the current provider state makes it necessary.
4. Check Play production and the public listing. Do not build/upload again when
   the recorded AAB and its hash match.
5. Record provider state and storefront evidence separately. Only call it live
   when the public storefront confirms the new release.
6. Keep testing and release work in cloud services. Never let a local build or
   cache consume C: for this project.

## Scope guard

There were no open PeacePad pull requests in `fefejiro/FTC-HOLDING`,
`fefejiro/PeacePad-`, or `fefejiro/fefejiro-PeacePadAI` when this handover was
closed. Do not close unrelated FTC pull requests.
