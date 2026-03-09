# SayWetin Play Store Guide

Canonical release references:
- `DOCS/SAYWETIN_RELEASE_POLICY.md`
- `DOCS/SAYWETIN_ANDROID_RELEASE.md`

## Quick Start (Same Pattern as PeacePad)

From `APPS/saywetin`:

```powershell
npm ci
npm run build
npx cap sync android
Set-Location .\android
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

## AAB Path

- `APPS/saywetin/android/app/build/outputs/bundle/release/app-release.aab`

## Before Upload

1. Increment `versionCode` and `versionName` in `android/app/build.gradle`.
2. Ensure `android/keystore.properties` exists and is valid.
3. Validate live listen flow against production (`saywetin.app`) on a real device.
4. Upload to Google Play Console Internal testing first.
