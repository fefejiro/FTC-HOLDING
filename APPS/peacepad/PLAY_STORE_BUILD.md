# PeacePad Play Store Build Guide
## Complete Setup & Release Process

### 🎯 Current Build Status

**✅ COMPLETED ON REPLIT (December 4, 2024):**
- ✅ Production web assets built (`npm run build`) - 19.29s
- ✅ Firebase Cloud Messaging configured (`google-services.json` installed)
- ✅ Web assets synced to Android (`npx cap sync android`)
- ✅ Capacitor plugins: App, Push Notifications
- ✅ All secrets configured (FIREBASE_SERVICE_ACCOUNT, VAPID keys, DATABASE_URL)

**Version:** 1.0.0 (versionCode: 1)  
**App ID:** ca.peacepad.app  
**Production Server:** https://peacepad.ca

### Overview
This guide covers everything needed to build and release PeacePad to the Google Play Store. The Replit portion is **already complete** - you just need to clone the project locally and build the signed AAB.

---

## 🚀 Quick Start (TL;DR)

**For experienced Android developers**, here's the fast track:

```bash
# 1. Clone project from Replit
git clone <your-replit-git-url> peacepad
cd peacepad

# 2. Generate signing keystore (one-time)
keytool -genkey -v -keystore ~/peacepad-release.keystore \
  -alias peacepad -keyalg RSA -keysize 2048 -validity 10000

# 3. Configure signing (create android/keystore.properties)
cat > android/keystore.properties << EOF
storeFile=/absolute/path/to/peacepad-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=peacepad
keyPassword=YOUR_PASSWORD
EOF

# 4. Update android/app/build.gradle to load keystore.properties
# (See Step 5 for full gradle config)

# 5. Build release AAB
cd android
./gradlew bundleRelease

# 6. Upload to Play Console
# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

**For detailed step-by-step instructions**, continue reading below.

---

## Step 1: Prepare Your Local Development Environment

### Prerequisites
- **Java Development Kit (JDK) 17 or higher**
- **Android SDK** (API 23-35)
- **Gradle 8.0+** (usually bundled with Android project)
- **Git** (to clone this Replit project)
- **Node.js & npm** (optional - build already done on Replit)

### Install Android SDK (Without Android Studio)

**Option A: Command Line Tools (Lightweight)**
```bash
# Download Android Command Line Tools from:
# https://developer.android.com/studio#command-line-tools-only

# Extract and setup
mkdir -p ~/android-sdk/cmdline-tools
unzip commandlinetools-linux-*.zip -d ~/android-sdk/cmdline-tools
mv ~/android-sdk/cmdline-tools/cmdline-tools ~/android-sdk/cmdline-tools/latest

# Set environment variables
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accept licenses and install required packages
sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;34.0.0" "platform-tools"
```

**Option B: Android Studio (Full IDE)**
```bash
# Download from: https://developer.android.com/studio
# Install and Android Studio will set up SDK automatically
```

---

## Step 2: Build Mode & Memory Optimization

### Enable Build Mode
```bash
export BUILD_MODE=true
export PLAY_STORE_BUILD=true
```

### Start Server with Optimizations
```bash
# Option 1: With garbage collection
node --expose-gc ./node_modules/.bin/tsx server/index.ts

# Option 2: Set environment variable and run dev
BUILD_MODE=true npm run dev
```

The system will automatically:
- Disable health monitoring (~15-20 MB saved)
- Extend cleanup intervals (~5-10 MB saved)
- Auto-clear logs (~20-30 MB saved)
- Run garbage collection every 30 seconds

**Expected logs:**
```
[Auto-Recovery] Build mode detected - health monitor disabled to conserve memory
[Memory] Garbage collection enabled in build mode
[Conch Cleanup] Starting session cleanup service (runs every 5 minutes (build mode))
[Call Cleanup] Starting call cleanup service (runs every 5 minutes (build mode))
```

---

## Step 3: Prepare the Frontend Build

### Build the Web Assets
```bash
npm run build
```

This creates optimized, minified assets in `dist/public/` which will be embedded in the APK/AAB.

### Verify Build Output
```bash
ls -lh dist/public/
# Look for:
# - index.html (usually < 100KB)
# - assets/ folder (all JS/CSS should be minified)
# - manifest.json (PWA metadata)
```

---

## Step 4: Update Version Numbers

### Update Android Version
```bash
# Edit android/app/build.gradle
# Change versionCode (must increment by 1 each release)
# Change versionName (semantic versioning: X.Y.Z)
```

**Example:**
```gradle
versionCode 2
versionName "1.1.0"
```

### Update package.json
```json
"version": "1.1.0"
```

### Update capacitor.config.ts
```typescript
// Optional: sync version if needed
```

---

## Step 5: Generate Release Signing Key (One-Time Setup)

### Create Keystore

**CRITICAL:** This keystore is required to sign your app. If you lose it, you cannot update your app on the Play Store!

```bash
# Navigate to a secure location (NOT in your project directory)
cd ~

# Generate the keystore
keytool -genkey -v -keystore peacepad-release.keystore \
  -alias peacepad \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (choose a strong password)
# - Key password (can be the same as keystore password)
# - Your name/organization details
```

**Example prompts:**
```
Enter keystore password: [YOUR_STRONG_PASSWORD]
Re-enter new password: [YOUR_STRONG_PASSWORD]
What is your first and last name? PeacePad
What is the name of your organizational unit? Mobile
What is the name of your organization? PeacePad
What is the name of your City or Locality? Toronto
What is the name of your State or Province? Ontario
What is the two-letter country code for this unit? CA
Is CN=PeacePad, OU=Mobile, O=PeacePad, L=Toronto, ST=Ontario, C=CA correct? yes

Enter key password for <peacepad>: [SAME_PASSWORD or different]
```

### Secure the Keystore

```bash
# Backup the keystore to multiple secure locations
cp ~/peacepad-release.keystore ~/Dropbox/secure/
cp ~/peacepad-release.keystore /path/to/external/drive/

# Save passwords in a password manager (1Password, LastPass, etc.)
# NEVER commit the keystore to git
# NEVER share the keystore publicly
```

### Configure Signing in Android Project

**Option A: Using keystore.properties (Recommended)**

Create `android/keystore.properties`:
```properties
storeFile=/absolute/path/to/peacepad-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=peacepad
keyPassword=YOUR_KEY_PASSWORD
```

Then update `android/app/build.gradle` (around line 32):

```gradle
// Add this near the top, before the android { } block
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
        debug {
            storeFile file('debug.keystore')
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Option B: Use Play App Signing (Easier for beginners)**

Google can manage your production signing key automatically. You only need an "upload key" which can be replaced if lost.

See: https://support.google.com/googleplay/android-developer/answer/9842756

### Add keystore.properties to .gitignore

```bash
echo "keystore.properties" >> android/.gitignore
```

---

## Step 6: Build AAB for Play Store

### Build Release Bundle
```bash
cd android
./gradlew bundleRelease
```

The AAB will be created at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Build APK for Testing (Alternative)
```bash
cd android
./gradlew assembleRelease
```

APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Check Build Size
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
# Target: < 100 MB (Play Store dynamic delivery handles this)
```

---

## Step 7: Test Before Publishing

### Install APK on Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk

# Or through Android Studio Device Manager
```

### Testing Checklist
- [ ] App launches without crashes
- [ ] Authentication works (Replit Auth)
- [ ] Messaging functionality works
- [ ] Conch Mode call audio/video works
- [ ] Push notifications work
- [ ] All permissions properly requested
- [ ] Settings page accessible
- [ ] Privacy mode toggle works
- [ ] QR code generation works
- [ ] Find Support directory loads

### Internal Testing Track
1. Upload AAB to Google Play Console
2. Set as Internal Testing track first
3. Add test accounts
4. Install and test thoroughly
5. Only promote to Beta/Production after verification

---

## Step 8: Prepare Play Store Listing

### Required Assets
1. **App Icon** (512x512 PNG)
   - Location: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

2. **Feature Graphics** (1024x500 PNG)
   - Title: "PeacePad - Fair Co-Parenting Communication"
   - Highlight: Conch Mode turn-based conversations

3. **Screenshots** (5-8 recommended)
   - Welcome/Onboarding
   - Conch Mode interface
   - Messaging screen
   - Calendar/Scheduling
   - Find Support directory

4. **Short Description** (80 characters max)
   ```
   Fair communication tools for co-parents
   ```

5. **Full Description** (4000 characters max)
   ```
   PeacePad helps separated co-parents communicate constructively.
   
   Features:
   - Conch Mode: Fair turn-based conversations with AI mood tracking
   - Real-time Messaging: Chat with AI tone analysis suggestions
   - Shared Tools: Calendar, expense tracking, task management
   - Support Resources: Access domestic violence resources and information
   - Privacy First: Encryption, shake detection, privacy mode
   - AI Personalization: Customized based on your communication style
   
   Perfect for families navigating co-parenting after separation.
   ```

### Privacy Policy & Terms
- Create at: `https://peacepad.ca/privacy` and `https://peacepad.ca/terms`
- Both must be accessible and compliant with Play Store requirements
- Must address data collection, encryption, user rights

---

## Step 9: Release Process

### In Google Play Console:
1. Create a new release
2. Upload app-release.aab
3. Add release notes (focus on new features & fixes)
4. Set target audience (Parents, Adults 18+)
5. Set content rating
6. Review all settings
7. Submit for review

### Review Timeline
- Initial review: 24-72 hours typically
- Google may request additional info
- Monitor Play Console for responses
- Once approved, can choose rollout percentage

---

## Step 10: Post-Release Monitoring

### Check App Health
```
Google Play Console → App Health → Crashes & ANRs
```

### Monitor User Feedback
```
Google Play Console → User Reviews & Ratings
```

### Update Version for Next Release
1. Increment versionCode by 1
2. Update versionName (semantic versioning)
3. Update release notes in Play Console
4. Rebuild and test again

---

## Troubleshooting

### Build Fails with "Unresolved Reference"
```bash
cd android
./gradlew clean
./gradlew sync
```

### Memory Issues During Build
```bash
# Increase gradle memory
export GRADLE_OPTS="-Xmx2048m"

# Or edit gradle.properties
# org.gradle.jvmargs=-Xmx2048m
```

### Signing Issues
```bash
# Verify keystore integrity
keytool -list -v -keystore /path/to/peacepad.keystore

# Verify signing config is correct in build.gradle
```

### Play Store Rejection
- Common reasons:
  - Missing privacy policy
  - Inappropriate permissions without explanation
  - Crash on startup
  - Missing app description/screenshots
  
- Solution:
  - Address feedback in Play Console
  - Fix issues
  - Resubmit new version

---

## Quick Reference

### One-Command Release Build
```bash
export BUILD_MODE=true && \
export KEYSTORE_PATH="/path/to/keystore" && \
export KEYSTORE_PASSWORD="password" && \
npm run build && \
cd android && \
./gradlew bundleRelease
```

### Version Increment
```bash
# Edit android/app/build.gradle
versionCode X  # Increment by 1
versionName "Y.Y.Z"  # Update version

# Then rebuild
./gradlew bundleRelease
```

---

## Important Notes

✅ **Before submitting to Play Store:**
- Test thoroughly on multiple devices
- Verify all permissions are necessary
- Test push notifications
- Verify Replit Auth works
- Check WebRTC audio/video quality

⚠️ **Play Store Requirements:**
- Must have privacy policy (linked in Play Console)
- Must disclose data collection
- Must respect user privacy
- Cannot use excessive permissions without explanation

🔒 **Security:**
- Never commit keystore to git
- Use environment variables for sensitive data
- Rotate keys periodically
- Keep Play Store account secure

---

## Support

For detailed Capacitor documentation: https://capacitorjs.com/docs/android
For Play Store publishing: https://developer.android.com/studio/publish
