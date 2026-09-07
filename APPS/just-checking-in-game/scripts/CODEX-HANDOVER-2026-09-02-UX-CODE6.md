# Just Checking In — UX/code6 handover (2026-09-02)

## Starting point and source of truth

- Unity source/worktree: `D:\FTC-GAMES\worktrees\jci-ios-1.1-main2`
- Unity project: `APPS/just-checking-in-game/unity`
- Branch: `codex/jci-ios-1.1-main2`
- Implementation commit: `bb48d476b` (`feat(jci): correct card-led mobile experience`)
- Unity editor: `6000.4.5f1`
- The unrelated working-tree edit to `scripts/NEXT-GAME-RELEASE-PLAN.md` was preserved and was not included in the commit.

## What changed

- Replaced the misleading arrival-first flow with a mood-first solo check-in. Mood selection now deterministically filters an offline card deck and keeps the user in the card loop.
- Added `Draw another card`, `Skip this one`, and `End check-in` actions plus a local session snapshot for safe relaunch/recovery.
- Added a human together flow: connection name/nickname, `Your turn`, pass-phone handoff, named partner turn, skip/next/end controls, and a shared summary.
- Added physical-card presentation with equal card sizing, larger touch targets, card reveal/slide motion, haptics, safe-area layout, and system Back handling.
- Added the branded sunrise/waves icon, transparent header logo, and DM Sans font assets. The in-app privacy note remains local-only and no microphone, camera, location, recording, tracking, or network behavior was added.
- Raised the candidate to marketing version `1.2.0`, Android version code `6`, and iOS build `6`; iOS scripts were normalized to LF and now assert build 6.
- Removed the obsolete Input System assembly reference; UGUI remains enabled through `UnityEngine.UI`.

## Android candidate evidence

- APK: [JustCheckingIn-1.2.0-code6-ux-corrected.apk](D:/FTC-HOLDING-releases/just-checking-in/android-2026-09-02/JustCheckingIn-1.2.0-code6-ux-corrected.apk)
- Size: `28,833,369` bytes
- SHA-256: `7A41F2801D3ECDFAA3EC1F14C903A40F8573D3945025BEF406ADBFE506FC5820`
- Package: `com.ftcholding.justcheckingin`
- Version: `1.2.0` / version code `6`
- SDK: min `25`, target/compile `36`
- Signing: v2 verified; certificate SHA-256 `3f57ea45405524c9cf9a38ce0774e7dc56b80cf3481696adc04577b77c6825b3`
- Build log: `D:\FTC-HOLDING-releases\just-checking-in\ux-audit-2026-09-02\jci-android-apk-code6-clean.log`
- Build result: Unity Android device build completed with `Result: Success`; the build used SDK `D:\Android\Sdk`, NDK `27.1.12479018`, and JDK 17.

## Device verification

The exact SHA-256 APK above installed successfully with `adb install -r` on the USB Pixel 7 (`2B260DLH2000C8`, Android 17). Package inspection reported version code 6, version 1.2.0, target SDK 36, and an upgrade-preserved install timestamp.

Evidence screenshots are in `D:\FTC-HOLDING-releases\just-checking-in\android-2026-09-02`:

- `pixel7-fresh-home-code6.png`
- `pixel7-solo-mood-code6.png`
- `pixel7-solo-card-code6.png`
- `pixel7-solo-card2-code6.png`
- `pixel7-solo-after-skip-code6.png`
- `pixel7-solo-summary-code6.png`
- `pixel7-together-picker-code6.png`
- `pixel7-together-name-code6.png`
- `pixel7-together-turn1-code6.png`
- `pixel7-together-turn2-code6.png`
- `pixel7-together-maya-code6.png`
- `pixel7-together-summary-code6.png`
- `pixel7-system-back-home-code6.png`
- `pixel7-notification-shade-code6.png`

Observed passes: fresh install/launch, branded home, solo mood → card → draw/skip → end summary, together name → both named turns → summary, system Back returning home, and notification shade opening normally. Filtered logcat contained no app fatal/Unity crash match.

## Automated validation boundary

- EditMode/PlayMode test assemblies compiled successfully in the warm Unity 6000.4.5f1 project after the asmdef and namespace fixes.
- Unity batch `-runTests` exited `0` on this host but did not emit a test-results XML file. Therefore this handover records compilation and physical-device runtime evidence, not a claim that every automated test method executed.

## Store/release boundary

- This is an installable Android QA APK. No AAB was produced or uploaded in this slice, so Play production approval is **not** claimed.
- The iOS publish wrapper is prepared for version `1.2.0`/build `6` and LF-normalized, but no Mac/Xcode session or Apple credential-backed upload was run here. No new TestFlight build or public iOS release is claimed.
- Existing public/store records remain unchanged by this commit. Next release action is to build the AAB from this exact commit, run Play internal testing, and use the Mac wrapper for the matching iOS build only when the host and credentials are available.

## Approval recommendation

- Android: **DO NOT APPROVE for Play production yet**; approve only for internal Pixel QA based on the signed APK evidence above.
- iOS: **DO NOT APPROVE for public release yet**; build 6 still needs Mac archive/upload, TestFlight validation, review, and public verification.
