# PeacePad Versioning & Release Management

---

## Version Format

PeacePad uses **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
1.    0.     1
```

- **MAJOR**: Major features, breaking changes (rare)
- **MINOR**: New features, non-breaking improvements
- **PATCH**: Bug fixes, small improvements

**Examples:**
- `1.0.0` - Initial release
- `1.1.0` - New feature added
- `1.1.1` - Bug fix

---

## Version Code vs Version Name

### Version Name (Semantic)
- User-facing version
- Used in Play Store
- Format: `X.Y.Z`
- Examples: `1.0.0`, `1.1.0`, `1.1.1`

### Version Code (Android)
- Internal sequential number
- MUST increase by 1 for each release
- Cannot be decreased or reused
- Play Store uses this to determine "newest" version

**Important:** Both must increase together!

---

## Release Workflow

### 1. Plan Release
- Identify new features / bug fixes
- Decide MAJOR.MINOR.PATCH bump
- Create release notes

### 2. Update Version Numbers

#### In `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2          // Was 1, now 2 (increment by 1)
        versionName "1.1.0"    // Was 1.0.0, now 1.1.0
    }
}
```

#### In `package.json`:
```json
{
  "version": "1.1.0"
}
```

### 3. Build & Test
```bash
npm run build
cd android
./gradlew bundleRelease
```

### 4. Upload to Play Store
- Internal Testing track (test thoroughly first)
- Once verified, promote to Beta or Production

### 5. Tag Release in Git
```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## Version History Example

| Version | Date | versionCode | Changes |
|---------|------|-------------|---------|
| 1.0.0 | 2024-11-01 | 1 | Initial release |
| 1.0.1 | 2024-11-15 | 2 | Bug fix: QR code encoding |
| 1.1.0 | 2024-12-01 | 3 | Feature: Dark mode theme |
| 1.1.1 | 2024-12-10 | 4 | Bug fix: WebRTC connection |
| 1.2.0 | 2025-01-01 | 5 | Feature: Push notifications |

---

## Release Notes Template

### Version 1.1.0 (2024-12-01)

**What's New:**
- Dark mode theme support
- Improved Conch Mode UI
- Better notification handling

**Improvements:**
- Optimized call audio quality
- Faster message loading
- Better memory management

**Bug Fixes:**
- Fixed QR code scanning on some devices
- Fixed WebSocket reconnection issues
- Fixed crash on old Android devices

**Known Issues:**
- None at this time

---

## Pre-Release Checklist

Before bumping version and releasing:

### Code
- [ ] All new features tested
- [ ] No console errors/warnings
- [ ] Memory usage optimized
- [ ] Build completes without errors
- [ ] APK/AAB file size is acceptable

### Testing
- [ ] Tested on Android 8.0+ devices
- [ ] Tested on multiple screen sizes
- [ ] Authentication works
- [ ] All features functional
- [ ] No crashes observed

### Documentation
- [ ] Release notes written
- [ ] Version numbers updated
- [ ] Changelog updated
- [ ] README updated (if needed)

### Play Store
- [ ] Screenshots updated (if UI changed)
- [ ] App description up-to-date
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

---

## Internal Testing Track

Before public release, always test in Play Store's Internal Testing track:

1. **Build AAB**
```bash
cd android
./gradlew bundleRelease
```

2. **Upload to Play Console**
   - Go to "Testing" → "Internal Testing"
   - Create new release
   - Upload app-release.aab

3. **Add Test Accounts**
   - Users who should test the app

4. **Test Thoroughly**
   - Install from Play Store (via test link)
   - Use real Google Play Services
   - Test all major features
   - Check logs for errors

5. **Monitor Crashes**
   - Play Console → App Health → Crashes & ANRs
   - Fix any issues found
   - Re-release if needed

---

## Beta Track (Optional)

For larger features, use Beta before Production:

1. Copy from Internal Testing
2. Promote to Beta Testing
3. Wider test audience (controlled)
4. Collect feedback for 1-2 weeks
5. Monitor crashes & feedback
6. Once stable, promote to Production

---

## Production Release

### Rollout Strategy

**Option 1: Gradual Rollout (Recommended)**
- Day 1: 10% of users
- Day 2: 25% of users
- Day 3: 50% of users
- Day 4+: 100% of users
- Benefits: Catch issues with small user base first

**Option 2: Immediate Full Release**
- Release to 100% immediately
- Only if highly confident

### Monitor After Release
1. Check crashes in App Health
2. Monitor user reviews
3. Watch for 1-star reviews mentioning bugs
4. Have rollback plan ready (previous version)

---

## Quick Version Bump Script

Create `bump-version.sh`:

```bash
#!/bin/bash

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: bump-version.sh <versionCode> <versionName>"
  echo "Example: bump-version.sh 2 1.1.0"
  exit 1
fi

VERSIONCODE=$1
VERSIONNAME=$2

# Update build.gradle
sed -i "s/versionCode [0-9]*/versionCode $VERSIONCODE/" android/app/build.gradle
sed -i "s/versionName \"[^\"]*\"/versionName \"$VERSIONNAME\"/" android/app/build.gradle

# Update package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSIONNAME\"/" package.json

echo "✅ Version bumped to:"
echo "   versionCode: $VERSIONCODE"
echo "   versionName: $VERSIONNAME"
```

Usage:
```bash
chmod +x bump-version.sh
./bump-version.sh 2 1.1.0
```

---

## Important Rules

✅ **ALWAYS:**
- Increment versionCode by exactly 1
- Use semantic versioning for versionName
- Update both build.gradle and package.json
- Test on device before Play Store upload
- Keep old keystores (needed for versionCode continuity)
- Tag releases in Git

❌ **NEVER:**
- Decrease versionCode
- Reuse versionCode
- Release same versionCode twice
- Release same versionName with different code
- Change versionCode format

---

## Troubleshooting

### "Cannot upload - versionCode already exists"
- You already uploaded this versionCode
- Increment versionCode by 1

### "App crashes on Android 9 but works on 12"
- Use versionCode increment to release fix
- Don't skip versionCodes

### "Need to rollback release"
- Play Store → Release → Manage rollout
- Reduce rollout percentage or pause
- Cannot delete release, only pause/rollback
- Release older version with new versionCode

---

## Version Management Best Practices

1. **Keep Git history clean**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

2. **Maintain CHANGELOG.md**
   ```markdown
   ## [1.1.0] - 2024-12-01
   ### Added
   - Dark mode support
   
   ### Fixed
   - QR code encoding
   ```

3. **Document breaking changes**
   - If MAJOR version bump, explain what broke

4. **Release frequency**
   - Aim for releases every 2-4 weeks
   - Don't rush releases
   - Thorough testing > frequent releases

---

## Version Tracking

Keep `version-history.md`:

```markdown
# Version History

## Current
- versionCode: 5
- versionName: 1.2.0

## Previous Releases
- 1.1.1 (code 4) - 2024-12-10
- 1.1.0 (code 3) - 2024-12-01
- 1.0.1 (code 2) - 2024-11-15
- 1.0.0 (code 1) - 2024-11-01
```

---

## Next Release

**Planned Next Version: 1.1.0**
- Feature: Dark mode
- Bug fixes from 1.0.1
- Memory optimizations
- Target release: [DATE]
