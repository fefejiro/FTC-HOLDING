# PeacePad - Final Build & Deploy Steps

## Quick Reference

Your Android platform is now set up and ready. Follow these steps to build and deploy to Google Play Store.

---

## Step 1: Build the Web App

```bash
npm run build
```

This creates:
- `dist/public/` - Frontend (React/Vite) optimized for production
- `dist/` - Backend and all assets

**Expected output**: Build completes with chunk warnings (normal)

---

## Step 2: Sync Capacitor with Android

```bash
npx cap sync android
```

This:
- Copies web build to Android project
- Updates Capacitor plugins
- Syncs Gradle configuration

**Expected output**: Success message with platform updates

---

## Step 3: Generate Signed Android App Bundle (AAB)

### Option A: Using Android Studio (Recommended)
1. Open Android Studio: `cd android && open -a "Android Studio" .` (macOS)
2. Build → Generate Signed App Bundle/APK
3. Select "Release" build type
4. Sign with your keystore (create if needed)
5. Output: `android/app/release/app-release.aab`

### Option B: Using Gradle Command
```bash
cd android
./gradlew bundleRelease
```

**Output**: `app/release/app-release.aab`

---

## Step 4: Prepare for Google Play Console

### Create Signing Keystore (First Time Only)
```bash
keytool -genkey -v -keystore peacepad-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias peacepad
```

**Store this keystore securely!** You'll need it for future app updates.

---

## Step 5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select PeacePad app
3. Release → Testing → Internal testing (or Closed testing)
4. Upload app-release.aab to "App bundles"
5. Fill in release details:
   - **Release name**: v1.0.0 - Conch Mode MVP
   - **Release notes**: See GOOGLE_PLAY_DEPLOYMENT.md Phase 4

6. **Content Rating**: Complete questionnaire
   - Sensitive content: Domestic violence discussions, safety resources
   - Data privacy: AES-256-GCM encryption
   - GDPR compliant

7. **Rollout**: Start with internal testing (100 testers max)
8. Submit for review (~2-4 hours)

---

## Step 6: 14-Day Testing Window

### Days 1-3: Bug Triage
- Collect crash reports
- Track WebRTC connection issues
- Prioritize critical bugs

### Days 4-7: First Iteration
- Fix identified bugs
- Optimize performance
- Gather UX feedback

### Days 8-11: Final Testing
- Regression testing
- Edge case verification
- Battery/memory optimization

### Days 12-14: Final Prep
- Document remaining issues
- Prepare for wider release
- Finalize Play Store listing

---

## Domain Configuration

Your Capacitor config automatically points to:
- **Production**: https://peacepad.ca (default, used for Play Store build)

If you need to build for a different domain (staging/dev), you can override:
```bash
# For staging/dev
CAPACITOR_ENV=staging npx cap sync android
./gradlew bundleRelease

# For local development
CAPACITOR_ENV=development npx cap sync android
```

---

## Troubleshooting

### Android Platform Not Found
```bash
npx cap add android
```

### Gradle Sync Failed
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### APK Installation Fails
```bash
# Uninstall existing app
adb uninstall ca.peacepad.app

# Install new APK
adb install app/debug/app-debug.apk
```

### WebRTC Not Working in APK
- Verify TURN server configuration in capacitor.config.ts
- Ensure Android permissions include RECORD_AUDIO and INTERNET
- Check AndroidManifest.xml

---

## Files You'll Need

- ✅ `app-release.aab` (for Play Store)
- ✅ `capacitor.config.ts` (domain configuration)
- ✅ `android/` directory (Gradle project)
- ✅ `peacepad-release.keystore` (app signing - keep safe!)

---

## Next: Deploy to Play Store

Once you have the signed AAB, you're ready to upload to Google Play Console and launch the 14-day internal testing window!

