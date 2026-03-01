# iOS Info.plist Permission Strings for PeacePad

These permission descriptions must be added to your iOS `Info.plist` file after running `npx cap add ios`.
Apple reviewers read these — they must clearly explain WHY your app needs each permission.

## Required Permissions

### Camera
```xml
<key>NSCameraUsageDescription</key>
<string>PeacePad needs camera access to let you take photos of receipts for expense tracking and to share images with your co-parent.</string>
```

### Microphone
```xml
<key>NSMicrophoneUsageDescription</key>
<string>PeacePad needs microphone access to send voice messages to your co-parent and for audio during Conch Mode conversations.</string>
```

### Photo Library (Read Access)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>PeacePad needs photo library access to attach photos to messages and upload receipt images for shared expense tracking.</string>
```

### Photo Library (Save Access)
```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>PeacePad needs permission to save receipt images and shared photos to your photo library.</string>
```

### Location (for Find Support / resource directory)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>PeacePad uses your location to find nearby family support services and domestic violence resources in your area.</string>
```

## App Display Name

Add this to ensure the app shows the correct name under the icon on the home screen:
```xml
<key>CFBundleDisplayName</key>
<string>PeacePad</string>
```

Note: CFBundleDisplayName is what appears under the app icon. Keep it short ("PeacePad") since the full "PeacePad - Co-Parenting App" would be truncated on the home screen. The full name shows in the App Store listing.

## Push Notifications

Push notifications do NOT require an Info.plist permission string. Instead:
1. In Xcode, go to your app target > "Signing & Capabilities"
2. Click "+ Capability" and add "Push Notifications"
3. If you need background delivery, also add "Background Modes" and check "Remote notifications"

The `UIBackgroundModes` key with `remote-notification` is only needed if you process notifications in the background. For standard push notifications that show alerts, you do NOT need it.

## Optional (Future Features)

### Face ID (if adding biometric lock)
```xml
<key>NSFaceIDUsageDescription</key>
<string>PeacePad can use Face ID to protect your private messages and safety plan.</string>
```

## Important Notes for Apple Review
- Every permission must have a clear, user-facing reason tied to a specific feature
- Apple will REJECT apps with vague descriptions like "This app needs camera access"
- If a permission is requested but never triggered during the app review, Apple may reject
- Only include permissions you actually use — do not add "just in case" permissions
- If your app does NOT save photos (only reads them), do NOT include NSPhotoLibraryAddUsageDescription
