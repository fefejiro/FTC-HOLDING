# SayWetin Android Release Guide

## Target Build

- Package id: `com.saywetin.app`
- Web assets dir: `dist/public`
- Hosted app URL: `https://saywetin.app`
- App Links host (if enabled later): `saywetin.app`

## Required Commands (Exact Order)

Run from `C:\FTC HOLDING\FTC-HOLDING\APPS\saywetin`:

```powershell
npm ci
npm run build
npx cap sync android
Set-Location "C:\FTC HOLDING\FTC-HOLDING\APPS\saywetin\android"
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

## Release Signing Inputs

Release signing uses `APPS/saywetin/android/keystore.properties` (not committed).

Use `APPS/saywetin/android/keystore.properties.template` as reference:

- `storeFile`
- `storePassword`
- `keyAlias`
- `keyPassword`

Never commit keystore files or passwords.

## AAB Output

After `bundleRelease`, AAB is at:

- `C:\FTC HOLDING\FTC-HOLDING\APPS\saywetin\android\app\build\outputs\bundle\release\app-release.aab`

## Play Store Submission Checklist

1. Bump `versionCode` and `versionName` in `APPS/saywetin/android/app/build.gradle`.
2. Build signed release AAB (`bundleRelease`) with signing inputs present.
3. Verify app launch and microphone permissions on device.
4. Verify live listen flow on device:
   - Record/upload short clip
   - Confirm `/api/listen` returns recognized track or structured recognition error
   - Confirm lyrics/cultural analysis render for recognized songs
5. Upload AAB to Play Console `Internal testing` first.
6. Promote to closed/production only after validation.
