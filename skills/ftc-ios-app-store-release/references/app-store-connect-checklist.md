# App Store Connect Checklist

Use this reference when an FTC/Una Labs iOS app is being prepared for TestFlight or public App Store submission.

## Required release facts

- App name
- Bundle ID
- SKU
- Apple ID, if already created
- Apple Developer team
- Build number and version
- Xcode archive path, if available
- App Store Connect state
- TestFlight state

## App Store Connect sequence

1. Create or open the app record.
2. Confirm bundle ID and SKU.
3. Upload a validated archive from Xcode Organizer or Transporter.
4. Wait for build processing.
5. Add the build to the app version.
6. Answer export compliance.
7. Add screenshots and metadata.
8. Set support URL, marketing URL, privacy policy URL.
9. Complete age rating.
10. Complete App Privacy and publish privacy responses.
11. Set price schedule and app availability.
12. Add review contact, notes, and demo account instructions.
13. Add for Review / Submit for Review.

## Common Apple blockers

- Expired payment card or membership billing warning.
- EU trader status required for EU distribution.
- Privacy Policy URL field shows stale validation even after a URL is visible.
- Public TestFlight link exists but Beta App Review is still pending.
- App Review can be submitted only after pricing, availability, privacy, screenshots, build, and app information are complete.

## Privacy wording pattern

For communication/family-support apps:

- Do not say the app collects no data if account, device, messages, media, or analytics are present.
- Do say data is used for App Functionality when it powers the core feature.
- Select Analytics only when product usage telemetry is actually collected.
- Select Product Personalization only when user content/preferences/location alter the experience.
- Select `No tracking` unless the app shares data with third parties for advertising or cross-app tracking.

## Handoff wording

Use exact state language:

- "Internal TestFlight install is available" means internal testers can install.
- "External TestFlight link is created" does not mean external users can install until Beta App Review approves it.
- "Submitted for App Review" does not mean public App Store availability.
- "Live" means Apple approved the app and it is available in selected storefronts.
