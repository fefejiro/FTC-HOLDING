# PeacePad 2.0.1 end-to-end QA — 2026-08-27

## Scope

This check used the Play-delivered production binary on a physical Pixel 7 and
the Canada production API. It did not create a family, conversation, message,
calendar event, record, invitation, or call. No dummy or simulated production
data was used.

| Item | Evidence |
| --- | --- |
| Package | `ca.peacepad.family` |
| Android release | `2.0.1` / version code `45` |
| Device | Pixel 7 (`panther`), adb serial `2B260DLH2000C8` |
| Runtime | `production`, Canada, writes enabled, `playstore-production` |
| Play signer | SHA-1 `7b5df5e9f9a66b2867e92c2f47782f5ee7be2e2b` |
| Source worktree | `D:/PeacePadRelease/worktrees/peacepad-2.0.1-main-integration` |
| App log capture | `D:/PeacePadRelease/peacepad-android-qa-2026-08-27.log` |
| Latest logcat | `D:/PeacePadRelease/peacepad-android-logcat-latest-2026-08-27.txt` |

## Passed

- Production health returned `status: ok`, `environment: production`,
  `region: ca`, and `writesEnabled: true`.
- Play-installed APK manifest matched package, version, production runtime,
  production writes, and Google sign-in enabled.
- Onboarding displayed the PeacePad logo and the Next/Skip flow.
- Native Google sign-in opened the Google account picker. Selecting the
  controlled `fejiro.efiuvwere@gmail.com` account reached the production
  family setup screen.
- Force-stop and relaunch restored the authenticated session.
- Sign-out followed by Google re-entry returned to family setup without an
  auth crash or duplicate account.
- Empty family and invitation forms correctly disabled their submit actions.
- Accessibility labels exposed the logo, family name, and invitation-code
  controls.
- Logcat contained no `DEVELOPER_ERROR`, package-registration failure,
  `GoogleIdentityError`, Supabase auth failure, or app fatal exception.
- A fresh foreground PID-filtered capture showed only normal keyboard/insets
  events from the app. Device-wide Google account warnings were slow binder
  transactions from Android's account authenticator, not a PeacePad crash or
  OAuth rejection.

## Finding: single-parent entry was blocked

The previous runtime required an active shared conversation after a family was
created. A sole parent could authenticate, but was then told to share an
invitation code before the main experience could open. This was a product-flow
gap, not a Google or network failure.

The release source now provides an explicit **Continue without a co-parent**
path from both the first family screen and the post-family connection screen.
It opens a persisted, identity-scoped private workspace. The workspace is
honest about its boundary: no information is shared, and shared messaging,
calendars, and calls remain unavailable until another authorized family member
joins. It does not create a fake conversation or relax server authorization.
The choice is remembered in SecureStore and can be cleared with **Invite a
co-parent later** or **Set up family connection later**.

Regression coverage was added for both paths in
`src/runtime/PeacePadStagingRuntime.test.tsx`.

## Not run / still blocked

- Two-account invitation, messaging, calendar, records, notifications, and
  audio-call journeys require a second controlled account or a real tester
  invite. They were intentionally not fabricated.
- iOS physical-device validation of production build `2.0.1 (6)` remains
  separate from the older staging TestFlight binary that showed the
  “PeacePad unavailable” restore screen.
- Google cancellation/denial was not isolated from cached Play account
  foregrounding and needs a clean-account test.
- Jest and TypeScript binaries are absent from this worktree's incomplete
  `node_modules`; CI or a D:-backed dependency install must run the new tests
  before a replacement store artifact is submitted.

## Source validation

- `git diff --check` passed.
- PeacePad guardrails passed (`node scripts/check-lab-guardrails.cjs`).
- Secret scan passed (143 files checked).
- Babel TypeScript/JSX parsing passed for each changed source and test file.
- The attempted lockfile install was stopped after ten minutes with no
  executable links; no package-lock or source files were changed by it.

## Release interpretation

This change improves first-run UX and removes the invite-code dead end for a
single parent. It is not a claim that shared coordination or audio calling is
complete for a one-account session. A future full solo mode should add an
explicit server-side personal workspace/data contract rather than using a
self-conversation or synthetic UUID.

## Continuous candidate loop

The shared `assets/icon.png` was corrected in this release loop. The previous
asset contained a large white canvas around the purple PeacePad mark; the new
asset crops that canvas so the mark fills the launcher/store tile on both
platforms. The replacement requires new signed artifacts and fresh device
verification; the earlier code `46` / build `7` candidates are therefore
non-qualifying for this visual fix.

The next replacement candidate is intentionally monotonic and must be tested
as one cross-platform source revision:

| Candidate | Source | Runtime | Store identity |
| --- | --- | --- | --- |
| Android | `158a9350147c6f1b874d7f3c6a643e3f80c41391` | Canada production, writes enabled | `2.0.1` / code `47` |
| iOS | `158a9350147c6f1b874d7f3c6a643e3f80c41391` | Canada production, writes enabled | `2.0.1` / build `8` |

The iOS replacement workflow is uploading the signed build in run
`33087801116`. The Android replacement workflow `33087798042` was cancelled
while waiting for the remote EAS build (`06765820-663b-41b4-b8cd-9bcea08c36cf`);
it produced no AAB and is non-qualifying. Neither result is public-store
availability evidence until the exact artifact is processed, installed, and
verified.

Use this order for every change:

1. Restore dependencies from `APPS/peacepad-next-native/package-lock.json` on
   `D:`; do not reuse a partial `node_modules` tree.
2. Run typecheck, Jest/coverage, Expo config, guardrails, secret scan, and
   `git diff --check`.
3. Build one exact Android and one exact iOS artifact from the same source
   SHA. Record artifact IDs and checksums before installation.
4. Run the same journey on the Pixel and iPhone: fresh install, onboarding,
   private entry without an invite, email login, Google login, session
   restore, family creation, invitation, messaging, offline retry, calendar,
   records, audio call, sign-out, and deletion.
5. Capture Android PID-filtered logcat and iOS device/TestFlight console logs
   for each run. A fix is accepted only when the original failing scenario
   and the full journey both pass.
6. If a source fix is needed, add a regression test, increment only the
   affected platform build number, and repeat the full loop. Do not promote an
   older binary because a newer binary has not yet been proven.

The Play-delivered code `45` and App Store build `6` evidence above remains
historical evidence for the pre-fix binary. It must not be used to claim that
the private-entry fix is already in either store listing.

## Production family-load repair — 2026-08-27

The code `48` Play Internal Testing candidate was installed on the same
physical Pixel 7 after the first authenticated launch returned a safe
`DATABASE_NOT_READY` response from `GET /api/v2/parenting-tasks`. The Canada
production project was missing the already-reviewed migration
`202608270001_v2_parenting_tasks.sql`; this was a schema-only gap. The
migration creates the parenting-task table and its guarded list/create/update/
delete functions, with service-role-only execution. It does not insert,
update, copy, or delete user records.

The migration was applied through the linked production project with the
Supabase CLI, then its remote migration ledger was repaired to
`202608270001 / v2_parenting_tasks`. Read-only verification confirmed the
table and all four public functions exist.

| Item | Evidence |
| --- | --- |
| Android candidate | `2.0.1` / version code `48` |
| EAS build | `5d349663-7e07-48d2-913d-7e91940ca6ed` |
| AAB SHA-256 | `e0ed7a0e41992631f2b987739a5d41da5a0fe5668228a7f2a89a3a4286efe6d1` |
| AAB bytes | `90,370,276` |
| Play track | Internal Testing; not public production |
| Production migration | `202608270001 / v2_parenting_tasks` |
| Device evidence | `D:/PeacePadRelease/evidence/android-code48/` |

After the repair, the same Pixel session reached the authenticated production
Home screen. The captured UI exposes the PeacePad logo, Add an event, Tasks,
Activity ideas, Invite co-parent, Add a record, and Home/Calendar/Records/More
navigation. Calendar, Records, More, and the read-only Tasks screen each opened
without an API error. The filtered post-fix logcat contains no
`DATABASE_NOT_READY`, `FATAL EXCEPTION`, or PeacePad API failure.

The read-only Activity ideas route also opened from Home. Its captured UI shows
the weather and age-range filters, 15 ideas, and Plan in calendar actions; the
associated logcat contains no fatal exception or PeacePad API failure. Evidence
is retained at `D:/PeacePadRelease/evidence/android-code48/` under
`screen-activity-ideas.png`, `ui-activity-ideas.xml`, and
`logcat-activity-ideas.txt`. No plan or calendar mutation was submitted during
this check.

This proves the production family-load regression is fixed for the installed
account and that the code `48` binary reaches the main native workflow. It is
not yet proof of two-account invitation, message mutation, attachment upload,
audio media, or public Production rollout. Those require a second controlled
account and separate iOS physical-device evidence.

## iOS production upload evidence — 2026-08-27

The exact icon-corrected source `158a9350147c6f1b874d7f3c6a643e3f80c41391`
completed the signed iOS production workflow `33087801116`. The workflow
validated the Canada production runtime, `ca.peacepad.family`, version
`2.0.1`, build `8`, Google sign-in configuration, and production writes before
building and submitting the IPA. The submission receipt is
`3f269288-26a7-4025-a7a7-53f04e09df17`; App Store Connect accepted the upload
for processing. Xcode was `26.6 (17F113)` and the IPA SHA-256 was
`1c389181aadc1025fec6573f3af70ec19556254a4a00a3b18603d85b29ce57e2`.

The build is not yet App Review or public-store evidence: Apple processing,
physical-iPhone verification, review submission, and public availability still
need independent confirmation. The non-secret receipt files are retained at
`D:/PeacePadRelease/evidence/ios-build8-run33087801116/`.

## Android session-restore check — 2026-08-27

The installed Android `2.0.1` / version code `48` candidate was force-stopped
and relaunched on the same physical Pixel 7 without clearing app data or
submitting a write. The existing authenticated session restored directly to
the Canada production Home screen.

| Item | Evidence |
| --- | --- |
| Device | Physical Pixel 7, Android 17, ADB `2B260DLH2000C8` |
| Package | `ca.peacepad.family` |
| Candidate | `2.0.1` / version code `48` |
| Screenshot | `D:/PeacePadRelease/evidence/android-code48/screen-session-restore.png` |
| UI dump | `D:/PeacePadRelease/evidence/android-code48/ui-session-restore.xml` |
| Logcat | `D:/PeacePadRelease/evidence/android-code48/logcat-session-restore.txt` |

The screenshot and UI dump show the PeacePad logo, Home, Calendar, Records,
More, Add an event, Tasks, Activity ideas, Invite co-parent, and Add a record.
The filtered relaunch log contains no `FATAL EXCEPTION`, `DATABASE_NOT_READY`,
PeacePad API failure, or `ReactNativeJS` error. This is a session-restoration
and read-only navigation check only; it does not prove a second-account
journey, message/calendar/record mutation, audio media, Google clean-account
sign-in, or public store rollout.
