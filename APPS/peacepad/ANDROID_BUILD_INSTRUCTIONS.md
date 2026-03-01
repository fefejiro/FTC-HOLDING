# PeacePad Android Build Instructions

## Current Version
- **Version Code**: 8
- **Version Name**: 1.0.7
- **Package**: ca.peacepad.app

## Pre-configured Files
All signing configuration is already set up in the project:
- `android/keystore.properties` - Contains keystore credentials
- `android/peacepad-release.keystore` - The signing keystore file
- `android/app/build.gradle` - Reads from keystore.properties automatically

## Build Steps

### Step 1: Download and Extract
1. Download the ZIP from Replit
2. Extract to a folder, e.g., `C:\Users\mikef\PeacePadAIFA\PeacePadAI`

### Step 2: Open Command Prompt
```cmd
cd C:\Users\mikef\PeacePadAIFA\PeacePadAI\android
```

### Step 3: Clean Previous Build (Optional but Recommended)
```cmd
gradlew clean
```

### Step 4: Build the AAB Bundle
```cmd
gradlew bundleRelease --no-daemon
```

### Step 5: Fix "Could not resolve project" Errors
If you see errors about `:capacitor-android` or other plugins, try this:
1. Delete the `.gradle` folder in the `android` directory
2. Run this command:
```cmd
gradlew clean bundleRelease --refresh-dependencies --no-daemon
```

### Step 6: Find Your AAB
After successful build, the AAB file is located at:
```
C:\Users\mikef\PeacePadAIFA\PeacePadAI\android\app\build\outputs\bundle\release\app-release.aab
```

## Keystore Details (DO NOT SHARE)
- **File**: `peacepad-release.keystore`
- **Alias**: `peacepad`
- **Password**: `Efiuvwere,1234`

## Troubleshooting

### "keystore password was incorrect"
The keystore.properties file may have wrong values. Verify:
```cmd
type android\keystore.properties
```
Should show:
```
storeFile=peacepad-release.keystore
storePassword=Efiuvwere,1234
keyAlias=peacepad
keyPassword=Efiuvwere,1234
```

### "Could not find peacepad-release.keystore"
The keystore must be in the `android` folder:
```cmd
dir android\peacepad-release.keystore
```
If missing, copy from root:
```cmd
copy peacepad-release.keystore android\peacepad-release.keystore
```

### Build cache issues
If you get strange errors, clean everything:
```cmd
cd android
gradlew clean
rmdir /s /q .gradle
rmdir /s /q app\build
gradlew bundleRelease
```

## Version Updates
To update the version for a new release, edit `android/app/build.gradle`:
```gradle
versionCode 9          // Increment this for each Play Store upload
versionName "1.0.8"    // Human-readable version
```
