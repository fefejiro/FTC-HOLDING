# Quick Start: GitHub Actions Android Build

## TL;DR - 5 Steps to Automated Builds

### 1. Create GitHub Repo
```bash
# On GitHub.com, create new repo named "peacepad"
```

### 2. Push Code from Replit
```bash
git remote add origin https://github.com/YOUR_USERNAME/peacepad.git
git add .
git commit -m "Add GitHub Actions workflow"
git push -u origin main
```

### 3. Get Base64 Keystore
```bash
./encode-keystore.sh
# Copy the long output string
```

### 4. Add GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets → Actions → New secret**

Add these 4 secrets:

```
KEYSTORE_BASE64     → (paste base64 string from step 3)
KEYSTORE_PASSWORD   → Efiuvwere,1234
KEY_ALIAS           → peacepad
KEY_PASSWORD        → Efiuvwere,1234
```

### 5. Trigger Build

**Option A - Automatic:** Just push code
```bash
git push
```

**Option B - Manual:** 
- Go to **Actions** tab → **Build Android AAB** → **Run workflow**

---

## Download Your AAB

1. Go to **Actions** tab
2. Click latest successful run (green ✅)
3. Scroll to **Artifacts**
4. Download `peacepad-release-aab`
5. Extract zip → `app-release.aab`

---

## Upload to Play Store

1. [Google Play Console](https://play.google.com/console)
2. **Release → Production → Create new release**
3. Upload `app-release.aab`
4. **Review release → Start rollout**

Done! 🚀

---

**Full docs:** See `GITHUB_ACTIONS_BUILD.md`
