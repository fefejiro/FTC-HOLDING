# Native Push Notifications Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for native Android and iOS push notifications in PeacePad.

## Overview

PeacePad uses Firebase Cloud Messaging (FCM) to send push notifications to native Android and iOS apps. The implementation is complete in `server/push-notifications.ts`, but requires Firebase Admin SDK installation and configuration.

## Prerequisites

1. Firebase project (create one at https://console.firebase.google.com/)
2. Firebase Admin SDK service account key (JSON file)
3. Package installation capability (npm install must work)

## Installation Steps

### Step 1: Install firebase-admin Package

Due to npm cache issues in the current environment, the `firebase-admin` package needs to be installed manually:

```bash
npm install --legacy-peer-deps firebase-admin
```

**Note:** If npm cache errors occur (Unknown system error -122), you may need to:
- Clear npm cache: `npm cache clean --force` (if permitted)
- Contact Replit support about filesystem errors
- Try installation from a different environment (local machine, CI/CD)

### Step 2: Create Firebase Service Account

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project (or create a new one)
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file (e.g., `peacepad-firebase-adminsdk.json`)

### Step 3: Add Service Account to Secrets

Add the Firebase service account as an environment secret:

1. In Replit, go to the **Secrets** tab (lock icon in sidebar)
2. Create a new secret:
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the **entire contents** of the service account JSON file

**Example JSON structure:**
```json
{
  "type": "service_account",
  "project_id": "peacepad-app",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@peacepad-app.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 4: Configure Firebase in Android/iOS Apps

#### Android (Capacitor)
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Ensure `android/app/build.gradle` includes:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

#### iOS (Capacitor)
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to your Xcode project
3. Enable Push Notifications in Xcode capabilities
4. Upload APNs certificate/key to Firebase Console

### Step 5: Verify Installation

1. Restart the Replit server
2. Check logs for Firebase initialization:
   ```
   Firebase Admin SDK initialized successfully
   ```

If you see this warning instead:
```
firebase-admin not installed. Native push notifications will not work.
```
Then the package installation failed (see Step 1).

If you see:
```
FIREBASE_SERVICE_ACCOUNT not set. Native push notifications disabled.
```
Then the secret is missing (see Step 3).

## Testing

1. Launch the native app (Android or iOS)
2. App will automatically register for push notifications
3. Device token will be saved to the database
4. Send a test notification:
   - Send a message in the app
   - Check server logs for: `Native push notification sent to android/ios device: [token]`

## Troubleshooting

### Package Installation Fails
- **Error:** `Unknown system error -122`
- **Solution:** This is a Replit filesystem/cache issue. Contact Replit support or try installing from a local environment.

### Firebase Not Initialized
- **Error:** `Firebase Admin not initialized. Skipping native push`
- **Solutions:**
  1. Check `FIREBASE_SERVICE_ACCOUNT` secret is set
  2. Verify JSON is valid (use https://jsonlint.com/)
  3. Check server logs for initialization errors

### Invalid Registration Token
- **Error:** `messaging/invalid-registration-token`
- **Solutions:**
  1. Ensure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) matches your Firebase project
  2. Verify the app is using the correct Firebase project
  3. Re-register the device token (uninstall/reinstall app)

### Token Not Registered
- **Error:** `messaging/registration-token-not-registered`
- **Solution:** The device token has expired or is invalid. The system will automatically remove it from the database.

## Implementation Details

### Code Structure

- **`server/push-notifications.ts`**: Main implementation
  - Initializes Firebase Admin SDK
  - Sends push notifications to web (Web Push API) and native (FCM)
  - Handles platform-specific configuration (Android/iOS)
  - Gracefully handles missing packages/configuration

### Message Format

#### Android
```typescript
{
  token: deviceToken,
  notification: { title, body },
  data: { ... },
  android: {
    priority: 'high',
    notification: {
      icon: 'notification_icon',
      color: '#7C3AED',  // PeacePad primary color
      sound: 'default'
    }
  }
}
```

#### iOS
```typescript
{
  token: deviceToken,
  notification: { title, body },
  data: { ... },
  apns: {
    payload: {
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1
      }
    }
  }
}
```

### Error Handling

The system automatically:
- Removes invalid/expired tokens from the database
- Logs errors for debugging
- Falls back gracefully when Firebase is not configured
- Continues web push notifications even if native push fails

## Production Checklist

- [ ] `firebase-admin` package installed
- [ ] `FIREBASE_SERVICE_ACCOUNT` secret configured
- [ ] Firebase project created and configured
- [ ] Android: `google-services.json` added to `android/app/`
- [ ] iOS: `GoogleService-Info.plist` added to Xcode project
- [ ] iOS: APNs certificate/key uploaded to Firebase
- [ ] Test notifications on Android device
- [ ] Test notifications on iOS device
- [ ] Monitor logs for errors

## Support

For Firebase-specific issues, see: https://firebase.google.com/docs/cloud-messaging/

For PeacePad-specific issues, contact: peacepad@peacepad.ca
