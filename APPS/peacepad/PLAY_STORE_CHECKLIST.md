# PeacePad Play Store Submission Checklist
## Complete Step-by-Step Readiness Guide

---

## ✅ Phase 1: Code & Configuration (COMPLETED)

### Memory Optimization
- [x] TestMonitor auto-truncates logs (max 100 entries)
- [x] HealthMonitor disables in build mode
- [x] Cleanup services extend intervals in build mode
- [x] Automatic garbage collection enabled
- [x] Build mode environment variables implemented

**Files Updated:**
- `server/index.ts`
- `server/autoRecovery.ts`
- `server/testMonitor.ts`
- `server/conchSessionCleanup.ts`
- `server/callCleanup.ts`

### Android Build Configuration
- [x] Minification enabled (ProGuard/R8)
- [x] Resource shrinking enabled
- [x] Release signing configured
- [x] Version code & version name set
- [x] Debug and release build types configured

**Files Updated:**
- `android/app/build.gradle` - Minification, signing, optimization
- `android/app/src/main/AndroidManifest.xml` - All required permissions
- `android/app/src/main/res/values/strings.xml` - App metadata

### Permissions Added
- [x] INTERNET - Network access
- [x] ACCESS_NETWORK_STATE - Network status
- [x] RECORD_AUDIO - Conch Mode calls
- [x] CAMERA - Conch Mode video
- [x] READ_EXTERNAL_STORAGE - File uploads
- [x] WRITE_EXTERNAL_STORAGE - Local caching
- [x] POST_NOTIFICATIONS - Push notifications
- [x] VIBRATE - Accessibility

---

## ✅ Phase 2: Documentation (COMPLETED)

- [x] APK_BUILD_GUIDE.md - Complete build workflow
- [x] KEYSTORE_SETUP.md - Signing key creation & management
- [x] VERSIONING_GUIDE.md - Version management & releases
- [x] PLAY_STORE_CHECKLIST.md - This file
- [x] replit.md - Updated with Play Store info

---

## ⚠️ Phase 3: Before Building (DO THESE NEXT)

### Setup Keystore (First Time)
- [ ] Create keystore file: `~/peacepad/peacepad.keystore`
- [ ] Follow KEYSTORE_SETUP.md instructions
- [ ] Store credentials in password manager
- [ ] Back up keystore to external drive
- [ ] Back up keystore to cloud storage
- [ ] Test signing process with APK build

### Prepare Environment
- [ ] Install Android SDK (API 34+)
- [ ] Install Android Studio
- [ ] Install Gradle 8.0+
- [ ] Verify Node.js & npm installed
- [ ] Verify Git installed

### Configure Build System
- [ ] Add `~/.gradle/gradle.properties` with signing credentials
- [ ] OR set up environment variables for CI/CD
- [ ] Test `./gradlew bundleRelease` succeeds
- [ ] Verify AAB output at: `android/app/build/outputs/bundle/release/app-release.aab`

---

## ⚠️ Phase 4: Build & Test

### Build Process
```bash
# Step 1: Enable build mode
export BUILD_MODE=true

# Step 2: Build web assets
npm run build

# Step 3: Build AAB
cd android
./gradlew bundleRelease
```

- [ ] Web build completes without errors
- [ ] AAB file created successfully
- [ ] AAB file size < 100 MB (Play Store requirement)

### Install & Test on Device
```bash
# Build APK for testing
./gradlew assembleRelease

# Install on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Functional Testing (On Device)
- [ ] App launches without crashes
- [ ] Replit Auth login works
- [ ] Create partnership works
- [ ] Messaging works
- [ ] Conch Mode audio works
- [ ] Conch Mode video works
- [ ] Camera permission prompts
- [ ] Microphone permission prompts
- [ ] Calendar/scheduling works
- [ ] Expense tracking works
- [ ] Find Support loads
- [ ] Safety plan accessible
- [ ] Privacy mode toggle works
- [ ] QR code generation works
- [ ] Push notifications (if enabled)
- [ ] No console errors in logs

### Performance Testing
```bash
adb logcat | grep -i error
```
- [ ] No ERROR level logs
- [ ] App memory < 200 MB
- [ ] App doesn't crash on low memory
- [ ] Smooth scrolling/animations
- [ ] Fast load times

---

## ⚠️ Phase 5: Play Store Metadata

### App Store Listing Assets
- [ ] App Icon (512x512 PNG)
  - Location: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
  - Ensure it's professional & clear
  
- [ ] Feature Graphics (1024x500 PNG)
  - Highlight: "Fair Communication for Co-Parents"
  
- [ ] Screenshots (5-8 required)
  - [ ] Onboarding flow
  - [ ] Conch Mode interface
  - [ ] Messaging screen
  - [ ] Calendar/scheduling
  - [ ] Find Support directory
  - [ ] Privacy features
  - [ ] Settings page

### App Store Information
- [ ] Short Description (80 chars max)
  - "Fair communication tools for co-parents"
  
- [ ] Full Description (4000 chars max)
  - Features list
  - Safety/security highlights
  - Use cases
  - Target audience
  
- [ ] Category
  - Social
  - Communication
  
- [ ] Content Rating
  - Complete IARC form
  - Select appropriate rating
  
- [ ] Privacy Policy
  - Must be accessible at: `https://peacepad.ca/privacy`
  - Must explain data collection
  - Must mention encryption
  - Must be complete & compliant
  
- [ ] Terms of Service
  - Must be accessible at: `https://peacepad.ca/terms`
  - Must define acceptable use
  - Must mention safety policies

---

## ⚠️ Phase 6: Upload to Play Console

### Create Google Play Developer Account
- [ ] Visit: developer.google.com
- [ ] Create account
- [ ] Pay one-time fee ($25)
- [ ] Verify identity
- [ ] Accept agreements

### Setup App in Play Console
1. [ ] Create new app
   - App name: "PeacePad"
   - Default language: English
   - App/Game type: App

2. [ ] Fill in App Details
   - Target audience: Parents, Adults 18+
   - Category: Social
   - Content rating: IARC form
   
3. [ ] Setup Internal Testing
   - [ ] Add test account emails
   - [ ] Generate internal test link
   - [ ] Share with testers
   - [ ] Collect feedback

4. [ ] Create First Release
   - [ ] Upload AAB file
   - [ ] Set version name: "1.0.0"
   - [ ] Add release notes:
     ```
     PeacePad is now available!
     
     Features:
     - Conch Mode: Fair turn-based conversations
     - Real-time messaging with AI tone analysis
     - Shared calendar and expense tracking
     - Find Support: Access DV resources
     - Privacy first: Encryption & privacy mode
     ```

---

## ⚠️ Phase 7: Internal Testing Track

### Upload & Test
1. [ ] Go to Testing → Internal Testing
2. [ ] Create new release
3. [ ] Upload app-release.aab
4. [ ] Review Play Store listing
5. [ ] Copy test link
6. [ ] Share with test accounts
7. [ ] Install via test link

### Testing Duration
- [ ] Minimum 2-3 days
- [ ] Minimum 5+ test devices if possible
- [ ] Check app health in Play Console
- [ ] Monitor crashes & ANRs
- [ ] Fix any issues found
- [ ] Increment versionCode & re-upload if needed

### Verify Before Production
- [ ] Zero crashes in 2+ days
- [ ] All features working
- [ ] No console errors
- [ ] Smooth performance
- [ ] App health: Green status

---

## ⚠️ Phase 8: Submit to Production

### Final Review
- [ ] All assets uploaded (icon, screenshots, graphics)
- [ ] App description complete & accurate
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Content rating completed
- [ ] App tested thoroughly
- [ ] No critical bugs
- [ ] Version numbers correct

### Submit for Review
1. [ ] Go to Release section
2. [ ] Create new release (or promote from Internal)
3. [ ] Upload AAB (if not promoted)
4. [ ] Add release notes
5. [ ] Review all information
6. [ ] Submit for review

### Expected Timeline
- Review time: 24-72 hours typically
- Google may request additional info
- You'll see status in Play Console
- Once approved, can choose rollout percentage

### Rollout Options
- [ ] 100% immediate (if confident)
- [ ] Staged rollout recommended:
  - Day 1: 10%
  - Day 2: 25%
  - Day 3: 50%
  - Day 4+: 100%

---

## 📊 Post-Launch Monitoring

### Week 1
- [ ] Monitor App Health dashboard
- [ ] Check crash rate (target: < 1%)
- [ ] Read user reviews
- [ ] Watch for 1-star reviews with feedback
- [ ] Be ready to patch critical issues
- [ ] Respond to user reviews

### Ongoing
- [ ] Monthly security updates
- [ ] Bug fixes as needed
- [ ] Feature updates every 1-2 months
- [ ] Keep Play Store listing updated
- [ ] Monitor user feedback
- [ ] Check analytics

---

## 🚨 Critical Do's & Don'ts

### DO
✅ Back up keystore (3+ locations)  
✅ Keep version codes sequential  
✅ Test thoroughly before release  
✅ Have privacy policy & terms ready  
✅ Use staged rollout for safety  
✅ Monitor app health after launch  
✅ Respond to user reviews  
✅ Keep documentation updated  

### DON'T
❌ Skip internal testing  
❌ Lose keystore file  
❌ Reuse version codes  
❌ Release without privacy policy  
❌ Release without testing on device  
❌ Skip Play Store policies review  
❌ Ignore crashes in app health  
❌ Release untested builds  

---

## 📋 File Tracking

### Core Files Updated
| File | Changes |
|------|---------|
| `server/index.ts` | Build mode detection + GC |
| `server/autoRecovery.ts` | HealthMonitor build mode |
| `server/testMonitor.ts` | Auto-truncates logs |
| `server/conchSessionCleanup.ts` | Extended intervals |
| `server/callCleanup.ts` | Extended intervals |
| `android/app/build.gradle` | Minification + signing |
| `android/app/src/main/AndroidManifest.xml` | All permissions |
| `android/app/src/main/res/values/strings.xml` | App metadata |

### New Documentation
- `APK_BUILD_GUIDE.md` - Complete build workflow
- `KEYSTORE_SETUP.md` - Keystore creation & management
- `VERSIONING_GUIDE.md` - Version management
- `PLAY_STORE_CHECKLIST.md` - This file
- `replit.md` - Updated architecture docs

---

## 🎯 Quick Start

### To Build AAB Right Now:
```bash
# 1. Setup keystore (FIRST TIME ONLY)
# See KEYSTORE_SETUP.md

# 2. Build with optimization
export BUILD_MODE=true
npm run build
cd android
./gradlew bundleRelease

# 3. Output AAB at:
# android/app/build/outputs/bundle/release/app-release.aab
```

### To Test on Device:
```bash
# 1. Build APK
cd android
./gradlew assembleRelease

# 2. Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# 3. Test all features
```

---

## Questions?

Refer to:
- `PLAY_STORE_BUILD.md` - Build workflow questions
- `KEYSTORE_SETUP.md` - Signing questions
- `VERSIONING_GUIDE.md` - Version questions
- `APK_BUILD_GUIDE.md` - Memory optimization questions
- `replit.md` - Architecture questions

---

## Status Summary

| Component | Status | Ready |
|-----------|--------|-------|
| Memory Optimization | ✅ Complete | Yes |
| Android Config | ✅ Complete | Yes |
| Permissions | ✅ Complete | Yes |
| Documentation | ✅ Complete | Yes |
| Keystore Setup | ⚠️ Manual | Need to do |
| Build & Test | ⚠️ Manual | Need to do |
| Play Store Assets | ⚠️ Manual | Need to do |
| Play Store Upload | ⚠️ Manual | Need to do |

**Next Step:** See Phase 3 above to get started!
