# PeacePad iOS Release Freeze

Last updated: 2026-07-23

## Current freeze state

PeacePad iOS version `1.0` has been submitted to Apple App Review using build `1.0.9 (1)`.

Until Apple completes review, this release is frozen.

## Do not change without explicit founder approval

- Do not upload a replacement build.
- Do not remove the app from review.
- Do not revoke or rotate signing certificates.
- Do not change the bundle identifier `ca.peacepad.family`.
- Do not change App Store screenshots, privacy answers, pricing, category, age rating, or review notes unless Apple requests a correction.
- Do not migrate the submitted app to React Native.
- Do not trigger Xcode Cloud or any cloud build for this submitted release.

## Allowed during freeze

- Monitor App Store Connect status.
- Monitor App Review messages.
- Keep TestFlight available.
- Verify public URLs and API health.
- Prepare response templates for Apple.
- Write docs, audit notes, PRDs, and backlog items.
- Research future architecture without touching the submitted build.

## Verified release facts

| Field | Value |
| --- | --- |
| App | PeacePad |
| Platform | iOS |
| App Store version | `1.0` |
| Submitted build | `1.0.9 (1)` |
| Bundle ID | `ca.peacepad.family` |
| Apple ID | `6793350735` |
| SKU | `PEACEPAD-IOS-001` |
| Team | Fejiro Technology Consultancy Inc. |
| Release method | Automatic release after approval |
| Price | Free |
| TestFlight public link | `https://testflight.apple.com/join/7anZvZXj` |
| Submission evidence | Apple email: "We've received your app for review." |

## Critical defect exception

Only break the freeze if one of these is verified:

- The app crashes on launch.
- Apple cannot access a required review path.
- Public API or website is down for a sustained period.
- Privacy disclosure is materially wrong.
- The submitted build exposes unsafe data.
- Apple explicitly asks for a metadata or binary correction.

If the freeze is broken, record:

1. Exact reason.
2. Evidence.
3. Owner approval.
4. Changed files or App Store fields.
5. New build/version, if uploaded.

