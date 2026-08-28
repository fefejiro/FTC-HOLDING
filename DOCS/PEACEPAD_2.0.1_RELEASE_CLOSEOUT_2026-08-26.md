# PeacePad 2.0.1 release close-out

Date: 2026-08-26  
Repository: `fefejiro/FTC-HOLDING`  
Canonical release source: `b7bead82e213f4ae13a74cdeef9ce064906aca25`  
Canonical `main` control head: `bbb17c0009c9678521e56d6bd4a5606ca6851b8e`

## Current public state

- **Android: PUBLIC** — PeacePad 2.0.1, version code 44 is live on the
  existing Play listing: <https://play.google.com/store/apps/details?id=ca.peacepad.family>.
- **iOS: submitted, not public yet** — PeacePad 2.0.1 build 6 is uploaded,
  attached to App Store Connect, and submitted for review. Apple currently
  reports **Waiting for Review**. Automatic release after approval is selected.
  Public availability and the final public icon/version still require Apple
  approval and propagation.

## Exact release evidence

### iOS

- Bundle: `ca.peacepad.family`
- App Store ID: `6793350735`
- Marketing version/build: `2.0.1 (6)`
- Source target: `b7bead82e213f4ae13a74cdeef9ce064906aca25`
- GitHub workflow: run `33013085901`, job `98324159709`
- Workflow: <https://github.com/fefejiro/FTC-HOLDING/actions/runs/33013085901>
- EAS submission: `11ce2dec-aaea-42e0-bb3e-4d34e70f4e14`
- EAS submission details: <https://expo.dev/accounts/official_fejiro/projects/peacepad-next-native-lab/submissions/11ce2dec-aaea-42e0-bb3e-4d34e70f4e14>
- App Review submission: `04120e15-5a8f-49d4-b18c-b5c3891213e6`
- Evidence directory (non-secret files only):
  `D:\PeacePadRelease\artifacts\ios-2.0.1-6\peacepad-v2-ios-production-b7bead82e213f4ae13a74cdeef9ce064906aca25`
- Runtime: `production-ca`; production writes were enabled for this signed
  production candidate.

### Android

- Package: `ca.peacepad.family`
- Marketing version/code: `2.0.1 (44)`
- EAS build: `ea2df716-b2e4-4608-82ed-1dd08c91ab81`
- Artifact: `D:\PeacePadRelease\artifacts\android-2.0.1-44\peacepad-v2-production.aab`
- Artifact SHA-256: `A5808029761318182E50165A8697281FB4A50CBD9F266DDBE0F12551D7328625`
- Runtime: Canada production; no staging/demo data was used for the public
  release.

## PR and branch clean-up

The open-PR inventory was checked against title and head branch. **No open PR
is a PeacePad PR.** The current PeacePad release/control stack is already
merged or closed, including #279, #280, #281–#311 as applicable. Unrelated
open PRs were left untouched, including the Anion/Dispatch, JobAgent,
UnaSocial, security, and Copilot work. Remote branches were not deleted.

The last release PRs of record are:

- #308 — restore reviewed V2 source on `main` (merged)
- #309 — pass production write flag to Android EAS (merged)
- #310 — fail closed against synthetic production runtime (merged)
- #311 — branded production icon and release build increment (merged)

## What is synchronized

- GitHub `main` resolves to the control head recorded above.
- The release source, version contract, package/bundle ID, Canada production
  runtime, and branded icon are all in the merged source lineage.
- iOS build 6 and Android code 44 are distinct immutable artifacts; neither
  was replaced after upload.
- Evidence is linked by source SHA, artifact ID/hash, version, and store
  destination. This is the debugging starting point for the next iteration.

## Lessons learned

1. Check the repository and worktree before running EAS. A project-level EAS
   link in an unrelated checkout can create the wrong project and fail because
   `eas.json` is absent.
2. Treat `main` and the exact release source SHA as separate controls. A
   successful build from a stale branch is not release evidence.
3. Apple App ID capabilities must be enabled before credentials are generated.
   For this release, Push Notifications and Sign in with Apple were enabled,
   then a fresh distribution profile was created and verified.
4. Upload success is not review submission, and review submission is not
   public availability. App Store Connect needed a separate “Add for Review”
   action after the build was attached.
5. The old App Store tile can remain blank while a new icon is processing. The
   authoritative check is the icon on the exact processed build and the public
   listing after propagation.
6. Google sign-in must be configured as a production provider contract. If
   OAuth credentials are incomplete, the app must hide the control rather than
   ship a broken button; service-account JSON never belongs in the app.
7. EAS free-tier queues and Apple processing are asynchronous. Keep the EAS
   submission ID and App Store build/review state instead of starting duplicate
   uploads.
8. Store evidence must be separated by platform: Play public version is
   independently verified; iOS remains pending Apple review until the public
   listing shows 2.0.1.
9. Keep artifacts and dependency caches on `D:` and avoid broad monorepo
   copies to the nearly-full system disk.
10. Never claim physical-device, migration, call-media, accessibility, or
    seven-day monitoring proof from static tests or simulator evidence alone.

## Next owner actions

1. Monitor App Store review and verify the public iOS listing shows 2.0.1 and
   the branded icon after approval/propagation.
2. Run a small real-user production smoke on both stores: fresh install/update,
   email sign-in, Apple/Google where configured, message, calendar, sign-out,
   and deletion/session revocation. Record device/OS and timestamp.
3. Keep the V1 rollback rail available for seven stable public-production days.
4. Do not enable video, Conch, or new production migrations through remote
   configuration without a new reviewed build and evidence record.

## Reviewer verdict

Android 2.0.1 is publicly released. iOS 2.0.1 is submitted and waiting for
Apple review, so the cross-store 2.0.1 goal is **not yet fully complete**.
No further PeacePad PR closure is required at this point.

## Android internal-track correction — 2026-08-26

The tester supplied screenshots showing Google consent completed, followed by
`PeacePad could not restore this regional staging session.` This was the
previous guarded staging build remaining on the Internal Testing track; it was
not a Google OAuth rejection. Creating a PeacePad password with the Google
email was also not a valid Google sign-in path: Google authentication uses the
Google account consent and ID token, while email/password requires its own
verified password and recovery flow.

Play rejected re-uploading code 44 because that version code was already used
in Production. A narrow promotion workflow was therefore added and merged in
PR #312 (`e159788a6a6521da292525faab72dc081d538c17`). Run `33021613476`
completed successfully and promoted the existing production release:

- Package: `ca.peacepad.family`
- Version: `2.0.1`
- Version code: `44`
- Source SHA: `b7bead82e213f4ae13a74cdeef9ce064906aca25`
- Destination: Google Play Internal Testing
- Outcome: `completed`

The artifact itself was not rebuilt or duplicated. Testers should leave the
old internal enrollment/update path, uninstall any installed staging build,
then install/update from the PeacePad Play listing and confirm the installed
version is `2.0.1 (44)`. On the sign-in screen they should choose **Continue
with Google** and finish the Google sheet; they should not enter a generic
PeacePad password for that path.
