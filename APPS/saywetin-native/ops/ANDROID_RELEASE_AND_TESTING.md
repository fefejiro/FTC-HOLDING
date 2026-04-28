# SayWetin Android Release and Testing Governance

## Why This Exists
This project must keep user-facing versions and Android internal build codes predictable.
Google Play updates only install when `versionCode` is strictly higher than what is already installed on a device.

## Current Source of Truth
- `app.json`:
  - `expo.version` is user-visible app version (for example `1.3.1`)
  - `expo.android.versionCode` is Android internal integer (for example `29`)
- `package.json`:
  - `version` must match `app.json -> expo.version`

## Automation Commands
Run from `APPS/saywetin-native`.

### Version governance
- `npm run version:show`
  - Shows current `app.json` and `package.json` versions and sync status.
- `npm run version:sync`
  - Forces `package.json` version to match `app.json` version.
- `npm run version:bump:patch`
  - Bumps `1.3.1 -> 1.3.2` and increments Android `versionCode` by 1.
- `npm run version:bump:minor`
  - Bumps `1.3.1 -> 1.4.0` and increments Android `versionCode` by 1.
- `npm run version:bump:major`
  - Bumps `1.3.1 -> 2.0.0` and increments Android `versionCode` by 1.
- `npm run version:set -- 1.4.2`
  - Sets an exact semver and increments Android `versionCode` by 1.

### Android test loop
- `npm run android:readiness`
  - Deep readiness report: version sync, adb, emulator/sdkmanager presence, and Java HTTPS access for Gradle dependencies.
- `npm run android:test:preflight`
  - Validates version sync and checks for `adb` + connected devices.
- `npm run android:test:run`
  - Runs preflight and launches `expo run:android` if a device/emulator is connected.
- `npm run android:test:expo-go`
  - Immediate UI fallback path that starts Expo in tunnel mode for on-device UI checks without native Gradle build.

### Release shortcuts
- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`

Each release shortcut does two things:
1. bumps release version/versionCode
2. runs Android preflight checks

## Required Release Flow (Always)
1. `npm run release:patch` (or minor/major)
2. `npx expo config --type public --json`
3. Confirm expected values:
   - `version`
   - `android.versionCode`
   - `android.package` (`com.saywetin.app`)
4. Build and submit to Play.

## Device UI Testing Flow
1. Connect device with USB debugging enabled (or start emulator).
2. Run `npm run android:test:preflight`.
3. Run `npm run android:test:run`.
4. Validate core UI surfaces manually on device:
   - Home/listen entry
   - Orb/listen animation and transitions
   - Results screen rendering
   - Navigation transitions and back behavior
   - Error states (no mic permission / no network)
   - Safe area and cutout handling

## Operational Rules
- Never publish with unchanged or lower `versionCode` than any test build previously installed.
- Keep semver meaningful:
  - patch = fixes
  - minor = features
  - major = breaking UX or behavior shifts
- Keep release notes aligned with semver bump.

## Troubleshooting
- If Play update is not visible on phone:
  - Check installed version from Android Settings -> Apps -> SayWetin.
  - Ensure Play track/account eligibility.
  - Ensure Play build `versionCode` is higher than installed build.
- If preflight says no devices:
  - Verify USB debugging and authorization prompt on phone.
  - Run `adb devices` and confirm device state is `device`.
- If Android Studio/Gradle sync fails on dependency/plugin resolution:
  - Run `npm run android:readiness`.
  - If `java https probe` fails: allow Java outbound HTTPS (443) for `java.exe` and `javaw.exe` in firewall/security tooling.
  - Install missing Android SDK components shown in readiness report (Emulator, Command-line Tools).
  - Use `npm run android:test:expo-go` as UI testing fallback while native dependency networking is being fixed.
