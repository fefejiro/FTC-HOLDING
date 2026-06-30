# PeacePad iOS TestFlight Handoff - 2026-06-29

## Current State

- iOS platform has been generated at `ios/`.
- Bundle ID remains `ca.peacepad.family`.
- App name remains `PeacePad`.
- Production Capacitor server URL remains `https://peacepad.ca`.
- `@capacitor/ios` is installed and aligned with the resolved Capacitor core/android version.
- iOS permission strings have been added to `ios/App/App/Info.plist` for camera, microphone, photo library read access, and location.
- iOS app icon and launch image assets have been replaced with PeacePad-branded assets from the existing public icon.
- `npm run ios:sync` builds the web/API assets and syncs them into the iOS project.
- `npm run ios:open` opens the generated Xcode workspace on macOS.

## Verified On Windows

Re-verified on 2026-06-30 from `C:\FTC HOLDING\APPS\peacepad`.

```bash
npm run ios:sync
npm run check
npm ls @capacitor/core @capacitor/android @capacitor/ios @capacitor/cli --depth=0
npx cap doctor ios
```

Results:

- `npm run ios:sync` passed.
- `npm run check` passed.
- Capacitor resolved versions: core `7.5.0`, android `7.5.0`, ios `7.5.0`, cli `7.6.1`.
- `npx cap doctor ios` reaches the Capacitor environment check but exits on Windows because Xcode is not installed.
- Generated `ios/App/App/capacitor.config.json` points to production `https://peacepad.ca`, with app ID `ca.peacepad.family`.
- `ios/App/App/Info.plist` includes camera, microphone, photo library read, and location when-in-use permission strings.
- Bundle-size gate remains soft. Current main JS chunk is about `815.32 kB`, exceeding the local target by about `33.13 kB` without blocking the build.

Windows expected skips:

- CocoaPods install is skipped because CocoaPods is not installed on Windows.
- `xcodebuild` clean is skipped because Xcode is not available on Windows.

These are not blockers for repo preparation. They must be completed on macOS.

## Mac/Xcode Next Steps

1. Pull the latest repo on a Mac with Xcode installed.
2. From `APPS/peacepad`, install dependencies:

```bash
npm install
```

3. Rebuild and sync the iOS project:

```bash
npm run ios:sync
```

4. Open the workspace:

```bash
npm run ios:open
```

5. In Xcode, select the `App` target and configure signing:

- Team: the Apple Developer account team
- Bundle Identifier: `ca.peacepad.family`
- Signing: automatically manage signing

6. Add capabilities in Xcode if they are used for the TestFlight build:

- Push Notifications
- Background Modes -> Remote notifications, only if background notification handling is required

7. Confirm versioning in Xcode:

- Marketing Version: `1.0.9` or the chosen App Store version
- Build Number: increment for every TestFlight upload

8. Run on an iPhone simulator and on a real iPhone before archiving.

Minimum smoke:

- App launches without a blank screen.
- Hosted production URL `https://peacepad.ca` loads inside the app.
- Guest compose path opens.
- Sign-in/sign-up path opens.
- Push notification prompt is not shown until a user action asks for notifications.
- Camera/microphone prompts appear only from call or recording flows.
- Location prompt appears only from location/resource flows.
- Receipt/profile/photo picker flows still work.

9. Archive:

- Select `Any iOS Device`.
- Product -> Archive.
- Distribute App -> App Store Connect -> Upload.

10. In App Store Connect:

- Create the app with bundle ID `ca.peacepad.family`.
- Use metadata from `ios-prep/APP_STORE_METADATA.md`.
- Complete privacy nutrition labels based on actual PeacePad collection/use.
- Add screenshots for required iPhone sizes.
- Add internal TestFlight testers.

## Apple Developer Account Timing

Apple currently lists Apple Developer Program membership as 99 USD per membership year, or local currency where available. Complete paid enrollment when you are ready to upload TestFlight builds, and use the same Apple Account in Xcode and App Store Connect.

## Known Follow-Ups Before App Review

- Review app icon and launch image styling on a real iPhone and adjust if the brand team wants a more polished launch screen.
- Confirm APNs/Firebase native push setup for iOS.
- Confirm all App Store privacy labels match the live app behavior.
- Consider reducing the main web bundle size before wide beta. The current build passes, but the main chunk warning remains soft.
- Run an iPhone Safari or iOS simulator smoke for the intervention-first compose flow before TestFlight.
