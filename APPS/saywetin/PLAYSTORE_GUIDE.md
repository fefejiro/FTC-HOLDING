# SayWetin Play Store Guide

Canonical release references:
- `DOCS/SAYWETIN_RELEASE_POLICY.md`
- `DOCS/SAYWETIN_ANDROID_RELEASE.md`

## Quick Start (Same Pattern as PeacePad)

From `C:\FTC HOLDING\APPS\saywetin`:

```powershell
npm ci
npm run build
Set-Item Env:CAPACITOR_ENV production
npx cap sync android
Set-Location .\android
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

Verify generated native config points to hosted web bundle before building:

```powershell
Get-Content .\app\src\main\assets\capacitor.config.json
```

Expected `server.url`:

```json
"url": "https://saywetin.app"
```

## AAB Path

- `APPS/saywetin/android/app/build/outputs/bundle/release/app-release.aab`

## Before Upload

1. Increment `versionCode` and `versionName` in `android/app/build.gradle`.
2. Ensure `android/keystore.properties` exists and is valid.
3. Validate live listen flow against production (`saywetin.app`) on a real device.
4. Upload to Google Play Console Internal testing first.
