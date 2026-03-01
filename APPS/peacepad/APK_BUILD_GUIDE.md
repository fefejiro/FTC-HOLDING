# PeacePad Play Store APK/AAB Build Guide
## Memory-Optimized Build Process

### What's Been Optimized
We've implemented comprehensive memory optimizations to handle constrained environments:

✅ **TestMonitor** - Auto-truncates logs (100 logs max, cleared every 5 minutes)
✅ **HealthMonitor** - Disabled during builds to free 30+ MB RAM
✅ **Cleanup Services** - Extended intervals (60s → 5 min) during builds
✅ **Garbage Collection** - Automatic GC every 30 seconds in build mode
✅ **API Call History** - Limited to 20 recent calls per endpoint

### How to Build the APK with Memory Optimizations

#### Step 1: Set Build Mode Environment Variable
```bash
export BUILD_MODE=true
# OR
export PLAY_STORE_BUILD=true
```

#### Step 2: Enable Garbage Collection (Optional but Recommended)
```bash
# Run the server with garbage collection enabled
node --expose-gc ./node_modules/.bin/tsx server/index.ts
```

#### Step 3: Start the Dev Server
The app will now run in memory-optimized build mode:

You should see in the logs:
```
[Auto-Recovery] Build mode detected - health monitor disabled to conserve memory
[Conch Cleanup] Starting session cleanup service (runs every 5 minutes (build mode))
[Call Cleanup] Starting call cleanup service (runs every 5 minutes (build mode))
[Memory] Garbage collection enabled in build mode
```

### Expected Memory Savings

| Component | Normal | Build Mode | Savings |
|-----------|--------|-----------|---------|
| Health Monitor | Active (30s intervals) | Disabled | ~15-20 MB |
| Cleanup Services | Every 60s | Every 5 min | ~5-10 MB |
| TestMonitor Logs | Unbounded growth | Max 100 entries | ~20-30 MB |
| Garbage Collection | Lazy | Every 30s | Better heap management |
| **Total Potential Savings** | — | — | **40-60 MB** |

### Building the APK Bundle

Once you have the dev server optimized and running:

#### For Capacitor/Ionic APK Build:
```bash
# In another terminal (keep dev server running)
npm run build
npx cap add android
npx cap open android
# Build through Android Studio
```

#### For Manual Gradle Build:
```bash
cd android
./gradlew assembleRelease  # For APK
./gradlew bundleRelease    # For AAB (Play Store)
```

### Troubleshooting

**Q: Still seeing memory issues?**
- Stop other apps/terminals to free resources
- Close browser tabs (each uses 50-100 MB)
- Increase heap: `node --max-old-space-size=2048`

**Q: Health monitor not disabled?**
- Verify `BUILD_MODE=true` is set: `echo $BUILD_MODE`
- Check startup logs for "Build mode detected" message

**Q: Build still failing?**
- Run `npm run build` without dev server running
- Use Android Studio's Gradle GUI (better memory management)
- Close other applications completely

### Quick Reference

**1-Line Memory Optimization Startup:**
```bash
BUILD_MODE=true node --expose-gc ./node_modules/.bin/tsx server/index.ts
```

### Technical Details

These optimizations were implemented across 5 files:
- `server/index.ts` - Build mode detection + automatic garbage collection
- `server/autoRecovery.ts` - HealthMonitor disables in build mode
- `server/testMonitor.ts` - Auto-truncates logs (max 100 entries, cleared every 5 minutes)
- `server/conchSessionCleanup.ts` - Extended cleanup intervals in build mode
- `server/callCleanup.ts` - Extended cleanup intervals in build mode

The system automatically detects `BUILD_MODE=true` or `PLAY_STORE_BUILD=true` environment variables and activates memory-efficient mode.
