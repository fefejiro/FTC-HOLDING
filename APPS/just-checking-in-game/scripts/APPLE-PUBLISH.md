# Just Checking In iOS 1.1 release

This runbook separates an uploaded build from TestFlight, review, approval, and public App Store availability.

## Candidate

- Version: `1.1.0`
- Build: `3`
- Bundle: `com.ftcholding.justcheckingin`
- Existing public `1.0.0` remains untouched during review.

## Mac preflight

Run from the `APPS/just-checking-in-game` directory on the real Mac:

```bash
chmod +x scripts/*.sh
export JCI_APPLE_TEAM_ID='...'
export APPLE_ID='...'
export APPLE_APP_SPECIFIC_PASSWORD='...'
./scripts/publish-ios-testflight.sh
```

The wrapper fails closed unless macOS, Unity `6000.4.5f1`, Xcode, the exact version/build metadata, and all three credentials are available. It exports, archives, validates, and uploads the IPA. Secrets are never written to the log.

## Apple-side gates

1. Confirm the uploaded build is `1.1.0 (4)` in App Store Connect.
2. Complete truthful screenshots, metadata, privacy answers, age rating, review notes, and export compliance.
3. Select automatic release and submit for App Review.
4. Do not call the app public while it is only uploaded, in TestFlight, or Waiting for Review.
5. After Apple approval and release, verify the public listing shows `1.1.0` and install it on a clean physical iPhone.

If Apple reports an issue, fix only that issue and increment the build number for the next upload.
