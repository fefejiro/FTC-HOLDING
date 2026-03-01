# iOS Build Steps for PeacePad

## Prerequisites
- Mac computer (or cloud Mac like MacInCloud/MacStadium)
- Xcode installed (latest stable version)
- Apple Developer account ($99/year) — only pay after confirming Xcode works
- Node.js installed on the Mac

## Step 1: Pull the Latest Code
```bash
git clone <your-repo-url> PeacePad
cd PeacePad
npm install
```

## Step 2: Add iOS Platform
```bash
npx cap add ios
```
This creates the `ios/` directory with the Xcode project.

## Step 3: Build the Web Assets
```bash
npm run build
```

## Step 4: Sync Web Assets to iOS
```bash
npx cap sync ios
```
This copies your built web app into the iOS project and installs native plugins.

## Step 5: Set App Display Name
Open `ios/App/App/Info.plist` in Xcode or a text editor.
Add or update the display name:
```xml
<key>CFBundleDisplayName</key>
<string>PeacePad</string>
```
This is what appears under the app icon on the home screen. Keep it short — the full "PeacePad - Co-Parenting App" title shows in the App Store listing.

## Step 6: Add Info.plist Permissions
Still in `ios/App/App/Info.plist`, add the permission strings from `ios-prep/INFO_PLIST_PERMISSIONS.md`.
Only add permissions your app actually uses.

## Step 7: Configure Signing
1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Select your Apple Developer team
5. Set Bundle Identifier to: `ca.peacepad.family`
6. Xcode will auto-create provisioning profiles

## Step 8: Set App Version
In Xcode, under the "General" tab:
- Version: `1.0.0`
- Build: `1`

## Step 9: Test on Simulator
1. Select an iPhone simulator (e.g., iPhone 15)
2. Press Cmd+R to build and run
3. Verify the app loads and connects to peacepad.ca

## Step 9: Test on Real Device
1. Connect your iPhone via USB
2. Trust the computer on the phone
3. Select your device in Xcode
4. Build and run

## Step 10: Archive for TestFlight
1. Select "Any iOS Device" as the build target
2. Go to Product > Archive
3. Once archived, click "Distribute App"
4. Select "App Store Connect"
5. Follow the upload wizard

## Step 11: TestFlight
1. Go to appstoreconnect.apple.com
2. Select PeacePad
3. Go to TestFlight tab
4. Add yourself as an internal tester
5. Install via TestFlight app on your iPhone

## Step 12: Submit for Review
1. In App Store Connect, go to the App Store tab
2. Fill in the metadata from `ios-prep/APP_STORE_METADATA.md`
3. Upload screenshots (at least iPhone 6.7" and 6.1" sizes)
4. Submit for review

## Common Issues

### "No signing certificate" error
- Go to Xcode > Settings > Accounts > Manage Certificates
- Click "+" to create a new Apple Distribution certificate

### App loads blank screen
- Check that `npx cap sync ios` was run after `npm run build`
- Verify the server URL in capacitor.config.ts points to peacepad.ca

### Push notifications not working
- Add "Push Notifications" capability in Xcode Signing & Capabilities
- Upload your APNs key to Firebase Console (for FCM integration)

### Apple rejects the app
- Most common: missing permission descriptions in Info.plist
- Second most common: app is "just a website" — make sure native features are visible
- Review the rejection reason carefully and address the specific issue
