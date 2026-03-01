# 🚀 PeacePad - Google Play Store Deployment (14-Day Testing Window)

## COMPLETE WORKFLOW

Your app is **production-ready**. Follow these exact steps to deploy.

---

## Phase 1: Build Signed AAB (Off Replit - Local/CI)

**Problem**: Replit's disk is too small for full Gradle build (~2GB)

**Solution**: Download Android project and build locally

### Step A: Download Android Project from Replit
1. Go to Files panel (right side)
2. Open `android/` folder
3. Download entire `android/` directory (or use git clone)

### Step B: Build Signed AAB Locally

**First Time Setup:**
```bash
cd android

# Create signing keystore (store safely!)
keytool -genkey -v -keystore peacepad-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias peacepad \
  -dname "CN=PeacePad,O=PeacePad Inc,L=Ontario,ST=Ontario,C=CA"
```

**Build Release AAB:**
```bash
# Option 1: Android Studio (Easiest)
- Open Android Studio
- File → Open Project → select `android/` folder
- Build → Generate Signed App Bundle/APK
- Select "Release" build type
- Sign with your keystore
- AAB saved to: android/app/release/app-release.aab

# Option 2: Gradle Command Line
./gradlew bundleRelease

# Output: android/app/release/app-release.aab
```

---

## Phase 2: Upload to Google Play Console

### Setup (One Time)
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app or select PeacePad
3. Complete app details:
   - **App Name**: PeacePad
   - **Package Name**: ca.peacepad.app
   - **App Category**: Lifestyle/Communication
   - **Content Rating**: 18+ (domestic violence discussions, safety resources)

### Upload Release AAB
1. **Release → Testing → Internal testing**
2. **App bundles** → Upload `app-release.aab`
3. **Release name**: v1.0.0 - Conch Mode MVP
4. **Release notes**:
   ```
   PeacePad MVP Launch - Conch Mode

   Features:
   ✓ Conch Mode: Structured turn-based conversations with real-time audio
   ✓ AI Tone Analysis: Emotional intelligence for constructive communication
   ✓ Shared Calendar: Custody schedule with conflict detection
   ✓ Expense Tracking: Fair cost splitting
   ✓ Task Management: Shared to-do lists
   ✓ Child Updates: Collaborative note-taking
   ✓ Safety Resources: Domestic violence support directory
   ✓ Encrypted Safety Plans: AES-256-GCM encryption

   14-Day Internal Testing Window
   Feedback: peacepad@peacepad.ca
   ```

### Content Rating Questionnaire
- **Violence**: Medium (domestic abuse discussions in resources)
- **Sexual Content**: None
- **Language**: Low (some coarse language in support context)
- **Data Privacy**: High protection (encryption, GDPR compliance)

### Store Listing Details
- **Short Description** (80 chars):
  ```
  Safe co-parenting communication with AI emotional support
  ```
- **Full Description** (4000 chars):
  ```
  PeacePad is a co-parenting communication platform designed for separated parents who want constructive dialogue without tension.

  🎯 Key Features:
  • Conch Mode: Take turns speaking for clarity and respect
  • AI Tone Analysis: Real-time emotional intelligence feedback
  • Shared Calendar: Custody schedules with conflict detection
  • Expense Tracking: Fair cost splitting
  • Safety First: Encrypted safety plans + support resources
  • Domestic Violence Support: Find help in your area

  🛡️ Safety Features:
  • End-to-end encrypted messaging
  • Secure session cookies
  • GDPR compliant data handling
  • Automatic account recovery
  • 14-day guest sessions (no login needed)

  ✨ Perfect for:
  ✓ Building respectful co-parenting relationships
  ✓ Reducing conflict through structured communication
  ✓ Domestic abuse survivors needing safe space
  ✓ Families seeking emotional clarity

  📞 Support: peacepad@peacepad.ca
  ```

- **Screenshots**: 2-5 screenshots showing:
  1. Conch Mode active session
  2. Messaging with AI tone feedback
  3. Shared calendar view
  4. Safety resources directory
  5. Settings/partnership setup

- **Feature Graphics**: 1024x500px showing "Conch Mode - Structured Communication"

---

## Phase 3: 14-Day Internal Testing Rollout

### Days 1-3: Bug Triage
- Monitor crash reports
- Check WebRTC connection stability
- Identify critical issues
- **Metrics to track:**
  - Crash rate (<1%)
  - Session completion rate (>80%)
  - WebRTC connection success (>95%)

### Days 4-7: First Iteration
- Fix identified bugs
- Optimize performance
- Gather UX feedback from testers
- **QA Checklist:**
  - [ ] Conch Mode audio connects
  - [ ] Messaging shows tone feedback
  - [ ] Calendar displays correctly
  - [ ] Safety resources load
  - [ ] Push notifications work
  - [ ] Offline mode functions
  - [ ] Profile pictures upload
  - [ ] Expenses calculate correctly

### Days 8-11: Final Testing
- Regression testing
- Edge case verification
- Battery/memory profiling
- Network condition testing
- **Performance targets:**
  - Load time: <2s
  - Memory: <100MB
  - Battery drain: <5% per hour active use

### Days 12-14: Final Prep
- Document remaining known issues
- Plan post-testing release
- Prepare marketing materials
- Ready for wider rollout

---

## Phase 4: Post-Testing Release Strategy

After 14-day internal testing:

1. **Expanded Testing** (if approved):
   - Closed testing: 100+ users
   - Open beta: All users in Canada first

2. **Production Release**:
   - Roll out to all regions
   - Monitor metrics
   - Enable post-launch monitoring

3. **Ongoing Support**:
   - Monitor Play Store reviews
   - Address feedback rapidly
   - Plan feature releases

---

## Domain Configuration Reference

Your app automatically connects to **https://peacepad.ca** (production domain).

**Environment Overrides** (if needed):
```bash
# For staging
CAPACITOR_ENV=staging npx cap sync android
# Will point to dev.peacepad.ca

# For local dev
CAPACITOR_ENV=development npx cap sync android
# Will point to localhost:5000
```

---

## Important Deployment Files

**Keep safe (in Google Play Console):**
- `peacepad-release.keystore` - App signing key (never lose this!)
  - Store in secure location
  - Backup multiple times
  - Same key for all future updates

**From Replit (ready to download):**
- `android/` directory - Full Android source
- `capacitor.config.ts` - Configuration
- `dist/public/` - Built web app

---

## Critical URLs & Contacts

| Item | Value |
|------|-------|
| **Production Domain** | https://peacepad.ca |
| **Developer Email** | peacepad@peacepad.ca |
| **App Package** | ca.peacepad.app |
| **App ID** | ca.peacepad.app |
| **Min Android** | 8.0 (API 26) |
| **Target Android** | 14 (API 34) |

---

## Troubleshooting

### APK Won't Install
```bash
adb uninstall ca.peacepad.app
adb install app-release.aab  # Try APK instead
```

### WebRTC Audio Not Working
- Verify TURN server configuration
- Check microphone permissions in AndroidManifest.xml
- Test with WiFi first, then mobile data

### Crashes on Startup
- Check logcat: `adb logcat | grep PeacePad`
- Verify database migration complete
- Check environment variables set

---

## Next Steps

1. ✅ Web app built
2. ✅ Android platform added and synced
3. ⏳ **Download `android/` folder**
4. ⏳ **Build AAB locally** (Gradle bundleRelease)
5. ⏳ **Upload to Google Play Console**
6. ⏳ **Configure internal testing track**
7. ⏳ **Submit for review**

**Estimated time**: 1-2 hours
**14-day testing window**: Starts after approval

You're ready! 🚀
