# Android Setup for PeacePad

This document provides step-by-step instructions for setting up the Android development environment for PeacePad.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Java Development Kit (JDK 11+)
- Android Studio installed
- Android SDK 30+ (installed via Android Studio)
- Git

## Installation Steps

### 1. Install Capacitor (Already Done)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/push-notifications
```

### 2. Initialize Capacitor
```bash
npx cap init PeacePad ca.peacepad.app
```

This creates:
- `capacitor.config.ts` - Capacitor configuration
- Capacitor plugin structure

### 3. Add Android Platform
```bash
npx cap add android
```

This creates:
- `android/` directory with Android project structure
- Gradle build configuration
- AndroidManifest.xml

### 4. Build Web App
```bash
npm run build
```

This generates:
- `dist/client/` - Frontend build (React/Vite)
- `dist/` - Backend assets

### 5. Sync Web Assets to Android
```bash
npx cap sync android
```

This copies:
- Web build to Android assets
- Capacitor plugins to Android project
- Configuration updates to AndroidManifest.xml

### 6. Open in Android Studio
```bash
cd android
open -a "Android Studio" .
```

Or open the `android/` directory in Android Studio manually.

## Building for Release

### Generate Signed AAB (Android App Bundle)
```bash
cd android
./gradlew bundleRelease
```

**Output**: `app/release/app-release.aab`

This is the file you upload to Google Play Console.

### Sign the APK (Development)
```bash
cd android
./gradlew assembleDebug
```

**Output**: `app/debug/app-debug.apk`

For testing on physical devices.

## Configuration Files

### capacitor.config.ts
Located at project root. Key settings:
```typescript
{
  appId: 'ca.peacepad.app',        // Android package name
  appName: 'PeacePad',              // App display name
  webDir: 'dist/client',            // Where web build goes
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
}
```

### android/app/build.gradle
Gradle configuration:
- App signing configuration
- Build types (debug/release)
- Dependencies
- Plugins

### android/app/src/main/AndroidManifest.xml
Android permissions:
- INTERNET (required for WebRTC)
- RECORD_AUDIO (for Conch Mode audio)
- CAMERA (for future video calls)
- ACCESS_FINE_LOCATION (for Find Support feature)
- NOTIFICATION (for push notifications)

## Development Workflow

### During Development
```bash
npm run dev      # Start dev server
npx cap sync     # Update Android assets periodically
```

### Before Releasing
```bash
npm run build              # Build optimized version
npx cap sync android       # Update Android with latest build
cd android
./gradlew bundleRelease   # Generate signed AAB
```

## Troubleshooting

### Gradle Sync Fails
```bash
cd android
./gradlew clean
./gradlew sync
```

### Android SDK Not Found
1. Open Android Studio
2. Tools → SDK Manager
3. Install latest SDK Platform
4. Install latest Build Tools

### WebRTC Audio Not Working
Check permissions in AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### APK Installation Fails
Ensure app is not already installed:
```bash
adb uninstall ca.peacepad.app
adb install app/debug/app-debug.apk
```

## Testing on Device

### Connect Physical Device
```bash
adb devices  # List connected devices
```

### Install Debug APK
```bash
cd android
./gradlew assembleDebug
adb install app/debug/app-debug.apk
```

### View Logs
```bash
adb logcat -s "Capacitor"
```

## Environment Setup

### macOS
```bash
# Install Java
brew install openjdk@11
export JAVA_HOME=/usr/local/opt/openjdk@11

# Install Android Studio
brew install android-studio

# Update Android SDK
open -a "Android Studio"
# Tools → SDK Manager → Install SDK 30+
```

### Linux
```bash
# Install Java
sudo apt-get install openjdk-11-jdk

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/openjdk-11-jdk
```

### Windows
1. Download Java from oracle.com
2. Download Android Studio from android.com/studio
3. Run installers
4. Set JAVA_HOME in Environment Variables

## Additional Resources

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Gradle Documentation](https://gradle.org/documentation/)

