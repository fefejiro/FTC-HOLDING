# Saywetin - Play Store Deployment Guide

## App Ready Status

Your app is now configured for Play Store deployment. Here's what's been set up:

### Done:
- App icons generated (all required sizes: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Play Store icon (512x512) at `android/app/src/main/playstore-icon.png`
- Splash screen configured with Saywetin branding
- App name: **Saywetin**
- Package ID: `com.saywetin.app`
- Version: 1.0.0 (versionCode: 1)
- Release build configuration with code shrinking enabled

---

## Steps to Publish on Play Store

### Step 1: Create a Keystore (One-Time Setup)

Run this command on your local machine (keep the keystore file FOREVER):

```bash
keytool -genkey -v -keystore saywetin-release.keystore -alias saywetin -keyalg RSA -keysize 2048 -validity 10000
```

You'll be asked to create a password and enter your details. **Save this keystore and password securely - you need it for every future update!**

### Step 2: Build the Signed APK/AAB

#### Option A: Build on Local Machine (Recommended)

1. Clone or download your project
2. Create `android/keystore.properties` file:
   ```properties
   storeFile=../saywetin-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=saywetin
   keyPassword=YOUR_KEY_PASSWORD
   ```
3. Build the release bundle:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
4. Find your AAB at: `android/app/build/outputs/bundle/release/app-release.aab`

#### Option B: Build on Replit

1. Add these to your `android/gradle.properties`:
   ```properties
   RELEASE_STORE_FILE=../saywetin-release.keystore
   RELEASE_STORE_PASSWORD=your_password
   RELEASE_KEY_ALIAS=saywetin
   RELEASE_KEY_PASSWORD=your_password
   ```
2. Upload your keystore to the android folder
3. Run: `cd android && ./gradlew bundleRelease`

### Step 3: Create Google Play Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete your developer profile

### Step 4: Create Your App Listing

Required assets (prepare these):

| Asset | Size | Description |
|-------|------|-------------|
| App Icon | 512x512 | Already created at `android/app/src/main/playstore-icon.png` |
| Feature Graphic | 1024x500 | Banner shown at top of listing |
| Screenshots | Various | Phone: 1080x1920, Tablet: 1920x1200 |

Required info:
- **App Title:** Saywetin
- **Short Description (80 chars):** Discover African music meanings. Hear a song, learn its cultural story.
- **Full Description:** Write a compelling 4000-char description
- **Category:** Music & Audio
- **Privacy Policy URL:** Required - create one at [Termly](https://termly.io) or similar

### Step 5: Upload & Review

1. Upload your AAB file to Play Console
2. Fill in content rating questionnaire
3. Set up pricing (Free)
4. Submit for review (usually 1-3 days)

---

## Quick Commands Reference

```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio (if installed)
npx cap open android

# Build debug APK (for testing)
cd android && ./gradlew assembleDebug

# Build release bundle (for Play Store)
cd android && ./gradlew bundleRelease
```

---

## Version Updates

When releasing updates, increment versions in `android/app/build.gradle`:

```groovy
versionCode 2        // Must increase for each release
versionName "1.1.0"  // User-visible version
```

---

## Troubleshooting

**Build fails with signing error?**
- Make sure keystore path is correct (relative to android/app)
- Check passwords are correct in gradle.properties

**App crashes on launch?**
- Test debug build first: `./gradlew assembleDebug`
- Check logcat for errors: `adb logcat`

**Need to test on device?**
- Build debug APK: `cd android && ./gradlew assembleDebug`
- Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`
- Install: `adb install app-debug.apk`

---

## Support

For Play Store policies and requirements, see:
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Content Guidelines](https://play.google.com/about/developer-content-policy/)
