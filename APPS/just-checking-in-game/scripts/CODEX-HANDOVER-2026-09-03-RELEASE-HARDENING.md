# Just Checking In — 2026-09-03 release hardening handover

## Source of record

- Worktree: `D:\FTC-GAMES\worktrees\jci-ios-1.1-main2`
- Branch: `codex/jci-ios-1.1-main2`
- iOS release commit: `644078e42`
- Android code-7 candidate commit: `5130c04da`
- Android code-7 merge: PR #347, merge commit `fc4c8609f12d9639a6dcb242c3a3e71a2b7daebd`
- Unity: `6000.4.5f1`
- Product package/bundle: `com.ftcholding.justcheckingin` / `com.ftcholding.justcheckingin`
- Marketing version: `1.2.0`
- Android version code: `7`; iOS build number: `6`

The only pre-existing dirty path intentionally preserved is
`scripts/NEXT-GAME-RELEASE-PLAN.md`; it is unrelated to this release and was
not staged or changed by the hardening commit.

## Fixes verified

- Removed the stale `com.unity.input.settings.actions` reference to a missing
  asset from `ProjectSettings/EditorBuildSettings.asset`. The app uses the
  legacy UGUI input path (`activeInputHandler: 0`), so this reference was
  unnecessary and caused the Pixel runtime to emit repeated `Could not produce
  class with ID 115` errors during Input System startup.
- Replaced the direct `UnityEditor.Android.AndroidExternalToolsSettings` editor
  dependency with a reflection-based optional override. Android builds still
  receive the verified SDK/NDK/JDK paths; an iOS-only Unity editor can compile
  the shared build script without the Android editor module.
- `stripEngineCode: 0` is retained for this release while runtime-created JCI
  UI components are validated on device.

## Automated evidence

- EditMode: `D:\FTC-GAMES\jci-test-editmode-20260903-code7.xml` — 10/10
  passed, 0 failed.
- PlayMode: `D:\FTC-GAMES\jci-test-playmode-20260903-code7-fix.xml` — 7/7
  passed, 0 failed.
- Both suites ran in normal Unity Package Manager mode; `-noUpm` was not used.

## Android candidate evidence

The APK and AAB were built from commit `5130c04da` using the verified keystore
and Unity 6000.4.5f1. Android code 6 was already consumed by the rejected Play
draft and is superseded; it must not be relabelled or uploaded again. The
code-7 APK was installed on the connected Google Pixel 7 (`2B260DLH2000C8`).

- Device APK:
  `D:\FTC-HOLDING-releases\just-checking-in\android-20260903-code7\JustCheckingIn-1.2.0-code7-device.apk`
  - size: 33,503,222 bytes
  - SHA-256: `4FAB377FA084D0115B6EF05DC3B897FC2D95254071EDB823DC3AD212923CAF15`
- Play AAB:
  `D:\FTC-HOLDING-releases\just-checking-in\android-20260903-code7\JustCheckingIn-1.2.0-code7-play.aab`
  - size: 33,412,684 bytes
  - SHA-256: `B0BD56EDB008F3172EA2B873341EEE534CB2258BF615478779C10A349D0A258C`
- Package/version from APK and AAB manifest: `com.ftcholding.justcheckingin`;
  `versionName 1.2.0`; `versionCode 7`; min SDK 25; target/compile SDK 36;
  launcher `com.unity3d.player.UnityPlayerGameActivity`.
- Signing certificate SHA-256:
  `3f57ea45405524c9cf9a38ce0774e7dc56b80cf3481696adc04577b77c6825b3`.
  APK v2 verification passed; AAB `jarsigner -verify` passed (the local
  upload keystore is self-signed, as expected for this Play upload key).
- AAB manifest was inspected with bundletool 1.18.3. It includes only the
  Unity-generated INTERNET/VIBRATE and dynamic receiver permissions; no
  microphone, camera, location, recording, or tracking permission is present.

### Pixel 7 smoke result

- Install: `adb install -r` returned `Success`.
- Fresh launch after `pm clear`: process remained alive (`pidof` returned a
  live PID), package reports version code 7/name 1.2.0.
- Screenshots: `D:\FTC-HOLDING-releases\just-checking-in\android-20260903-code7\pixel7-jci-1.2.0-code7-relaunch.png`,
  `pixel7-jci-1.2.0-code7-solo-mood.png`, `pixel7-jci-1.2.0-code7-solo-card.png`,
  and `pixel7-jci-1.2.0-code7-system-back.png`.
- Focused runtime log:
  `D:\FTC-HOLDING-releases\just-checking-in\android-20260903-code7\pixel7-jci-1.2.0-code7-runtime-logcat.txt`.
- Home, solo mood selection, the physical prompt card, and Android system Back
  were exercised on device. Back returned from the card to the mood screen.
- No JCI `Could not produce class with ID 115`, `FATAL EXCEPTION`, or `ANR in`
  entries were present. Remaining `gralloc5`/WindowManager lines are Pixel
  system noise, not JCI process failures.
- Network remained disconnected during launch; no network behavior was
  observed.

## Provider state and next action

- Workflow `33803033023` rebuilt the signed code-7 AAB from `main` commit
  `38df869113115a54fa5f3f971efef159ddd217e1`; its source/version/signing
  checks and the signed artifact publication all succeeded. The final upload to
  Play Internal Testing failed with the exact Google Play API response:
  `The caller does not have permission`. The existing
  `PEACEPAD_PLAY_SERVICE_ACCOUNT_JSON` credential is valid but is not assigned
  to this JCI Play Console app. Do not rebuild: grant that service account
  release access for `com.ftcholding.justcheckingin` in Play Console, then
  rerun only workflow `jci-android-device-build.yml` with `mode=play-internal`.
  The retained cloud artifact is
  `jci-android-play-38df869113115a54fa5f3f971efef159ddd217e1` (run artifact
  id `9912258560`).
- The previous Play internal-test draft contains the earlier **bad** AAB and
  must be removed/replaced before any save or submission. Do not submit that
  draft. The corrected AAB above is ready for upload.
- Play rejection was for the old privacy URL identity mismatch and old Data
  Safety declaration. The public policy URL is now
  `https://just-checking-in-game.pages.dev/` (HTTP 200, names JCI and Fejiro
  Technology Consultancy Inc., and states offline/no collection). Current
  Data Safety preview is “no data collected” / “no data shared”; verify it
  again against the final artifact before submitting.
- iOS workflow `33723296767` failed before export on commit `0b5b969...` due
  the Mac compiler not finding `AndroidExternalToolsSettings`; that run is
  invalid for this release. Workflow `33727325337` succeeded from
  `644078e42`: Unity export, Xcode archive, IPA validation, and App Store
  Connect upload all completed (Delivery UUID
  `e5404466-5989-4750-a0ba-04174c5f8767`). App Store Connect read-only check
  `33728925841` confirmed build 6 `VALID` in App Store Connect. Preparation
  workflow `33728986205` created version `1.2.0`, attached build 6, and set
  the truthful en-US metadata; version ID is
  `930d1e47-8373-4877-b73a-649881b470ec`. The version is prepared but has
  not been submitted for review.
- Upload, review submission, TestFlight processing, and public release are
  separate states. No public Android release is claimed by this handover.

## Release verdict at handover

- Android: **candidate verified locally; Play resubmission pending**.
- iOS: **build 6 uploaded successfully; processing/TestFlight and review
  actions pending; existing public 1.1.0 remains unchanged**.

## 2026-09-03 release continuation

- Play Console owner access was used to add the existing deployment service
  account `play-store-deploy@saywetin-ba452.iam.gserviceaccount.com` to
  `com.ftcholding.justcheckingin`. The app-level record shows the release,
  testing-track, store-presence, policy, and required read permissions.
- Workflow `33810091023` then built the signed Android code-7 AAB from main
  commit `305fda646345ce260b6f9734d5a5f39d6fa6b344`, uploaded its retained
  artifact `jci-android-play-305fda646345ce260b6f9734d5a5f39d6fa6b344`
  (artifact id `9914888924`), and reached Google Play. Its AAB SHA-256 is
  `e63da5464b8a4c9d98ba7858e6e31baf21d3b03813588909bd76c348c0a85f16`.
  Google accepted the artifact upload but rejected the edit commit because the
  Play account requires changes to be submitted for review from the Console:
  `Changes cannot be sent for review automatically. Please set the query
  parameter changesNotSentForReview to true.`
- The `play-internal` workflow now sets `changesNotSentForReview: true`. Its
  next run will commit the code-7 internal-track edit without pretending to
  submit it. The owner must then review the truthful policy/data-safety changes
  and use Play Console to send the committed change for review; do not claim a
  public Android release until Google accepts and the production rollout is
  completed.
- iOS workflow `33805046268` submitted App Store version `1.2.0` / build `6`
  with automatic release enabled. Submission
  `9e418a46-3e57-4a06-8f67-e4815b9d4dc6` is `WAITING_FOR_REVIEW`. It is not
  public until Apple approves and releases it.

### Current verdict

- Android: **DO NOT APPROVE AS PUBLIC** -- corrected code-7 AAB is built and
  verified; commit the internal edit after this workflow fix, then submit the
  Play Console change for Google review and promote only after approval.
- iOS: **WAITING FOR APPLE REVIEW** -- automatic release is configured; public
  verification remains pending Apple approval.
