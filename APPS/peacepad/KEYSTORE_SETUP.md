# PeacePad Android Keystore Setup Guide
## Creating & Managing Signing Keys for Play Store

---

## What is a Keystore?

A keystore is a file containing cryptographic keys used to sign your APK/AAB before uploading to Google Play Store. It proves that you (the developer) created the app and ensures future updates are from the same developer.

⚠️ **CRITICAL: Lose your keystore = cannot update the app on Play Store. Back it up safely.**

---

## Step 1: Create a Keystore (First Time Only)

### Using Android Studio (Recommended)

1. **Open Android Studio**
   - Menu → Build → Generate Signed Bundle/APK
   - Select AAB (for Play Store)
   - Click "Create new..."

2. **Fill in Details**
   - **Key store path**: Choose a safe location outside the project
     - Example: `~/peacepad/peacepad.keystore`
   - **Key store password**: Create a strong password
     - Min 6 characters
     - Use mix of uppercase, lowercase, numbers, symbols
   - **Key alias**: Name for this specific key
     - Example: `peacepad_key`
   - **Key password**: Same as keystore password or different (recommended: same)
   - **Validity**: 30+ years
   - **Common name**: Your name or "PeacePad Developer"
   - **Organizational unit**: Optional (e.g., "Development")
   - **Organization**: "PeacePad"
   - **Country**: Your country code (e.g., "CA" for Canada)

3. **Create the keystore**
   - Click "OK"
   - Android Studio creates the keystore file

---

### Using Command Line (Alternative)

```bash
keytool -genkey -v -keystore ~/peacepad/peacepad.keystore \
  -keyalg RSA -keysize 2048 \
  -validity 10950 \
  -alias peacepad_key
```

Then answer prompts:
```
Key store password: [create strong password]
Key password: [same or different]
First and last name: Your Name
Organization unit: Development
Organization: PeacePad
City: [Your City]
State: [Your State/Province]
Country code: CA
```

---

## Step 2: Store Credentials Securely

### Option 1: Gradle Properties (Recommended for Local Development)

Create `~/.gradle/gradle.properties` (global Gradle config):

```properties
PEACEPAD_KEYSTORE_PATH=/Users/yourname/peacepad/peacepad.keystore
PEACEPAD_KEYSTORE_PASSWORD=your_super_strong_password_here
PEACEPAD_KEY_ALIAS=peacepad_key
PEACEPAD_KEY_PASSWORD=same_password_here
```

**Security:**
- This file is in your home directory (not in git)
- Read-only: `chmod 600 ~/.gradle/gradle.properties`
- Never commit to version control

### Option 2: Environment Variables (CI/CD)

For automated builds (GitHub Actions, etc.):

```bash
export KEYSTORE_PATH="/path/to/peacepad.keystore"
export KEYSTORE_PASSWORD="your_password"
export KEY_ALIAS="peacepad_key"
export KEY_PASSWORD="your_password"
```

### Option 3: GitHub Secrets (For CI/CD)

If using GitHub Actions:

1. **Encode keystore as base64:**
```bash
base64 -i ~/peacepad/peacepad.keystore | pbcopy
```

2. **Add to GitHub Secrets:**
   - Go to Settings → Secrets → New repository secret
   - Name: `KEYSTORE_BASE64`
   - Value: [paste the base64 output]

3. **Also add:**
   - `KEYSTORE_PASSWORD`
   - `KEY_ALIAS`
   - `KEY_PASSWORD`

---

## Step 3: Update build.gradle

Edit `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile = file(System.getenv("KEYSTORE_PATH") ?: System.properties['PEACEPAD_KEYSTORE_PATH'])
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: System.properties['PEACEPAD_KEYSTORE_PASSWORD']
        keyAlias = System.getenv("KEY_ALIAS") ?: System.properties['PEACEPAD_KEY_ALIAS']
        keyPassword = System.getenv("KEY_PASSWORD") ?: System.properties['PEACEPAD_KEY_PASSWORD']
    }
    debug {
        storeFile file('debug.keystore')
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## Step 4: Backup Your Keystore

### Critical: Back It Up in Multiple Locations

```bash
# Create backups
cp ~/peacepad/peacepad.keystore ~/peacepad/peacepad.keystore.backup
cp ~/peacepad/peacepad.keystore /path/to/external/drive/
cp ~/peacepad/peacepad.keystore ~/cloud-drive/peacepad-secure/  # Google Drive, iCloud, etc.
```

### Store Password Securely

Use a password manager:
- **1Password**
- **Bitwarden**
- **KeePass**
- **LastPass**

Create entry with:
- **Title**: PeacePad Keystore
- **Keystore Path**: /Users/yourname/peacepad/peacepad.keystore
- **Keystore Password**: [your_password]
- **Key Alias**: peacepad_key
- **Key Password**: [your_password]
- **Backup Location**: [where you backed it up]

---

## Step 5: Verify Keystore

### List Keys in Keystore
```bash
keytool -list -v -keystore ~/peacepad/peacepad.keystore -alias peacepad_key
```

You should see:
```
Alias name: peacepad_key
Entry type: PrivateKeyEntry
Certificate fingerprint (SHA-256): XX:XX:XX:...
Owner: CN=Your Name, O=PeacePad, C=CA
...
```

---

## Step 6: Test Signing

### Build a Test Release APK

```bash
cd android
./gradlew assembleRelease
```

Check the APK is signed:
```bash
jarsigner -verify -verbose android/app/build/outputs/apk/release/app-release.apk

# Should show: jar verified.
```

---

## Step 7: Build for Play Store

### Build AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

Output location:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## If You Lose Your Keystore

**You CANNOT recover your app on Play Store with a new keystore.**

Your only options:
1. Unpublish current app
2. Change package name: `com.example.app2`
3. Release as completely new app

⚠️ **This is why backups are critical!**

---

## Keystore Checklist

- [ ] Keystore created and backed up
- [ ] Credentials stored in password manager
- [ ] Keystore backed up to external drive
- [ ] Keystore backed up to cloud storage
- [ ] build.gradle configured with signing
- [ ] Test build signed successfully
- [ ] AAB created and ready for Play Store

---

## Common Issues

### "Keystore was tampered with, or password was incorrect"
```bash
# Verify keystore integrity
keytool -list -keystore ~/peacepad/peacepad.keystore

# Check password is exactly correct (no extra spaces)
```

### "Signature version mismatch"
- Use consistent keystore between releases
- Never regenerate keystore
- Never change key alias

### "Certificate not yet valid" or "Certificate expired"
- Check system date/time
- Create new keystore with longer validity (10+ years)

---

## Best Practices

✅ **DO:**
- Create separate keystores for development and production
- Use strong passwords (20+ characters)
- Back up keystore in 3+ locations
- Store password in secure password manager
- Use production keystore only for release builds
- Keep keystore file permissions restricted

❌ **DON'T:**
- Commit keystore to git
- Share keystore with team (use CI/CD instead)
- Use weak passwords
- Store password in plain text files
- Lose keystore (unrecoverable!)
- Change passwords without documenting

---

## For Team Development

If multiple people need to build:

1. **Use CI/CD (Recommended)**
   - GitHub Actions, GitLab CI, etc.
   - Store keystore in CI/CD secrets
   - Only one person manages the keystore locally

2. **Share via Password Manager**
   - All team members have password manager account
   - Store keystore path, password, alias in shared vault
   - Only one copy of keystore file (on build machine)

3. **Never Share Keystore File Directly**
   - Don't email keystore
   - Don't commit to git
   - Don't share on Slack/Teams

---

## Recovery Procedures

### If Keystore File Is Corrupted
```bash
# Check integrity
keytool -list -keystore ~/peacepad/peacepad.keystore

# If error, restore from backup
cp ~/peacepad/peacepad.keystore.backup ~/peacepad/peacepad.keystore
```

### If Password Is Forgotten
- Check password manager
- If still lost: No recovery method
- Must create new keystore and release as new app

---

## Next Steps

1. ✅ Create keystore
2. ✅ Store credentials securely
3. ✅ Back up keystore (3+ locations)
4. ✅ Update build.gradle
5. ✅ Test signing process
6. ✅ Proceed to PLAY_STORE_BUILD.md

---

For more info: https://developer.android.com/studio/publish/app-signing
