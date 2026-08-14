# PeacePad V2 full-build developer handover

Last updated: 2026-08-14

Repository: `fefejiro/FTC-HOLDING`

Branch: `feat/peacepad-v2-full-core`

Pull request: [#250](https://github.com/fefejiro/FTC-HOLDING/pull/250)

Latest implementation commit: `d91a949bf`

App: `APPS/peacepad-next-native`

Platform: `APPS/peacepad-v2-platform`

## Read this first

PeacePad V2 is **not publicly released** and production writes must remain off.
The existing iOS and Android listings use `ca.peacepad.family`, but their
current store candidates are internal-test builds. Do not promote a staging
binary or enable production writes merely because automated tests pass.

The release order remains:

1. Canada-only production core with email, Apple, and Google authentication.
2. Verified one-to-one audio calling on real devices.
3. Ordinary video in a later release.
4. Optional Conch assistance only after video, dual consent, and cost controls.

Video and Conch must not block the core release. V1 users and supported data
must be migrated or bridged before V2 replaces the public app.

## Completed on PR #250

| Commit | Completed slice |
| --- | --- |
| `ef9c2d155` | Three-screen replayable onboarding, native Google token flow, concise account entry |
| `34270fa68` | Private record attachment upload, completion, listing, download, and cleanup boundaries |
| `c4d94b2d7` | Stable legacy source maps plus read-only task, expense, record, and attachment reconciliation archives |
| `d3669dafe` | Protected device push registration/revocation and audio-call mute, duration, reconnect, and notification controls |
| `22b0f4f65` | Canada production cutover contract guard correction |
| `d7a6920e1` | Verified provider link/unlink controls with fresh challenge and duplicate-account protection |
| `ffcbf31cc` | Transactional family exit with disclosed shared-history retention and authorization cleanup |
| `0e26ce399` | Privacy-safe support panel and content-free diagnostic identifier |
| `d3169759c` | Actor-bound profile editing with optimistic concurrency, EN/FR/ES UI, accessible success/error announcements, and content-free audit |
| `704253ad9` | Read-only legacy inventory now reports optional records, attachments, tasks, and expenses scope without emitting source content |
| `940cb599c` | Migration inventory evidence records the bounded read-only reconciliation scope |
| `8394bf44f` | Privacy-safe account export manifest with JWT/region/version/idempotency guards and content-free audit |
| `1b534773e` | Production upload workflow aligned to the app's current signed build 5 contract |
| `d91a949bf` | Status handover updated to distinguish production build 5 from the internal TestFlight build 3 |

Existing pre-PR work already supplies persistent messaging, Calendar basics,
private Case Binders, account deletion, offline message retry, regional call
lifecycle/signaling/TURN authorization, and an audio WebRTC coordinator. Treat
those as automated foundations, not proof of production readiness or audible
real-device calling.

## Latest verification

Commits `d3169759c` and `704253ad9` passed their scoped local checks:

- TypeScript: `npm run typecheck`
- Jest: 53 suites, 412 passed, 1 skipped
- Coverage: 80.45% statements, 75.07% branches
- Native guardrails and 139-file secret scan
- Edge static validator and Deno typecheck/tests
- Platform 804-file secret scan
- Legacy inventory static boundary and optional-scope checks
- Fresh PostgreSQL 18.3: every migration applied twice
- Profile proof: `PROFILE_UPDATE_POSTGRES_VERIFIED`
- `git diff --check`

The previous exact PR head `0e26ce399` has hosted PeacePad Native and
Infrastructure PASS results. Require new hosted PASS results on the descendant
head containing `d3169759c` before merging. Ignore unrelated Garden workflow
failures.

## Current store and runtime truth

- Canada production Supabase exists, but the public V2 write boundary remains
  locked. Do not change that without the cutover gates below.
- iOS `2.0.0` build 3 is an internal TestFlight candidate, not the current PR
  source and not public production.
- Android `2.0.0` version code 42 is on the existing Google Play Internal
  Testing list, not the current PR source and not public production.
- A new signed candidate must be built from the final, merged, exact source.
- Google native sign-in code is present. Provider launch still requires the
  correct `peacepad-46799` OAuth clients, Play App Signing fingerprints,
  Supabase Google provider configuration, and protected EAS client IDs.
- Never commit service-account JSON, OAuth client secrets, TURN secrets,
  database URLs, Apple credentials, or tester credentials.

## Release blockers in priority order

1. **V1 migration and rollback:** run read-only source inventory against the
   real legacy source, complete user/family/message/calendar mappings, copy
   supported attachments to private V2 storage, reconcile counts/checksums,
   and prove rollback on a production-shaped copy.
2. **Canada production canary:** backup first, deploy the exact reviewed
   migrations/API, keep writes locked, then run a temporary two-account canary
   before authorizing writes.
3. **Authentication matrix:** configure real Apple/Google provider settings and
   prove new/existing email, Apple, Google, provider linking, recovery,
   revocation, deletion, and cross-platform access without duplicate accounts.
4. **Customer-core gaps:** complete data export, device/session management,
   Calendar recurrence/reminders/time zones, attachment export, and final
   notification behavior.
5. **Physical-device gates:** two phones must pass messaging, offline recovery,
   Calendar, Records, account controls, audio over Wi-Fi/cellular/TURN,
   background/locked-screen/interruption, microphone denial, and reconnect.
6. **Human review:** VoiceOver, TalkBack, max text size, Switch Control, reduced
   motion, contrast/focus, EN/FR/ES linguistic review, privacy and safety review.
7. **Store release:** build one exact signed Canada-production candidate, use
   internal cohorts first, then phased App Store and Play production rollouts.

## Latest bounded slice: privacy-safe account export manifest

The current branch adds `POST /api/v2/account/export` and the matching
native `prepareAccountExport` contract. It requires the authenticated JWT,
the exact region, an `If-Match` identity version, and an idempotency key. The
server returns aggregate counts plus `contentIncluded: false`; it never
returns message bodies, filenames, object paths, tokens, or authentication
material. The `account.exported` audit event is content-free. This is an
export manifest/preparation step, not yet a downloadable archive; a later
signed bundle worker must be added before claiming full data-export support.

Local proof for this slice: native TypeScript, Deno Edge check, diff check,
and `CoordinationApi.test.ts` (33/33) pass. Descendant Native and Infrastructure
hosted gates passed at `1b534773e`; the account-export SQL proof is still a
follow-up requirement before calling the export slice independently
POSTGRES-VERIFIED.

## Next developer: first three tasks

1. Confirm the remote branch contains the export slice and the descendant-head
   Native/Infrastructure PASS runs (`31842968700` / `31842968741`), then merge
   PR #250 only when the repository checks pass.
2. Resolve the production upload blocker: create the approved Google Web and
   iOS OAuth clients for `ca.peacepad.family`, set the three protected EAS
   production client-ID variables, then rerun the build-5 upload workflow.
3. Start a new isolated branch for a **read-only real V1 inventory and migration
   reconciliation report**. Do not mutate production and do not copy passwords.
4. Implement the next bounded production-core slice: authenticated data export
   with content-free audit, followed by device/session management. Keep video
   and Conch feature flags off.

## Useful commands

From `APPS/peacepad-next-native`:

```powershell
npm run typecheck
npm run test:coverage
npm run guardrails
npm run secret-scan
git diff --check
```

From `APPS/peacepad-v2-platform`:

```powershell
& .\scripts\validate-supabase-edge-function.ps1
npx deno check supabase\functions\peacepad-v2-api\index.ts
npx deno test supabase\functions\peacepad-v2-api\*_test.ts
& .\scripts\check-secrets.ps1
```

## Non-negotiable safety boundaries

- Canada only for the first V2 public release; no public region picker.
- Server derives identity, family membership, and call participants.
- No raw password migration, call recording, transcript, SDP/ICE persistence,
  or service-account JSON in the app.
- Account deletion removes private/auth/session/device data while disclosed
  shared coordination history remains for the other authorized parent.
- Ordinary sending and ordinary calls must continue without Message Check or
  future Conch assistance.
- Conch remains disabled until a later reviewed release with per-call dual
  consent, no stored content, 10 assisted minutes per call, and a hard
  $10 CAD monthly limit.

For historical evidence and store identifiers, see [STATUS.md](STATUS.md). For
the old staging chronology, see [STAGING_PROGRESS.md](STAGING_PROGRESS.md).
