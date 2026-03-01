# PeacePad Android Build Guide

Complete step-by-step instructions for building and uploading PeacePad to Google Play Store Internal Testing.

## Prerequisites

### On Your Local Machine
1. **Java JDK 17** (required for Android Gradle Plugin 8.2.2)
   ```bash
   # macOS with Homebrew
   brew install openjdk@17
   
   # Ubuntu/Debian
   sudo apt install openjdk-17-jdk
   
   # Verify installation
   java -version  # Should show version 17.x
   ```

2. **Android SDK** (command-line tools only, no Android Studio required)
   ```bash
   # Set ANDROID_HOME
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/build-tools/35.0.0
   
   # Accept licenses
   sdkmanager --licenses
   
   # Install required components
   sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
   ```

3. **Git** (to pull latest changes)

---

## Step 1: Pull Latest Code

```bash
# Navigate to your PeacePad directory
cd /path/to/PeacePad

# Pull latest changes (includes ProGuard fixes)
git pull origin main
```

---

## Step 2: Verify Configuration

Check these files have correct values:

### android/app/build.gradle
```gradle
defaultConfig {
    applicationId "ca.peacepad.app"
    versionCode 3          # Must be higher than last upload
    versionName "1.0.2"
    ...
}
```

### android/app/google-services.json
Verify package_name matches:
```json
"android_client_info": {
    "package_name": "ca.peacepad.app"  # Must match applicationId
}
```

---

## Step 3: Set Up Signing (First Time Only)

### Create Keystore (if you don't have one)
```bash
keytool -genkey -v -keystore peacepad-release.keystore \
  -alias peacepad -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=PeacePad, OU=Mobile, O=PeacePad, L=Toronto, ST=Ontario, C=CA"
```

### Create keystore.properties in android/
```properties
storeFile=/absolute/path/to/peacepad-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=peacepad
keyPassword=YOUR_KEY_PASSWORD
```

**IMPORTANT**: Never commit keystore.properties or .keystore files to git!

---

## Step 4: Build Release AAB

```bash
# Navigate to android folder
cd android

# Clean previous builds
./gradlew clean

# Build release AAB (App Bundle for Play Store)
./gradlew bundleRelease

# Build APK if needed for direct testing
./gradlew assembleRelease
```

### Build Output Locations
- **AAB (for Play Store)**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK (for direct install)**: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 5: Verify the Build

```bash
# Check AAB was created
ls -la android/app/build/outputs/bundle/release/

# Expected output:
# app-release.aab (should be 15-25 MB)
```

---

## Step 6: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select **PeacePad** app with package `ca.peacepad.app`
3. Go to **Testing > Internal testing**
4. Click **Create new release**
5. Upload the `app-release.aab` file
6. Add release notes (e.g., "Bug fixes and stability improvements")
7. Click **Review release** then **Start rollout**

---

## Troubleshooting

### Build Fails: "Could not find keystore"
```bash
# Verify keystore.properties exists and paths are absolute
cat android/keystore.properties

# Verify keystore file exists
ls -la /path/to/peacepad-release.keystore
```

### Build Fails: "SDK not found"
```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk

# Or create local.properties in android/
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

### Build Fails: "Java version mismatch"
```bash
# Use Java 17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk     # Linux

# Verify
java -version
```

### App Crashes on Launch
1. Check logcat for the exact error:
   ```bash
   adb logcat | grep -i "peacepad\|capacitor\|fatal"
   ```

2. Common causes:
   - Missing google-services.json
   - Package name mismatch between code and google-services.json
   - Missing ProGuard rules (already fixed in this version)

### Play Store Rejects Upload

**"Version code already used"**
- Increment versionCode in `android/app/build.gradle`

**"Target SDK too low"**
- Already set to 35 (Android 15) which is current

**"APK signature not valid"**
- Verify keystore.properties paths are correct
- Ensure same keystore is used as previous uploads

---

## Quick Reference

| Item | Value |
|------|-------|
| Package Name | `ca.peacepad.app` |
| Version Code | 3 |
| Version Name | 1.0.2 |
| Min SDK | 23 (Android 6.0) |
| Target SDK | 35 (Android 15) |
| Gradle | 8.2 |
| Android Gradle Plugin | 8.2.2 |

---

## Version History

| Version | Code | Changes |
|---------|------|---------|
| 1.0.2 | 3 | ProGuard rules fix, inclusive branding |
| 1.0.1 | 2 | Initial internal testing |
| 1.0.0 | 1 | First build |
