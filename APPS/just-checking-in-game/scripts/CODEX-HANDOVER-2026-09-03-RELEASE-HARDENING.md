# Just Checking In — 2026-09-03 release hardening handover

## Source of record

- Worktree: `D:\FTC-GAMES\worktrees\jci-ios-1.1-main2`
- Branch: `codex/jci-ios-1.1-main2`
- Release-fix commit: `644078e42` (pushed to `origin/codex/jci-ios-1.1-main2`)
- Unity: `6000.4.5f1`
- Product package/bundle: `com.ftcholding.justcheckingin` / `com.ftcholding.justcheckingin`
- Marketing version: `1.2.0`
- Android version code: `6`; iOS build number: `6`

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

- EditMode: `D:\FTC-GAMES\jci-test-editmode-20260903-inputfix.xml` — 10/10
  passed, 0 failed.
- PlayMode: `D:\FTC-GAMES\jci-test-playmode-20260903-inputfix.xml` — 7/7
  passed, 0 failed.
- Both suites ran in normal Unity Package Manager mode; `-noUpm` was not used.

## Android candidate evidence

The APK and AAB were built from the same working-tree contents as commit
`644078e42` using the verified keystore and Unity 6000.4.5f1. The APK was
installed on the connected Google Pixel 7 (`2B260DLH2000C8`).

- Device APK:
  `D:\FTC-HOLDING-releases\just-checking-in\android-20260903\JustCheckingIn-device-inputfix.apk`
  - size: 33,503,158 bytes
  - SHA-256: `64C044CFEA8B0C5F580F931B3C0F032794DC595CD399FAC44995A85D475D7DA3`
- Play AAB:
  `D:\FTC-HOLDING-releases\just-checking-in\android-20260903\JustCheckingIn-1.2.0-code6-play-inputfix.aab`
  - size: 33,412,625 bytes
  - SHA-256: `186606E1743C593C3FA4F10A70B01E69E478C885128A570442422AA83C0E7F66`
- Package/version from APK and AAB manifest: `com.ftcholding.justcheckingin`;
  `versionName 1.2.0`; `versionCode 6`; min SDK 25; target/compile SDK 36;
  launcher `com.unity3d.player.UnityPlayerGameActivity`.
- Signing certificate SHA-256:
  `3f57ea45405524c9cf9a38ce0774e7dc56b80cf3481696adc04577b77c6825b3`.
  APK v2 verification passed; AAB `jarsigner -verify` passed (the local
  upload keystore is self-signed, as expected for this Play upload key).
- AAB manifest was inspected with bundletool 1.17.2. It includes only the
  Unity-generated INTERNET/VIBRATE and dynamic receiver permissions; no
  microphone, camera, location, recording, or tracking permission is present.

### Pixel 7 smoke result

- Install: `adb install -r` returned `Success`.
- Fresh launch after `pm clear`: process remained alive (`pidof` returned a
  live PID), package reports version code 6/name 1.2.0.
- Screenshot: `D:\FTC-HOLDING-releases\just-checking-in\android-20260903\pixel7-inputfix.png`.
- Full log: `D:\FTC-HOLDING-releases\just-checking-in\android-20260903\pixel7-inputfix-logcat.txt`.
- No JCI `Could not produce class with ID 115`, `FATAL EXCEPTION`, or `ANR in`
  entries were present. Remaining `gralloc5`/WindowManager lines are Pixel
  system noise, not JCI process failures.
- Network remained disconnected during launch; no network behavior was
  observed.

## Provider state and next action

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
