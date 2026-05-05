# PeacePad Next Steps

## Right Now

1. Monitor Google Play review for production release `40 (1.0.8)`.
2. After approval, confirm the rollout is complete in Play Console.
3. Install the approved Play build on a device and verify:
   - onboarding
   - messaging tone analysis
   - Prep Chat draft-to-message flow
   - calendar display
   - partnership invite flow

## Short-Term

1. Refresh Play Store screenshots and feature graphic so they match the MVP refocus.
2. Confirm PostHog event flow in production:
   - `onboarding_completed`
   - `tone_analysis_shown`
   - `rewording_accepted`
   - `message_sent`
   - `prep_chat_started`
3. Review first production feedback for confusion around removed/deferred features.

## If Another Android Release Is Needed

1. Increase `versionCode` in `APPS/peacepad/android/app/build.gradle`
2. Rebuild:
   - `cd APPS/peacepad/android`
   - `./gradlew.bat bundleRelease`
3. Upload:
   - `APPS/peacepad/android/app/build/outputs/bundle/release/app-release.aab`

## Key References

- Current status:
  - `APPS/peacepad/STATUS_FOR_USER.md`
- Store listing copy:
  - `APPS/peacepad/docs/play-store-listing.md`
- Screenshot brief:
  - `APPS/peacepad/docs/play-store-screenshots-guide.md`
- Upload checklist:
  - `APPS/peacepad/play-store-assets/UPLOAD_GUIDE.md`
