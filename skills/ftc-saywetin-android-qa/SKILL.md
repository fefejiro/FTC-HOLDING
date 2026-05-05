---
name: ftc-saywetin-android-qa
description: Use when running real-device Android QA for SayWetin, especially startup crash investigation, repeated launch loops, logcat triage, Expo/EAS build validation, lyric timing UX checks, and GO/HOLD/NO-GO release gating.
---

# FTC SayWetin Android QA

Use this skill when SayWetin needs proof, not vibes. The point is to reproduce the real device behavior, isolate the first failing signal, and only then patch narrowly.

## Inputs

- App folder: `APPS/saywetin-native`
- Companion script or QA doc, if present
- Connected device ID or emulator target
- Current app version and versionCode target
- Known risky flow:
  - startup
  - listen orb
  - recognition
  - result screen
  - live lyrics
  - meaning sheet
  - listen again reset
- Required backend/API base URL path, if under test

## Canonical Docs

- `DOCS/COPILOT_CURRENT_HANDOVER_2026-05-01.md`
- `APPS/saywetin/ops/SAYWETIN_ANDROID_E2E_QA_SCRIPT.md`
- `APPS/saywetin-native/ops/android-test-loop.cjs`

## Workflow

1. Confirm scope and repo state:
   - repo root
   - `git status --short`
   - exact files already dirty
   - device connected via `adb devices`
2. Confirm build identity:
   - `app.json` version and android versionCode
   - installed app version on device
   - whether test target is Play build, local debug build, or Expo dev client
3. Reproduce the smallest failing path first:
   - cold launch loop for startup crash
   - one scripted manual scenario for feature breakage
4. Capture first real failure only:
   - JS exception
   - AndroidRuntime fatal
   - ANR
   - 404 or env/config miss
   - signature/install mismatch
5. Patch the owning code path narrowly.
6. Re-run the same failing path before expanding scope.
7. Run heavier validation only after the first failure is cleared:
   - repeated launch loops
   - monkey stress
   - manual Destiny scenario
8. Report GO/HOLD/NO-GO with exact evidence.

## Standard Commands

### Device presence

```powershell
adb devices
adb shell dumpsys package com.saywetin.app | Select-String "versionName|versionCode|lastUpdateTime"
```

### Local preflight

```powershell
cd "C:\FTC HOLDING\_restore_repo\APPS\saywetin-native"
npm run android:test:preflight
npx tsc --noEmit
```

### Clean launch loop

```powershell
adb logcat -c
$pkg = 'com.saywetin.app'
for($i=1; $i -le 8; $i++){
  adb shell am force-stop $pkg | Out-Null
  adb shell monkey -p $pkg -c android.intent.category.LAUNCHER 1 | Out-Null
}
adb logcat -d | Select-String "FATAL EXCEPTION|AndroidRuntime|Process: com.saywetin.app|TypeError|Unhandled JS Exception"
```

### Stress pass

```powershell
adb logcat -c
adb shell monkey -p com.saywetin.app --throttle 120 -v 300
adb logcat -d | Select-String "FATAL EXCEPTION|Process: com.saywetin.app|ANR in com.saywetin.app|TypeError|Unhandled JS Exception"
```

### Local install path

```powershell
cd "C:\FTC HOLDING\_restore_repo\APPS\saywetin-native\android"
.\gradlew.bat app:installDebug -x lint -x test --offline --configure-on-demand --build-cache -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=arm64-v8a
```

### Dev client runtime

```powershell
cd "C:\FTC HOLDING\_restore_repo\APPS\saywetin-native"
npx expo start --dev-client --clear
```

## Required QA Scenarios

### Startup stability

- app launches repeatedly without fatal JS/native crash
- splash resolves into app UI
- process remains alive after cold launch

### Recognition flow

- listen orb starts recognition
- request reaches backend
- no 404 on recognition path
- failure copy is clear if music is not heard

### Result screen

- result renders without referencing missing track fields
- primary song metadata is visible
- actions render safely
- listen-again returns to clean recognition state

### Live lyrics

- no line-0 flash before target line resolution
- fallback copy shows when exact timing is unavailable
- selected meaning anchors under selected line
- no undefined active-line references

### Release sanity

- installed version matches intended test target
- API base URL resolution is proven
- no fake "production-ready" claim without real device proof

## Common Failure Modes

- Testing the Play-installed build and assuming it matches local source.
- Metro in a monorepo resolving the wrong React tree and causing invalid hook crashes.
- Missing `ANDROID_HOME` or `android/local.properties` blocking local builds.
- Missing `android/app/debug.keystore` blocking debug install.
- Treating noisy system logcat lines as app crashes.
- Declaring success from one launch only.
- Mixing startup-fix work with unrelated release/doc/UI files.

## Evidence Rules

- Always capture the first actual crash signature.
- State whether the failure came from:
  - local debug build
  - Expo dev client
  - Play-installed release build
- If a crash stops reproducing, say how many loops passed.
- Separate code fix proof from release readiness proof.

## Output

- Root cause or best evidence-backed hypothesis
- Files changed
- Commands run
- Crash signature before fix
- Validation counts after fix
- Installed build identity on device
- GO/HOLD/NO-GO
- Next CTO action