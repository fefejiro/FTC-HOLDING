# PeacePad Native V2 — 2.0.2 cloud-only release handover

Updated: 2026-09-04

## Active 2.0.3 delivery checkpoint — 2026-09-11

### Source-fix checkpoint — 2026-09-12

The installed Android code-52 recording APK predates the newest fixes and is
not evidence for them. Shared-event delivery failed because connected spaces
were still bootstrapped with private calendar layers and the event form chose
the first layer without showing its scope. Native source now provisions family
layers for connected runtimes, defaults Home event creation to the shared
Events & Activities layer, and labels layer choices Shared or Private. A new
database migration creates/backfills separate shared defaults for active
two-parent conversations while preserving all existing private layers/events.

Private-call signaling failed because the caller subscribes before acceptance
while the Realtime authorization function allowed only active calls. A second
migration keeps topic, participant, family, region, grant, and version checks
but authorizes both ringing and active handshake states. These migrations pass
the local Supabase boundary validator but are not live until deployed through
the protected backend workflow.

The complete Native suite passes (73 suites; 517 passed, 1 skipped), as do
Native TypeScript, guardrails, secret scan, legacy support tests/typecheck,
Supabase boundary validation, and diff checks. Existing Jest open-handle and
VirtualizedList warnings remain test-harness observations. Cut one monotonic
source-bearing candidate only after backend deployment/preflight; do not call
the existing code-52 APK repaired or recording-ready for these paths.

The current objective is one continuous delivery path: exercise the canonical
app as a solo parent, connect a second isolated co-parent, assess complete
private/shared workflows for functional correctness and real parent value,
fix evidence-backed defects, cut one traceable Android/iOS release candidate,
and promote that exact candidate through the existing protected CI/CD path
only after the device and owner-approval gates pass. Do not create repetitive
builds for test setup or provider-only changes.

The current Android recording candidate is `ca.peacepad.family` 2.0.3 (version
code 52), EAS build `6bafd937-4ac1-464f-9006-1873f4ae3294`, packaging source
`6bb939ce31a55e1039a6cfcf6afd42b27ed969e7`. The retained APK is
`D:\PeacePadRelease\artifacts\20260911-recording-rc\PeacePad-2.0.3-52-darkfix-recording.apk`
with SHA-256
`A92874E65CA1C6F1DFB00A1EE78AA529F00B3A907ABCD39BF11ABFF0BF127168`.
Pulled `base.apk` files from both API-37 emulators matched that hash exactly.

Android Google sign-in is currently blocked after account selection by native
OAuth developer configuration. The exact APK signer SHA-1 and SHA-256 are now
registered on Firebase Android app `ca.peacepad.family`, and this change made
the Google account picker available on both emulators. Firebase nevertheless
still returns only OAuth client type 3 (web) for this package and no Android
OAuth client type 1 associated with the package/certificate pair. Repair that
existing project's Android OAuth registration, then retest this same APK;
do not rebuild solely for this provider-side correction. Production EAS has
the web client, iOS client, and iOS URL-scheme variables, with the visible
project number aligned to `peacepad-46799`; values remain redacted.

iOS authentication currently has static configuration/test coverage only.
It must not be called working until Google and Apple sign-in are exercised on
a physical iPhone/TestFlight candidate. Android emulator proof is likewise
not physical-device or store-release proof.

The PeacePad owner browser account visibly confirmed project access and both
registered RC fingerprints. Google Cloud then required owner-password
re-verification before OAuth client administration. The handoff page was
retained for the owner; credentials must not be retrieved, recorded, or
automated. Focused Google-native and iOS release-configuration tests passed
(2 suites, 14 tests), and TypeScript typecheck passed. Jest needed
`--forceExit`, which remains a test-harness cleanup observation.

### Two-parent native evidence update — 2026-09-11

The existing EAS-signed Android recording APK could open the Google account
picker but failed after selection because the existing `PeacePad Android Play`
OAuth client is intentionally bound to the Play signing SHA-1. A second Android
OAuth client, `PeacePad Android EAS RC`, was created in the same existing Google
Auth Platform project for `ca.peacepad.family` and the exact EAS APK SHA-1.
The original Play client was retained. Firebase configuration now presents
Android client type 1 and web client type 3; both isolated Android accounts
completed Google selection without the prior native configuration error. This
was provider-only remediation: no source change, app build, upload, or store
mutation occurred.

Initial two-parent evidence from the same APK is mixed: both parents enter a
distinguishable shared space and report Connected; sender-to-recipient message
delivery succeeds after recipient restart/reselect; a Home-created shared
`Demo pickup` is not visible to the recipient even after restart/reselect;
and an audio call reaches accepted state but fails with private call signaling
unavailable. Typed Conch Coach returns a child-centred private response. A
later clean tap displayed Android's microphone permission prompt, correcting
the earlier missed-prompt observation; permission acceptance, listening,
stop/transcription, retry, and two-parent Conch remain unverified.
The recipient is returned to space selection after restart, so selected-space
persistence is not proven. These are release-gate defects/unverified paths,
not reasons to create another build until bounded root causes are fixed.

The nearby-support recording path also failed despite one emulator having
foreground location permission and a valid recent fused/GPS fix. The app only
attempted a fresh balanced fix, entered Android's location-settings checker,
and discarded the usable cached location. The source candidate now checks
Location Services, bounds the fresh request, falls back to a recent accurate
cached fix, and provides an actionable manual-entry error. A second contract
defect was also found: the upstream support-discovery schema rejected the
native `radiusKm` field, hard-coded an 80 km Ontario 211 search, and discarded
provider coordinates/distance. The contract now accepts and forwards the
selected radius, computes distance from provider coordinates, returns it, and
filters known out-of-range local results. National/directory resources remain
clearly identified as distance-free. Conch's
rounded-square artwork is now circularly clipped and enlarged in its round
voice focal points. Focused Support/Parent Core/Coach tests pass (3 suites,
6 tests); support-discovery unit tests pass (1 suite, 3 tests); both Native and
legacy TypeScript checks pass. Installed-device proof and confirmation that
the production discovery provider is configured require the next
source-bearing candidate and provider audit.

This is the resume ledger for the current PeacePad release. It is deliberately
cloud-first: do not create a new local checkout, native build, dependency tree,
or cache. Use `C:\ppn` only for narrow source-control work and execute release
operations through GitHub Actions, EAS, Supabase, App Store Connect, and Google
Play. Any unavoidable downloaded artifact belongs in `D:\PeacePadRelease\artifacts`.

## Canonical source

- Checkout: `C:\ppn`
- Branch: `peacepad-native-main`
- App-tree release source: `be7a4ef8d224cfd075ed5d89907e55c4841a29c6`
- Current reviewed app candidate: `253b9ebda859b6fe13f4c5a6899ceb272c783f66`
- Current release-control head: `ea963fbd8dfa275b749ce663a3417c9ee8d66e6d`
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

## Auth provider transition captured 2026-09-04

The reviewed authentication and coordination candidate was pushed at
`253b9ebda859b6fe13f4c5a6899ceb272c783f66`. Its full gate passed 73 Jest
suites with 512 tests passed and 1 skipped, plus typecheck, guardrails, secret
scan, native audio/video checks, iOS preflight, YAML parsing, and
`git diff --check`. The current public 2.0.2 binaries predate this candidate.

The provider configuration workflow was hardened at
`ea963fbd8dfa275b749ce663a3417c9ee8d66e6d`. It now has guarded operations for
read-only status, native Apple configuration, and full Google plus Apple
configuration. The full social-provider path fails before mutation unless all
required protected secrets exist, preserves email/signup settings, reads the
configuration back, and prints only redacted state.

Native Sign in with Apple was configured for the verified audience
`ca.peacepad.family`, and manual identity linking was enabled. Mutation run
`33841876572 <https://github.com/fefejiro/FTC-HOLDING/actions/runs/33841876572>`
succeeded. Independent read-only run
`33841919144 <https://github.com/fefejiro/FTC-HOLDING/actions/runs/33841919144>`
then reported:

- email enabled;
- Apple enabled with a client audience present;
- manual linking enabled;
- Google disabled with no client audience present;
- no secrets printed.

Google remains blocked because the protected environment contains no genuine
PeacePad Google Web OAuth client secret or accepted additional client IDs. Do
not use Firebase/service-account JSON, an API key, or the iOS client ID as that
secret. Store `PEACEPAD_GOOGLE_WEB_CLIENT_ID`,
`PEACEPAD_GOOGLE_ADDITIONAL_CLIENT_IDS`, and
`PEACEPAD_GOOGLE_WEB_CLIENT_SECRET` in the existing protected environment,
then use the guarded provider workflow. Do not dispatch new store builds until
Google and Apple have both passed real physical-device sign-in with fictional
accounts; no connected Android or iPhone was available during this transition.

## Scope guard

On 2026-09-04, PR #343, the only open FTC-HOLDING pull request explicitly
scoped to PeacePad, was closed. The remaining open FTC pull requests are
unrelated product work and must not be closed as part of this release.

## Latest production transition — 2026-09-04

This section supersedes older current-state statements above; earlier entries
remain as historical evidence for the 2.0.2 release.

- Google and Apple providers are enabled in the production Supabase project,
  with email sign-in and manual identity linking retained. Read-only provider
  audit: https://github.com/fefejiro/FTC-HOLDING/actions/runs/33843234903
- Release-control commits aligned the native production redirect identity and
  store controllers to `2.0.3` / Android `52` / iOS `13`. The exact reviewed
  source for the current release run is
  `a6d58fe62c8df2927b59471df81265eb322c9a77`.
- The signed iOS build-and-upload workflow completed successfully:
  https://github.com/fefejiro/FTC-HOLDING/actions/runs/33851836370 . App Store
  Connect accepted build `13` with processing state `VALID`; read-only status
  evidence: https://github.com/fefejiro/FTC-HOLDING/actions/runs/33854594121 .
  The 2.0.3 App Store version is still absent, so the build is not prepared,
  submitted for review, or public.
- iOS build `13` was produced from `a6d58fe62c8df2927b59471df81265eb322c9a77`.
  The later app commit `a731a7f66f899170fb913e01e825e40a17ac070f`
  keeps email authentication available when the social-provider probe is
  unavailable and is not contained in build `13`. Do not submit build `13`
  publicly without explicitly accepting that source difference or replacing
  it with a new iOS build number from the latest reviewed app source.
- Android `2.0.3` / version code `52` device candidate build
  `35a0362d-60df-48dc-909c-8132c1e3a620` failed before producing an artifact.
  EAS treated the Native app as an FTC root npm workspace and ran `npm ci`
  against the wrong package/lockfile boundary. No Play mutation occurred.
- Commit `c3e4de7086c11a416eba68db55f4f5cae639c6c3` repairs the two canonical
  Android build workflows. They now archive the exact Native subtree into an
  isolated Git repository, validate `2.0.3` / `52`, use EAS remote signing,
  and reject any returned artifact whose identity or profile does not match.
  The isolated archive tree matched the reviewed source and its clean
  `npm ci --dry-run --workspaces=false` preflight passed. No replacement EAS
  build had been dispatched when this entry was written.

### Remaining release gate

Before any public App Store submission or Google Play production promotion:

1. Verify the iOS upload reaches a valid TestFlight/App Store Connect build.
2. Run fresh Android and iOS physical-device journeys, including native
   confirmation/recovery deep links, restart persistence, and provider sign-in
   with fictional disposable accounts only.
3. Record redacted device evidence and provider state. Do not use a personal
   Google or Apple account as a test identity.
4. Obtain separate exact authorization phrases for App Store prepare, App
   Store submit, and Play production upload. An uploaded or accepted artifact
   is not public-store proof.

## Private attachment contract hardening — 2026-09-04

The mobile review found a contract mismatch that caused the iPhone Case Binder
flow to reject valid private attachments: the database stores `active`, while
the native response validator expects the external status `available`. The
canonical boundary is now enforced by migration
`APPS/peacepad-v2-platform/supabase/migrations/202609040001_v2_private_attachment_status_contract.sql`:
`active` maps to `available`, and `archived` remains `archived`. Authorization,
owner/family/binder checks, size validation, expiry checks, and storage
existence checks remain fail-closed.

The native flow now preserves selected-file metadata for safe retry, uses
user-safe upload/open errors, filters archived files from the active list, and
moves archive management out of the primary Case Binder action stack. The
working-tree candidate passed typecheck, the full Jest suite (73 suites, 513
passed, 1 skipped), guardrails, secret scan, Edge validator, iOS preflight,
audio configuration checks, and iOS/Android Expo bundle exports. These exports
are JavaScript bundle validation only; no signed binary, EAS build, store
upload, or public-release claim is made from them. The migration still needs
to be applied through the approved cloud deployment path before a real device
retest.

## Budget first CI and build policy, 2026-09-12

PeacePad is currently operated by a solo funded company. Release work must use
provider minutes and build capacity deliberately. A new developer must not
dispatch GitHub Actions merely to discover whether the account can run jobs.

Use this order for every candidate:

1. Prove the canonical checkout, reviewed source SHA, clean scoped diff, package
   identity, and intended version code locally.
2. Run type checking, focused tests, the full supported test suite, release
   guardrails, secret scanning, and diff hygiene locally before requesting a
   signed build.
3. Query GitHub billing or account health and inspect the latest workflow state
   before dispatch. If the account is locked or hosted runners are unavailable,
   do not retry the same workflow.
4. For an install only Android test artifact, use one exact source package and
   one direct EAS build when GitHub cannot provide a runner. Keep the source SHA,
   EAS build ID, version, version code, hash, signing certificate, and
   `store_submission_attempted=false` in the evidence folder.
5. Reserve protected GitHub release workflows for validation that benefits from
   CI isolation, team review, backend deployment, or store delivery. Never use a
   store workflow for ordinary emulator iteration.
6. Reuse a matching completed artifact when neither source nor native build
   configuration changed. Provider configuration checks alone do not justify a
   replacement binary.
7. Never start both GitHub and direct EAS builds for the same source. Confirm the
   first path failed before using the fallback.

On 2026-09-12, Android install only workflow run `34715191135`, pinned to source
`ccac18d2c637e6edef0e7f97313637b7e46df1a1`, failed before checkout and before
executing any step. GitHub reported: `The job was not started because your
account is locked due to a billing issue.` No EAS build, artifact, upload, or
store action was created by that workflow. The approved fallback is one direct
EAS `production-device-apk` build from an isolated archive of the same source.
This incident is a CI availability and cost control finding, not a PeacePad
application defect.
