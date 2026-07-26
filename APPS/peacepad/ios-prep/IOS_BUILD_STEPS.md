# iOS Build Steps for PeacePad

## Prerequisites

- Mac computer, or a cloud Mac such as MacStadium or MacInCloud
- Xcode installed
- Node.js installed on the Mac
- Apple Developer Program membership when you are ready to upload to TestFlight

Apple currently lists Apple Developer Program membership as 99 USD per membership year, or local currency where available. Pay after confirming you can build the project in Xcode and sign in with the Apple Account you plan to use.

## Step 1: Pull the Latest Code

```bash
git clone <your-repo-url> PeacePad
cd PeacePad/APPS/peacepad
npm install
```

## Step 2: Confirm iOS Platform

The iOS platform has already been generated in this repo at `ios/`. Do not run `npx cap add ios` again unless you intentionally want to regenerate the native project.

If the `ios/` folder is missing on a fresh checkout, run:

```bash
npx cap add ios
```

## Step 3: Build and Sync iOS Assets

```bash
npm run ios:sync
```

This runs the web/API build, copies web assets into `ios/App/App/public`, writes `ios/App/App/capacitor.config.json`, and updates the native iOS project.

## Step 4: Open Xcode

```bash
npm run ios:open
```

Open the workspace, not only the project, if choosing manually:

```bash
ios/App/App.xcworkspace
```

## Step 5: Configure Signing

1. Select the `App` target.
2. Go to `Signing & Capabilities`.
3. Select the Apple Developer team.
4. Confirm bundle identifier: `ca.peacepad.family`.
5. Enable automatic signing unless the team requires manual profiles.

## Step 6: Confirm Display Name and Permissions

`ios/App/App/Info.plist` already includes:

- `CFBundleDisplayName`: `PeacePad`
- Camera usage description
- Microphone usage description
- Photo library read usage description
- Location when-in-use usage description

Use `ios-prep/INFO_PLIST_PERMISSIONS.md` as the reference if Xcode changes these values.

## Step 7: Capabilities

Add capabilities only when the build uses them:

- Push Notifications
- Background Modes -> Remote notifications, only if background notification handling is required

## Step 8: Set App Version

In Xcode, under the `General` tab:

- Version: `1.0.9` or the chosen App Store marketing version
- Build: increment for every TestFlight upload

## Step 9: Test on Simulator

1. Select a current iPhone simulator.
2. Press `Cmd+R` to build and run.
3. Verify the hosted production app loads from `https://peacepad.ca`.

Minimum simulator smoke:

- App launches without a blank screen.
- Guest compose path opens.
- Sign-in/sign-up path opens.
- The intervention-first compose flow works.
- Permission prompts are not shown on first launch unless a feature asks for them.

## Step 10: Test on Real Device

1. Connect an iPhone.
2. Trust the Mac on the phone.
3. Select the device in Xcode.
4. Build and run.

Minimum device smoke:

- Camera prompt appears only from camera/photo flows.
- Microphone prompt appears only from call, voice, or recording flows.
- Location prompt appears only from location/resource flows.
- Push notification prompt appears only after a user action asks for notifications.

## Step 11: Archive for TestFlight

1. Select `Any iOS Device`.
2. Go to `Product -> Archive`.
3. Open the Organizer after archive completes.
4. Select `Distribute App`.
5. Select `App Store Connect`.
6. Upload.

## Step 12: TestFlight

1. Go to App Store Connect.
2. Select PeacePad.
3. Go to the TestFlight tab.
4. Add internal testers.
5. Install through the TestFlight app on an iPhone.

## Step 13: App Store Review Prep

1. Fill metadata from `ios-prep/APP_STORE_METADATA.md`.
2. Complete privacy nutrition labels based on actual live data collection and use.
3. Upload required iPhone screenshots.
4. Answer the age-rating questionnaire based on the actual app behavior.

## Common Issues

### No signing certificate

- Go to `Xcode -> Settings -> Accounts -> Manage Certificates`.
- Click `+` to create a new Apple Development or Distribution certificate.

### App loads a blank screen

- Re-run `npm run ios:sync`.
- Confirm `ios/App/App/capacitor.config.json` points to `https://peacepad.ca` for production TestFlight.
- Check Safari Web Inspector or Xcode device logs.

### Push notifications do not work

- Add the Push Notifications capability in Xcode.
- Confirm APNs/Firebase setup for the iOS bundle ID.
- Verify the app asks for notification permission only from the intended user flow.

### Apple says the app looks like a website

- Show native/mobile-specific behavior in review notes where it exists.
- Make sure permission-gated features are discoverable but not forced on first launch.
- Make the guest compose flow and core co-parenting workflows easy to find.
