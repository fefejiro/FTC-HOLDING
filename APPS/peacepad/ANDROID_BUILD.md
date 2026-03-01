# PeacePad Android Build Guide for Play Store

This guide explains how to package PeacePad for Google Play Store deployment.

## Overview

PeacePad uses a **hybrid build approach**:
- **Web assets**: Built on Replit (fast, automated)
- **Android packaging**: Completed locally or via CI (requires Android SDK + signing)

## Prerequisites

### On Your Local Machine or CI Environment

1. **Java Development Kit (JDK) 17+**
   ```bash
   java -version
   # Should show version 17 or higher
   ```

2. **Android SDK Command-Line Tools**
   - Download from: https://developer.android.com/studio#command-line-tools-only
   - Extract and configure:
     ```bash
     mkdir -p ~/android-sdk/cmdline-tools
     cd ~/android-sdk/cmdline-tools
     # Extract downloaded zip to 'latest' subdirectory
     ```

3. **Gradle 8+** (usually bundled with project via `./gradlew`)
   ```bash
   gradle -v
   ```

4. **Environment Variables** (add to `~/.bashrc` or `~/.zshrc`)
   ```bash
   export ANDROID_HOME=$HOME/android-sdk
   export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
   export PATH=$ANDROID_HOME/platform-tools:$PATH
   ```

5. **Install Required SDK Packages**
   ```bash
   sdkmanager --licenses  # Accept all licenses
   sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
   ```

## Build Process

### Step 1: Build Web Assets on Replit

```bash
# On Replit, build the optimized production web bundle
npm run build
```

This creates production-optimized assets in `dist/public/` (web assets only).

### Step 2: Sync with Capacitor (on Replit or locally)

```bash
# Sync web assets to Android native project
npx cap sync android

# Copy web assets to Android
npx cap copy android
```

### Step 3: Clone Repository Locally (if building locally)

```bash
# Clone your Replit project to local machine
git clone https://github.com/your-username/peacepad.git
cd peacepad

# Install dependencies
npm install
```

### Step 4: Configure Signing (First Time Only)

#### Option A: Google Play App Signing (Recommended)

1. Build an **initial upload key** (one-time setup):
   ```bash
   cd android/app
   keytool -genkey -v -keystore upload-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias upload \
     -dname "CN=PeacePad, OU=Mobile, O=PeacePad, L=Toronto, ST=Ontario, C=CA" \
     -storepass SECURE_PASSWORD_HERE \
     -keypass SECURE_PASSWORD_HERE
   ```

2. Configure Gradle signing in `android/app/build.gradle`:
   ```gradle
   signingConfigs {
       release {
           storeFile file(System.getenv("KEYSTORE_PATH") ?: "upload-keystore.jks")
           storePassword System.getenv("KEYSTORE_PASSWORD")
           keyAlias System.getenv("KEY_ALIAS") ?: "upload"
           keyPassword System.getenv("KEY_PASSWORD")
       }
   }
   ```

3. Set environment variables:
   ```bash
   export KEYSTORE_PATH="$PWD/android/app/upload-keystore.jks"
   export KEYSTORE_PASSWORD="your_secure_password"
   export KEY_ALIAS="upload"
   export KEY_PASSWORD="your_secure_password"
   ```

4. **Enable Google Play App Signing** in Play Console (Google manages the final signing key)

#### Option B: Manual Keystore Management

If not using Google Play App Signing, use a single keystore for all releases:
```bash
keytool -genkey -v -keystore release-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias peacepad-release
```

⚠️ **CRITICAL**: Back up this keystore securely. Loss = unable to update app!

### Step 5: Build Android App Bundle (.aab)

```bash
cd android

# Clean previous builds
./gradlew clean

# Build signed release bundle for Play Store
./gradlew bundleRelease

# Output will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Step 6: Verify the Bundle

```bash
# Check bundle contents
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=peacepad.apks \
  --mode=universal

# Extract and inspect
unzip peacepad.apks -d peacepad-apks/
```

### Step 7: Upload to Play Console

1. Go to https://play.google.com/console
2. Select **PeacePad** app
3. Navigate to **Production** > **Create new release**
4. Upload `app-release.aab`
5. Complete release notes and metadata
6. Submit for review

## Quick Reference: Commands

```bash
# On Replit - Build web assets (Vite only, no backend bundling needed for mobile)
npm run build

# On Replit - Sync to Android project
npx cap sync android

# Locally - Build signed AAB
cd android && ./gradlew clean bundleRelease

# Output location
android/app/build/outputs/bundle/release/app-release.aab
```

## Versioning

Update version before each release in `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.0.1"  // Semantic version
}
```

## Troubleshooting

### "SDK location not found"

Create `android/local.properties`:
```properties
sdk.dir=/Users/yourname/android-sdk
```

### "Task bundleRelease not found"

Ensure you're in the `android/` directory when running Gradle commands.

### Build fails with memory issues

Increase Gradle memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

## CI/CD with GitHub Actions

For automated builds, see `.github/workflows/android-release.yml` (to be created).

## Security Notes

- **Never commit** keystore files to Git
- Store keystore passwords in environment variables or CI secrets
- Use Google Play App Signing for enhanced security
- Keep backup of upload keystore in secure location (password manager, encrypted storage)

## Production Checklist

- [ ] Web assets built with `npm run build`
- [ ] Capacitor synced with `npx cap sync android`
- [ ] Version code incremented in `build.gradle`
- [ ] Release notes prepared
- [ ] Keystore configured and secure
- [ ] AAB built with `./gradlew bundleRelease`
- [ ] Bundle tested on device
- [ ] Uploaded to Play Console
- [ ] Release submitted for review

---

**App Details:**
- **App ID**: `ca.peacepad.app`
- **Production Server**: `https://peacepad.ca`
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35 (Android 15)
