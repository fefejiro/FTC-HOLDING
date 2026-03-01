# PeacePad Android Release Guide

## Target Build
- Package id: `ca.peacepad.family`
- Web assets dir: `dist/public`
- Deep link callback route: `https://peacepad.ca/auth/mobile-callback`
- App Links hosts: `peacepad.ca`, `www.peacepad.ca`

## Required Commands (Exact Order)
Run from `C:\FTC HOLDING\APPS\peacepad`:

```powershell
npm install
npm run build
npx cap sync android
Set-Location "C:\FTC HOLDING\APPS\peacepad\android"
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

## Release Signing Inputs
Release signing supports either `android/keystore.properties` or env vars:

- `ANDROID_RELEASE_STORE_FILE`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD`

Debug signing fallback uses standard debug keystore defaults (`~/.android/debug.keystore`).

Never commit keystore files or passwords.

## AAB Output
After `bundleRelease`, AAB is at:

- `C:\FTC HOLDING\APPS\peacepad\android\app\build\outputs\bundle\release\app-release.aab`

## ADB Deep Link Test
Use this to validate App Link handling on device/emulator:

```powershell
adb shell am start -a android.intent.action.VIEW -d "https://peacepad.ca/auth/mobile-callback"
```

Optional host variant:

```powershell
adb shell am start -a android.intent.action.VIEW -d "https://www.peacepad.ca/auth/mobile-callback"
```

## Play Store Submission Checklist
1. Bump `versionCode` and `versionName` in `APPS/peacepad/android/app/build.gradle`.
2. Build signed release AAB (`bundleRelease`) with signing inputs present.
3. Verify guest login still works in debug and release test install.
4. Verify Google OIDC callback lands on `/auth/mobile-callback`.
5. Upload screenshots for phone (and tablet if targeting tablet listings).
6. Confirm privacy policy URL is set in Play Console: `REPLACE_WITH_PRIVACY_POLICY_URL`.
7. Upload AAB to `Internal testing` first, then promote after validation.
