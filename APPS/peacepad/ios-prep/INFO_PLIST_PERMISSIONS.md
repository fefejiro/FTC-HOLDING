# iOS Info.plist Permission Strings for PeacePad

These permission descriptions are already present in `ios/App/App/Info.plist` as of the 2026-06-30 Windows verification. Apple reviewers read these strings, and each one must explain why the app needs the permission.

## Current Permissions

### Camera
```xml
<key>NSCameraUsageDescription</key>
<string>PeacePad needs camera access for video calls and for adding photos to shared conversations, profiles, and receipts.</string>
```

### Microphone
```xml
<key>NSMicrophoneUsageDescription</key>
<string>PeacePad needs microphone access for audio calls, video calls, voice notes, and guided conversation practice.</string>
```

### Photo Library Read Access
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>PeacePad needs photo library access so you can attach photos, upload profile images, and add receipt images for shared expense tracking.</string>
```

### Location When In Use
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>PeacePad uses your location to help find nearby family support services and resources when you ask for location-based results.</string>
```

## App Display Name

```xml
<key>CFBundleDisplayName</key>
<string>PeacePad</string>
```

Keep the home-screen display name short. The longer App Store name belongs in App Store Connect metadata.

## Push Notifications

Push notifications do not require an Info.plist usage string. Configure them in Xcode only if iOS push is enabled for the TestFlight build:

1. Open the app target in Xcode.
2. Go to `Signing & Capabilities`.
3. Add `Push Notifications`.
4. Add `Background Modes -> Remote notifications` only if the app processes notifications in the background.

## Do Not Add Unless Used

### Photo Library Save Access
```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>PeacePad needs permission to save receipt images and shared photos to your photo library.</string>
```

Only add this if the iOS app actually saves images to the user's library.

### Face ID
```xml
<key>NSFaceIDUsageDescription</key>
<string>PeacePad can use Face ID to protect your private messages and safety plan.</string>
```

Only add this if biometric lock is implemented.

## Apple Review Notes

- Every permission must have a clear, user-facing reason tied to a real feature.
- Avoid vague strings like "This app needs camera access".
- If a permission is requested but the feature is not discoverable during review, Apple may reject.
- Do not add permissions just in case.
