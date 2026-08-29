# Just Checking In release closeout

Date: 2026-08-26  
Owner account: Fejiro Play organization, developer account `9098950441049789979`  
Canonical source branch: `codex/jci-ios-1.1-main2`  
Canonical source commit: `3f9cd7b23` (layout fix and Android device-build entry point)

## Store status (verified live)

### Apple App Store

- App: Just Checking In Game, App Store ID `6799443182`.
- Public baseline `1.0.0` remains **Ready for Distribution**.
- New version `1.1.0` with build `4` is **Waiting for Review**.
- Uploaded build `4` is shown as version `1.1.0`; processing state was valid.
- Release selection is **Automatically release this version after App Review**.
- Phased release is not selected; update is configured for immediate availability after approval.
- This is not public yet. Public URL to verify after approval:
  `https://apps.apple.com/us/app/just-checking-in-game/id6799443182`

### Google Play

- Developer account: Fejiro organization, ID `9098950441049789979`.
- Play app ID: `4974165497912861650`.
- Package: `com.ftcholding.justcheckingin`.
- Current dashboard state: app **Draft**, update status **In review**.
- No public Play listing URL was verified; do not call this release live.
- Submission was sent after the owner-selected Data Safety **No** answer and an explicit acknowledgment of Google's warning.
- Google retained the warning: **Device or other IDs not declared**. The release may still be rejected.

## Artifact and source-integrity finding

The current Play artifact is not built from the same source state as the iOS 1.1 candidate.

- Android artifact: `D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab`
- Size: `31,755,025` bytes
- SHA-256: `0272C6A1B9FBB4267AB8736FDBF4F6B6A09DB7F7E4689E321E81679879589129`
- Play identifies it as version `0.2.0`, version code `2`, target SDK `36`.
- The external clean project has `bundleVersion: 0.3.0`, only the older presentation script, and does not contain the canonical 1.1 files `JciTogetherSession`, `JciModels`, or `JciLocalStore`.
- Canonical iOS source is version `1.1.0`, build `4`, and includes the 1.1 Self/Together flows, local persistence, summaries, glass UI, motion and reduced-motion support.

Therefore Android is **not the same code** as the iOS 1.1 candidate and must not be approved as a parity release. A corrected Android build from the canonical worktree requires a new signed artifact and a higher Android version code before Play resubmission.

## Privacy and policy evidence

- Canonical game scripts contain no runtime network, analytics, Firebase, advertising, microphone, camera, location, recording, or device-ID calls.
- Unity Analytics and Unity Ads are disabled in `ProjectSettings/UnityConnectSettings.asset`.
- The uploaded AAB manifest contains `INTERNET` but no `AD_ID` permission.
- The AAB still contains Unity advertising/Firebase helper references; this is the likely reason Play's static checks flagged Device or other IDs. Treat this as a scanner finding, not proof of runtime transmission.
- Data Safety **No** is saved, but Google warned that the declaration may be inaccurate for the uploaded bundle.

## QA evidence boundary

- Canonical source includes EditMode coverage in `unity/Assets/_Game/Tests/EditMode` and PlayMode coverage in `unity/Assets/_Game/Tests/PlayMode` for domain transitions, local persistence, relaunch and reduced-motion behavior.
- No fresh Unity test run or physical-device end-to-end run was recorded during this closeout. Do not represent those checks as newly passed until they are run against the exact artifact intended for each store.

## Notifications reviewed

- “Add Play Games Services/Sidekick” is optional and was not enabled.
- The Google Play Games on PC form factor is currently opted in; opting out would publish an immediate availability change and was not performed.
- Android developer verification due 2026-09-30 is an account-owner task.
- The memory/device-migration quality notice is informational; no JCI-specific action was shown.

## Repository and PR closeout

- Worktree is clean at the canonical commit above.
- JCI PRs #298, #299, #300, #301 and #302 are merged and closed.
- No open JCI PR was found in `fefejiro/FTC-HOLDING`.
- No PeacePad or unrelated project changes were made as part of this closeout.

## Reusable update workflow

1. Start from the canonical JCI worktree, never the older external clean project.
2. Run the Unity EditMode and PlayMode suites and record results.
3. Verify marketing version, platform version code/build, bundle/package IDs, signing identity and artifact hash.
4. Run the existing iOS wrapper from `scripts/publish-ios-testflight.sh` after LF normalization and Mac/Xcode preflight.
5. Upload the Android artifact only after confirming its source hash matches the canonical commit and its Play declarations match runtime behavior.
6. Treat upload, review, approval and public availability as separate states; record each portal status and URL.
7. Ask for owner confirmation at any new policy attestation and immediately before final production submission.

## Approval recommendation

- **IOS: DO NOT APPROVE YET** — build 4 is Waiting for Review; public release is not verified.
- **ANDROID: DO NOT APPROVE** — Play is in review with the older, non-parity artifact and an acknowledged Data Safety warning.

## Handoff closure

- Both stores are now pending platform approval; no further portal action is planned in this workstream.
- The next-release architecture and effort estimate are saved in `NEXT-GAME-RELEASE-PLAN.md`.
- Resume JCI only if Apple or Google reports a concrete review issue, or when public availability can be verified.

## Android clean-build / Pixel 7 follow-up (2026-08-28)

- Canonical repository remains clean at commit `58363d937973c4a013fd5c2ff1e1e73691d95796`.
- A clean Unity 6000.4.5f1 build was attempted from an isolated D:-backed copy. The first copy was truncated during package transfer; a second attempt reached Unity package compilation but failed on generated Bee/API-updater metadata before producing an AAB.
- The existing rejected AAB was converted with bundletool and installed on Pixel 7 (`2B260DLH2000C8`) only for a device-launch check. Installed metadata: package `com.ftcholding.justcheckingin`, version `0.2.0`, version code `2`, target SDK `36`, Unity `6000.4.5f1`.
- The old artifact launches without an Android crash, but the rendered screen remains blank dark and therefore fails visual smoke. It must not be used as the 1.1 replacement or submitted to Play.
- Evidence: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\pixel7-jci-old-after10s.png` and `jci-stale-library-canonical3-20260828.log`.
- Temporary source overlays were restored from `stale-source-backup-20260828`; no canonical gameplay files, PeacePad files, or store records were changed.
- The next iteration must first establish a repeatable clean Unity package/Bee cache (preferably on the existing CI/Windows build host), then build and install the canonical 1.1 Android artifact before any Play resubmission.

### Pixel 7 install readiness check (2026-08-28)

- A second canonical Android build attempt was run with Unity 6000.4.5f1 after the repaired script/package cache compiled successfully.
- Unity reached `BuildPlayer: start building target 13`, then stalled in the Android `Player` Bee backend without producing a new AAB. The exact logs are `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-final-canonical-android-20260828.log` and `jci-final-canonical-android-20260828-retry.log`.
- The attempt was terminated after the packaging stage made no progress; the prior 0.2.0/code-2 AAB remains the only artifact and was not relabeled or treated as 1.1.
- The stale project source was restored byte-for-byte from `stale-source-backup-20260828`. The canonical worktree remains clean; no Pixel install of canonical 1.1.0/code 3 is claimed.

### TestFlight layout feedback fix (2026-08-28)

- The iOS TestFlight screenshot exposed a shared Unity layout defect: `Glass Surface` and `Body` were created with bottom-left anchors, then given edge offsets, collapsing the content width on mobile.
- The canonical source now stretches both panels before applying safe-area offsets. Runtime labels also normalize the existing UTF-8 mojibake separators to readable `·` and `—` characters.
- Added a PlayMode regression assertion that the runtime body width is greater than 100 points. Unity script compilation passed with this change.
- Android packaging still stops in the Unity Player Bee backend before AAB generation; no Android upload or Pixel install of this fix is claimed.

### Layout-fix Android rebuild attempt (2026-08-28)

- Canonical commit containing the shared layout fix, label normalization, signed device-APK entry point, and Editor-only PlayMode test assembly is `3f9cd7b23`.
- The source-side fix compiles successfully. The signed device build was retried with Unity `6000.4.5f1` using `Jci.Editor.BuildScript.BuildAndroidApkForDevice` and the existing JCI upload keystore.
- Unity completed package registration and script compilation, then hung in `bee_backend.exe` while compiling `ScriptAssemblies`; no corrected APK or AAB was produced. Evidence: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-android-layoutfix-apk5-20260828.log`.
- The temporary source overlay was restored byte-for-byte from `stale-source-backup-20260828`. Pixel 7 still has only the old `0.2.0` / code `2` install; no corrected Android install or Play submission is claimed.

### Fresh D:-backed build-host recovery (2026-08-28)

- A disposable copy at `D:\FTC-GAMES\jci-j1.1-device-build-20260828` was created from the canonical Unity project without a `Library` cache.
- Unity `6000.4.5f1` initialized and reached `Application.AssetDatabase Initial Refresh`, but package import did not complete in the available run. Seeding the disposable copy from the old cache also stalled while copying Unity package data, so no APK was generated.
- This confirms the remaining blocker is the local Unity/package/Bee build environment, not the layout-fix source. Use a healthy CI/Windows Unity runner with a warm package cache for the next build; do not resubmit the old code-2 AAB.

### Package-cache junction recovery (2026-08-28)

- The disposable project was given a junction to the known-good local Unity `PackageCache`, avoiding the blocked package-download and full-cache-copy paths.
- This run completed Unity package registration, C# compilation, package import, shader processing, and entered the Android Player build.
- It then stalled in the Player Bee backend after Burst `bcl.exe` reported `Starting 1 library requests` and `Done`; no Gradle root project or APK was emitted. Evidence: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-fresh-junction-apk-20260828.log`.
- Pixel 7 remains on version `0.2.0` / code `2`. The old build was not reinstalled or presented as the corrected source.

### Disposable Mono device-build check (2026-08-28)

- To isolate IL2CPP/Bee from device smoke testing, the disposable copy was temporarily switched to Unity's Mono Android backend; the canonical source and release settings were not changed.
- Unity failed before player generation with `UnityException: Target architecture not specified` during Android SDK target resolution. Evidence: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-device-mono-20260828.log`.
- No APK was produced. The Pixel remains on the old rejected build, and the temporary backend change was not copied back to the canonical worktree.

### IL2CPP no-Burst retry (2026-08-28)

- Unity SDK/NDK/JDK paths were verified as present and registered (`Android SDK`, NDK `27.2.12479018`, JDK `17.0.17.10`).
- A disposable IL2CPP build was retried with Burst compilation disabled. Unity completed package import and shader processing, then stalled again in the Android Player Bee backend; no APK was produced. Evidence: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-device-noburst-20260828.log`.
- This rules out missing Android modules and leaves the local Unity 6000.4.5f1 Player/Bee environment as the blocker. The next build should run on a separate healthy Windows CI runner.

### GitHub Actions Android runner follow-up (2026-08-29)

- A scoped workflow was added at `.github/workflows/jci-android-device-build.yml` and dispatched against the canonical branch `codex/jci-ios-1.1-main2`.
- The existing JCI upload keystore was configured as repository secrets using the previously verified local keystore (`jci-upload`, SHA-256 certificate fingerprint `3F:57:EA:45:40:55:24:C9:CF:9A:38:CE:07:74:E7:DC:56:B8:0C:F3:48:16:96:AD:C0:45:77:B7:7C:68:25:B3`). Secret values are not recorded here.
- Run `33223912125` reached Unity but failed because GameCI does not expose custom `KEYSTORE_*` variables inside its container. The workflow was corrected to use GameCI's Android keystore inputs.
- Run `33224327228` reached Unity and failed on a source-side namespace collision in the path resolver; this was corrected in commit `c8a9d11e5`.
- Run `33224622941` then stalled in Unity's Android Player/Bee stage without producing an APK and was cancelled after 8m56s.
- Run `33225064251` repeated the build with `-burst-disable-compilation`; it again stalled in the Android Player/Bee stage and was cancelled after no artifact progress.
- No corrected APK/AAB was emitted by any runner. Pixel 7 therefore remains on the old `0.2.0` / version-code-2 install; no corrected Android install or Play submission is claimed.
- The canonical source changes for GameCI signing fallback are committed on `codex/jci-ios-1.1-main2`; the remaining blocker is Unity 6000.4.5f1 Player/Bee packaging on both the local and GitHub Linux runners. A real Windows Unity 6000.4.5f1 runner or a Unity-version/toolchain change is required before device installation.

### Stale Hub entry and D:-backed retry (2026-08-29)

- Unity Hub was confirmed to show a stale `C:\FTC HOLDING\APPS\just-checking-in\just-checking-in-game` entry marked “Project not found”. The canonical source remains `D:\FTC-GAMES\worktrees\jci-ios-1.1-main2\APPS\just-checking-in-game\unity` at Unity `6000.4.5f1`; no source files were changed by the Hub registration.
- A disposable project copy was created at `D:\FTC-GAMES\jci-jci-build-scratch-20260829` from the canonical source. Unity package registration and C# compilation completed, but the editor hung at `Application.AssetDatabase Initial Refresh` before invoking the build. A second run using the known-good `PackageCache` and a copied `Library` reproduced the same stall; no APK was produced.
- The exact local logs are `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-local-scratch-20260829.log` and `jci-local-cachecopy-20260829.log`. The temporary cache backup was removed from the worktree after the attempt; the canonical worktree is clean.
- Pixel 7 (`2B260DLH2000C8`) still has only package `com.ftcholding.justcheckingin` version `0.2.0`, version code `2`, target SDK `36`. No corrected 1.1 install or Play submission is claimed.
- The stale Unity Hub C: project entry was repaired with a directory junction at `C:\FTC HOLDING\APPS\just-checking-in-game\just-checking-in-game` targeting the canonical D: project. This preserves one source of truth; no new Unity project was created.
- A correctly quoted Unity invocation through that repaired Hub path read the canonical project and Unity version, then reproduced the `Application.AssetDatabase Initial Refresh Start` stall. The process was stopped after no build output; no APK was generated.
