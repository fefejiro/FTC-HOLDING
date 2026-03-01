# GitHub Actions Automated Android Build

This guide explains how to set up automated Android AAB builds using GitHub Actions. **No local Android SDK installation required!**

## Overview

Every time you push code to GitHub, a workflow automatically:
1. ✅ Builds your web application
2. ✅ Syncs Capacitor with Android project
3. ✅ Compiles and signs the Android AAB
4. ✅ Makes the AAB available for download

---

## One-Time Setup

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `peacepad` (or whatever you prefer)
3. **Don't** initialize with README (we'll push existing code)

### Step 2: Push Your Code to GitHub

**On Replit:**

```bash
# Initialize git (if not already done)
git init

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/peacepad.git

# Add all files
git add .

# Commit
git commit -m "Initial commit with GitHub Actions workflow"

# Push to GitHub
git push -u origin main
```

**Note:** You may need to authenticate with GitHub. Use a [Personal Access Token](https://github.com/settings/tokens) as your password.

### Step 3: Encode Your Keystore

**On Replit, run:**

```bash
./encode-keystore.sh
```

This will output a long base64 string. **Copy it!**

### Step 4: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these **4 secrets**:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | The base64 string from Step 3 |
| `KEYSTORE_PASSWORD` | `Efiuvwere,1234` |
| `KEY_ALIAS` | `peacepad` |
| `KEY_PASSWORD` | `Efiuvwere,1234` |

**Important:** These values are encrypted and only accessible to GitHub Actions.

---

## How to Use

### Automatic Builds

Every time you push to the `main` branch, GitHub Actions automatically builds your AAB:

```bash
git add .
git commit -m "Update app"
git push
```

### Manual Builds

You can also trigger a build manually:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Build Android AAB** workflow
4. Click **Run workflow** → **Run workflow**

### Download the AAB

1. Go to **Actions** tab
2. Click on the latest successful workflow run (green checkmark ✅)
3. Scroll down to **Artifacts** section
4. Download `peacepad-release-aab`
5. Extract the zip to get `app-release.aab`

---

## Upload to Google Play Store

Once you have the AAB:

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create new app)
3. Go to **Release** → **Production** (or Testing)
4. Click **Create new release**
5. Upload `app-release.aab`
6. Fill in release notes
7. Click **Review release** → **Start rollout**

---

## Workflow File Explained

The workflow is located at `.github/workflows/build-android.yml`.

### Key Steps:

1. **Checkout code** - Gets your latest code
2. **Set up Node.js** - Installs Node.js 20
3. **Install dependencies** - Runs `npm ci`
4. **Build web app** - Runs `npm run build`
5. **Set up Java/Android SDK** - Installs build tools
6. **Decode keystore** - Converts base64 secret back to keystore file
7. **Create keystore.properties** - Configures signing
8. **Sync Capacitor** - Runs `npx cap sync android`
9. **Build AAB** - Runs `./gradlew bundleRelease`
10. **Upload artifact** - Makes AAB available for download

---

## Troubleshooting

### Build Fails

1. Check the **Actions** tab for error messages
2. Click on the failed workflow run
3. Expand the failed step to see detailed logs

### Common Issues

**"Keystore error"**
- Verify all 4 secrets are set correctly
- Re-run `encode-keystore.sh` and update `KEYSTORE_BASE64`

**"npm ci failed"**
- Check that `package.json` and `package-lock.json` are committed
- Try deleting and re-committing these files

**"Gradle build failed"**
- Check `android/app/build.gradle` is correct
- Verify `google-services.json` is in `android/app/`

### Need Help?

Check the workflow logs in the Actions tab for detailed error messages.

---

## Benefits of GitHub Actions

✅ **No local setup** - No need for Android Studio or SDK  
✅ **Consistent builds** - Same environment every time  
✅ **Automated** - Push code, get AAB automatically  
✅ **Free** - 2,000 minutes/month on free tier  
✅ **Fast** - Builds complete in 5-10 minutes  
✅ **Artifacts** - Keep builds for 30 days  

---

## Version Bumping

Before releasing a new version:

1. Edit `android/app/build.gradle`:
   ```gradle
   versionCode 2        // Increment this
   versionName "1.0.1"  // Update version string
   ```

2. Commit and push:
   ```bash
   git add android/app/build.gradle
   git commit -m "Bump version to 1.0.1"
   git push
   ```

3. GitHub Actions will build the new version automatically

---

## Security Notes

- ✅ Keystore is encrypted as a GitHub secret
- ✅ Passwords never appear in logs
- ✅ Only repository admins can access secrets
- ✅ Secrets are not exposed in public repositories
- ⚠️ Never commit keystore files to git
- ⚠️ Never hardcode passwords in workflow files

---

## Next Steps

Once you have your AAB:
1. Upload to Google Play Console
2. Complete store listing (screenshots, description, etc.)
3. Submit for review
4. Your app goes live! 🚀

**Questions?** Check the GitHub Actions logs for detailed build information.
