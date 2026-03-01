# Google Play Store Deployment Guide for PeacePad

## Phase 1: Pre-Deployment Checklist ✅

### App Store Listing (Google Play Console)
- [x] App name: PeacePad
- [x] Short description: "Co-parenting communication platform for domestic abuse survivors"
- [x] Full description: Include Conch Mode feature, safety resources, tone analysis
- [x] Category: Lifestyle/Communication
- [x] Content rating: Complete the questionnaire (sensitive content notice for domestic violence discussions)
- [x] Privacy policy URL: GDPR-compliant privacy policy required
- [x] App icon: 512x512 PNG (vibrant, accessible design)
- [x] Feature graphics: 1024x500 PNG (show Conch Mode visual)
- [x] Screenshots: Minimum 2 (main features)
- [x] Promotional graphics: 180x120 PNG

### Safety & Compliance
- [x] Privacy policy posted (data collection, encryption, safety features)
- [x] Terms of service document
- [x] Safety resource links verified (Ontario 211, domestic violence support)
- [x] Age restriction: 18+ recommended (sensitive nature)
- [x] Encrypted safety plans (AES-256-GCM)
- [x] Automated email alerts for critical account activities

---

## Phase 2: Build Android App with Capacitor 🔨

### Step 1: Build the Web App
```bash
npm run build
```
This creates: `dist/` folder with both backend and frontend builds

### Step 2: Sync Capacitor with Android
```bash
npx cap sync android
```
This updates Android project with the latest web assets

### Step 3: Open Android Studio and Build
```bash
cd android
./gradlew bundleRelease
```

**Output**: `app/release/app-release.aab` (Android App Bundle for Play Store)

---

## Phase 3: Sign Your App 🔐

### Create/Obtain Signing Certificate
```bash
keytool -genkey -v -keystore peacepad-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias peacepad
```

**Important**: 
- Store keystore securely (backup copy in safe location)
- Note alias name & passwords for future updates
- Keep peacepad-release.keystore in a secure location

### Sign the AAB in Android Studio
1. Build → Generate Signed App Bundle/APK
2. Select Release build type
3. Choose your keystore (peacepad-release.keystore)
4. Upload signed AAB to Play Console

---

## Phase 4: Google Play Console Setup 📱

### Release Details
1. Go to Google Play Console → PeacePad app
2. Release → Closed testing (or Internal testing for 14-day window)
3. Upload signed AAB to "App bundles" section
4. Fill in release details:
   - **Release name**: "v1.0.0 - Conch Mode MVP"
   - **Release notes**: 
     ```
     Initial release - Conch Mode structured conversations, real-time messaging, 
     shared calendar & expenses, domestic violence support resources, 
     encrypted safety plans, and AI-powered tone analysis.
     
     Features:
     - Structured turn-based conversations with real-time audio
     - AI tone analysis to reduce tension
     - Shared custody calendar with conflict detection
     - Expense tracking and splitting
     - Child update tracking
     - Secure encrypted safety plans
     - Location-based support resources
     ```

### App Integrity
- [x] Complete "App Signing" setup (let Google manage signing)
- [x] Review integrity protection rules
- [x] Enable Google Play Integrity API

### Testing Track Selection
- **Internal testing** (recommended first): 100 testers max
- **Closed testing**: Up to unlimited testers
- **Open testing**: Public release

### Tester Management
1. Create Google Group for testers (e.g., peacepad-testers@googlegroups.com)
2. Add tester email addresses
3. Testers get link to install from Play Store

---

## Phase 5: Pre-Launch Checks 🧪

### Functional Testing
- [ ] Test on multiple Android devices (8.0+)
- [ ] Verify all Conch Mode features work
- [ ] Test WebRTC audio connectivity
- [ ] Confirm push notifications work
- [ ] Test safety plan encryption
- [ ] Verify offline functionality
- [ ] Check all links in safety resources section

### Performance Testing
- [ ] App launches in <5 seconds
- [ ] No crashes during normal use
- [ ] Battery/memory usage is reasonable
- [ ] Network handling works (WiFi & cellular)
- [ ] WebRTC connection stability

### Device Testing Checklist
- [ ] Android 8.0 (API 26)
- [ ] Android 10 (API 29)
- [ ] Android 12 (API 31)
- [ ] Android 13 (API 33)
- [ ] Android 14 (API 34)
- [ ] Various screen sizes (phone, tablet)

---

## Phase 6: Content Rating & Distribution 📊

### Content Rating Questionnaire
1. Navigate to Setup → App content
2. Complete questionnaire specifying:
   - Sensitive content: Co-parenting discussions, domestic violence resources
   - Data privacy: Explain AES-256-GCM encryption for sensitive data
   - Compliance: GDPR-compliant data handling
   - User-generated content: Yes (messages, notes)

### Distribution Settings
1. Target countries/regions (Canada first, then expand)
2. Set pricing (Free)
3. Manage content rating approvals

---

## Phase 7: 14-Day Testing Timeline

### Days 1-3: Critical Bug Triage
- Collect bug reports from internal testers
- Prioritize crashes and blocking issues
- Track WebRTC connection failures

### Days 4-7: First Iteration
- Fix critical bugs
- Gather UX feedback on Conch Mode
- Optimize performance based on metrics

### Days 8-11: Final Testing Round
- Regression testing
- Edge case testing
- Battery/memory optimization if needed

### Days 12-14: Final Preparations
- Document any remaining issues
- Prepare for wider release
- Finalize content rating

---

## Key Metrics to Monitor 📈

During testing, track these metrics in Google Play Console:

### Stability Metrics
- Crash rate (target: <0.5%)
- ANR rate (target: <0.1%)
- Session length (target: >5 min average)

### Adoption Metrics
- Install rate from testers
- Active testers (daily/weekly)
- Retention rate (day 3, day 7)

### Feature-Specific Metrics
- Conch Mode session initiation rate
- Audio connection success rate (WebRTC)
- Safety plan encryption/decryption time
- Push notification delivery rate

### User Feedback
- In-app rating
- Reviews and feedback
- Critical user comments

---

## Critical Files for Upload ✓

### Required Before Upload
- ✅ app-release.aab (signed Android App Bundle)
- ✅ Screenshots (2-5 minimum)
- ✅ App icon (512x512)
- ✅ Feature graphics (1024x500)

### Security & Legal
- ✅ Privacy policy URL
- ✅ Terms of service
- ✅ Signing certificate (backup copy)
- ✅ Keystore password (secure storage)

---

## Troubleshooting

### Common Issues

#### Build Fails with Gradle Error
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

#### Capacitor Not Syncing
```bash
npx cap sync android
npx cap update android
```

#### WebRTC Not Working in APK
- Verify TURN server configuration in capacitor.config.ts
- Ensure "ca.peacepad.app" package name matches Android manifest
- Check permissions in AndroidManifest.xml

#### Push Notifications Not Working
- Configure Firebase Cloud Messaging (FCM) credentials
- Verify google-services.json in android/app/ directory

---

## Next Steps

1. **Now**: Build web app
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Then**: Generate signed AAB
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

3. **Finally**: Upload to Google Play Console
   - Drag app-release.aab into console
   - Fill release details
   - Select internal testing track
   - Submit for review

Your app should be live for internal testing within 24 hours!

---

## Support Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle Format](https://developer.android.com/guide/app-bundle)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

