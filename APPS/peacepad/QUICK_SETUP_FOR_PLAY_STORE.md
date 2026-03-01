# Quick Setup: Get PeacePad on Google Play Store

## STEP 1: Download Android Folder (2 minutes)

1. Click the **Files** panel (right side of Replit)
2. Find the **`android/`** folder
3. **Right-click** → **Download**
4. Save to your computer (e.g., `~/Downloads/android/`)

---

## STEP 2: Build on Your Computer (5 minutes)

**Prerequisites:**
- Java installed (check: `java -version`)
- Android SDK installed (Android Studio includes this)

**Commands:**

```bash
# Navigate to the downloaded folder
cd ~/Downloads/android

# FIRST TIME ONLY: Create signing key
keytool -genkey -v -keystore peacepad-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias peacepad \
  -dname "CN=PeacePad,O=PeacePad Inc,C=CA"

# Build the signed app bundle
./gradlew bundleRelease
```

**Output file location:**
```
~/Downloads/android/app/release/app-release.aab
```

Keep this file! You'll upload it next.

---

## STEP 3: Upload to Google Play Console (10 minutes)

1. **Go to:** https://play.google.com/console
2. **Login** with your developer account
3. **Click "Create new app"** (or select PeacePad if exists)
   - App name: `PeacePad`
   - Default language: English
   - App type: Apps
   - Category: Lifestyle/Communication

4. **Complete app listing:**
   - Description: See below
   - Screenshots: Upload 2-5 screenshots from the app
   - Content rating: Complete questionnaire (mark as 18+)

5. **Create a release:**
   - Go to: **Release → Testing → Internal testing**
   - Click **"Create new release"**
   - Click **"Upload"** → Select your `app-release.aab` file
   - **Release name:** `v1.0.0 - Conch Mode MVP`
   - **Release notes:**
     ```
     PeacePad MVP - Conch Mode Launch
     
     Features:
     • Conch Mode: Turn-based conversations with real-time audio
     • AI Tone Analysis: Emotional intelligence feedback
     • Shared Calendar: Custody scheduling
     • Expense Tracking: Fair cost splitting
     • Safety Resources: Domestic violence support
     • Encrypted Plans: AES-256-GCM encryption
     
     14-day testing window. Feedback: peacepad@peacepad.ca
     ```

6. **Add testers:**
   - Click **"Add testers"**
   - Add your email: `peacepad@peacepad.ca`
   - Add test Gmail accounts if you have them

7. **Submit for review:**
   - Click **"Save"**
   - Click **"Submit for review"**
   - **Wait 2-4 hours** for Google approval

---

## STEP 4: Start Testing (After Approval)

Once approved (email confirmation):
- Testers get "Join beta" button on Play Store
- They can install and test for 14 days
- You monitor crashes and feedback

---

## TROUBLESHOOTING

**Problem:** `./gradlew bundleRelease` fails
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

**Problem:** Java not found
- Install Android Studio: https://developer.android.com/studio
- It includes Java and Android SDK

**Problem:** Can't find app-release.aab
- Check: `android/app/release/app-release.aab`
- If not there, check for `android/app/debug/app-debug.apk` (fallback)

---

## FILES READY IN REPLIT

✅ Web app built: `dist/public/`
✅ Android platform: `android/` (download this)
✅ Config: `capacitor.config.ts` (points to peacepad.ca)
✅ Deployment guide: `PLAY_STORE_FINAL_STEPS.md`

---

## NEXT STEPS

1. ✅ Download `android/` folder
2. ⏳ Run `./gradlew bundleRelease` (takes ~5 min)
3. ⏳ Upload to Google Play Console
4. ⏳ Submit for review
5. ⏳ Wait for approval email

**That's it!** 🚀 After approval, your 14-day testing window begins.
