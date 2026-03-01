# PeacePad - Play Store Deployment: Next Steps

## ✅ What's Already Done (On Replit)

**Completed on December 4, 2024:**

✅ **Production Build Created**
- All web assets built and optimized (`npm run build`)
- Total build time: 19.29 seconds
- Output: `dist/public/` (ready for Android embedding)

✅ **Firebase Cloud Messaging Configured**
- `google-services.json` installed at `android/app/google-services.json`
- Package name verified: `ca.peacepad.app`
- Push notifications fully configured (FCM/APNs)

✅ **Android Project Synced**
- Capacitor sync completed successfully
- 2 plugins configured: App, Push Notifications
- All web assets copied to Android project

✅ **All Secrets Configured**
- FIREBASE_SERVICE_ACCOUNT (for push notifications)
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL (for web push)
- DATABASE_URL (PostgreSQL connection)
- MAILJET_API_KEY, MAILJET_SECRET_KEY (email notifications)

✅ **Production Configuration Verified**
- Server URL: `https://peacepad.ca`
- App ID: `ca.peacepad.app`
- Version: 1.0.0 (versionCode: 1)
- Min SDK: 23 (Android 6.0)
- Target SDK: 35 (Android 15)

---

## 📋 What You Need to Do (On Your Local Machine)

### Step 1: Clone This Project

```bash
# Option A: Use Git (recommended)
git clone https://github.com/fefejiro/fefejiro-PeacePadAI peacepad
cd peacepad

# Option B: Download from Replit
# Click the 3-dot menu → "Download as zip"
# Extract the zip file
```

### Step 2: Install Android SDK

**You need ONE of these:**

**Option A: Android Studio** (recommended for beginners)
- Download: https://developer.android.com/studio
- Install and let it set up the Android SDK automatically

**Option B: Command Line Tools** (for advanced users)
- Download: https://developer.android.com/studio#command-line-tools-only
- See `PLAY_STORE_BUILD.md` for detailed setup instructions

### Step 3: Generate Signing Keystore

**CRITICAL:** This keystore is your app's identity. Back it up securely!

```bash
# Navigate to a secure location (NOT in project directory)
cd ~

# Generate the keystore
keytool -genkey -v -keystore peacepad-release.keystore \
  -alias peacepad \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Follow the prompts:
# - Choose a STRONG password (save it in a password manager!)
# - Enter your organization details
# - Use the SAME password for keystore and key
```

**Backup your keystore:**
```bash
# Copy to at least 2 secure locations
cp ~/peacepad-release.keystore ~/Dropbox/secure/
cp ~/peacepad-release.keystore /path/to/external/drive/
```

### Step 4: Configure Signing

Create `android/keystore.properties`:

```properties
storeFile=/absolute/path/to/peacepad-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=peacepad
keyPassword=YOUR_KEY_PASSWORD
```

**Then edit `android/app/build.gradle`:**

Add this at the top (before `android {`):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Update the `signingConfigs` section (around line 32):

```gradle
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
```

### Step 5: Build the Release AAB

```bash
cd android
./gradlew bundleRelease
```

**The AAB will be created at:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Verify the build:**
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
# Should be 5-20 MB
```

### Step 6: Upload to Google Play Console

1. Go to https://play.google.com/console/
2. Create a new app (if you haven't already)
   - App name: **PeacePad**
   - Default language: English
   - Type: App
   - Category: Lifestyle or Parenting
3. Navigate to "Release" → "Production" → "Create new release"
4. Upload `app-release.aab`
5. Fill in release notes (see below)
6. Complete store listing (see requirements below)
7. Submit for review

---

## 📝 Play Store Listing Requirements

### Required Information:

**App Name:**
```
PeacePad
```

**Short Description (80 characters max):**
```
AI-powered co-parenting platform for constructive communication
```

**Full Description:**
See `PLAY_STORE_BUILD.md` for complete description template

**Category:**
- Primary: Lifestyle or Parenting
- Content rating: Everyone (with parental guidance themes)

**Contact Email:**
```
peacepad@peacepad.ca
```

**Privacy Policy URL:**
```
https://peacepad.ca/privacy
```

**Website:**
```
https://peacepad.ca
```

### Required Assets:

1. **App Icon** - 512x512 PNG
   - Use high-resolution version of your logo
   - No transparency

2. **Feature Graphic** - 1024x500 PNG/JPEG
   - Showcase key features (Conch Mode, messaging)
   - Include app name and tagline

3. **Screenshots** (minimum 2, recommended 4-8)
   - Phone screenshots
   - Min 320px on shortest side
   - Recommended scenes:
     - Welcome/onboarding screen
     - Conch Mode interface
     - Messaging screen with AI suggestions
     - Calendar view
     - Dashboard/home screen

4. **Release Notes (for version 1.0.0):**
```
🎉 Initial Release - Welcome to PeacePad!

PeacePad helps separated parents communicate constructively and reduce conflict.

Features in this release:
✅ Conch Mode - Structured turn-based conversations with AI mood tracking
✅ Real-time messaging with AI tone analysis
✅ Push notifications for all messages and events
✅ Shared calendar with conflict detection
✅ Expense tracking and settlement
✅ Task management and child updates
✅ Safety resources and encrypted safety plans

We're excited to help you build a better co-parenting relationship!
```

---

## 🔍 Pre-Submission Checklist

Before uploading to Play Console, verify:

- [ ] AAB builds successfully
- [ ] AAB is signed with release keystore
- [ ] Version code: 1, Version name: 1.0.0
- [ ] App ID: ca.peacepad.app
- [ ] google-services.json included
- [ ] Privacy policy is live at https://peacepad.ca/privacy
- [ ] Terms of service is live at https://peacepad.ca/terms
- [ ] Production server is running at https://peacepad.ca
- [ ] Firebase Cloud Messaging is configured
- [ ] App icon is ready (512x512 PNG)
- [ ] Feature graphic is ready (1024x500 PNG)
- [ ] At least 2 screenshots are ready
- [ ] Release notes are written

---

## 🆘 Need Help?

**Full detailed instructions:**
- See `PLAY_STORE_BUILD.md` in this project
- Contains step-by-step guide with troubleshooting

**Android documentation:**
- Capacitor: https://capacitorjs.com/docs/android
- Play Console: https://support.google.com/googleplay/android-developer
- Firebase: https://firebase.google.com/docs/cloud-messaging

**Questions?**
- Contact: peacepad@peacepad.ca

---

## 🎯 Summary

**You're 5 steps away from the Play Store:**

1. ✅ Clone project (download from Replit)
2. ⏳ Install Android SDK
3. ⏳ Generate signing keystore
4. ⏳ Build release AAB
5. ⏳ Upload to Play Console

**Estimated time:** 1-2 hours (first time)

**The hard part is done!** All the app development, Firebase setup, and production configuration is complete. You just need to build and sign the Android package.

Good luck! 🚀
