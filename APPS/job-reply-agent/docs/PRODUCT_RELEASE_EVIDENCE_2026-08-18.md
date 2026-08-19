# UnaScout Store Release Evidence - 2026-08-18

## Release Identity

- Internal product: `JobAgent`
- Public brand: `UnaScout` by Una Labs
- Exact deployed commit: `22db89fb9a58bbb07e3be64919f08f9bd0b5c6d8`
- Current externally verified production commit: `22db89fb9a58bbb07e3be64919f08f9bd0b5c6d8`
- Latest tested native-artifact head: `b3a1077b2100774b9394f19dcf4f5cbfce7ded61`
- Native application ID: `cloud.unalabs.jobagent`
- Native version: `1.0.1 (2)`
- Schema version: `011_revenue_launch`

## Completed And Locally Verified

- Replaced default Capacitor artwork with generated UnaScout icons and splash
  assets for PWA, Android, iOS, and store submission.
- Added the iOS privacy manifest, non-exempt-encryption declaration, and an
  iPhone-only v1 target.
- Kept native clients free of Stripe checkout and external purchase prompts.
- Added exact-domain association generation. The Apple association endpoint is
  now live and verified at `200` with App ID prefix `G6UNC88GQ5`; Android
  Digital Asset Links remains fail-closed until Google Play App Signing issues
  the distribution certificate fingerprint.
- Added complete English (U.S.) Apple and Google store metadata, ASO guidance,
  deterministic screenshot capture, and metadata validation.
- Updated iOS release automation to use Xcode 26 on `macos-26`, validate a
  JobAgent-specific provisioning profile, upload the IPA, and poll App Store
  Connect processing.
- Updated Android release automation to require JobAgent-specific signing
  secrets and record bundle and signer evidence.
- Added a canonical UnaScout master logo and generated matching iOS, Android,
  PWA, Apple, and Google store assets from that single source.
- Promoted a PWA cache-key update so the manifest and service worker request
  the new icon immediately rather than waiting for the previous public cache
  entry to expire.

## Verification Results

| Check | Result |
|---|---|
| TypeScript build | Passed |
| Lint | Passed |
| Application tests | `31` passed files, `1` skipped; `230` passed tests, `11` skipped |
| Store metadata and native contract check | Passed |
| Customer smoke | Passed at `390x844` and `1440x1000` |
| Store screenshots | 5 Apple images at `1284x2778`; 5 Google images at `1080x1920` |
| Google feature graphic | `1024x500` |
| Android debug build | Passed |
| Android signed release bundle | Passed on `b3a1077b` |

The signed release bundle is:

`D:\FTC-HOLDING-worktrees\unascout-main-release\APPS\job-reply-agent\android\app\build\outputs\bundle\release\app-release.aab`

- Size: `3,841,088` bytes
- AAB SHA-256: `740B0DA0108A49680EBCD33DCCAF16AFE5AB30BD841FF1A92A1E22433F4A19E0`
- Upload signer SHA-256:
  `FF:B8:EE:4A:EA:C9:B1:CB:82:6D:FB:B1:0C:02:FD:35:3F:40:A2:CC:19:D5:F9:63:75:75:F8:06:7F:48:80:FD`
- Signing material remains outside Git in `D:\jobagent-release-secrets`.

## Remote CI Evidence

- JobAgent SaaS release gates:
  `https://github.com/fefejiro/FTC-HOLDING/actions/runs/32176635059`
- Both the SaaS gates and signed Android bundle completed successfully against
  `b3a1077b2100774b9394f19dcf4f5cbfce7ded61`.
- The SaaS run passed standalone install, dependency audit, build, lint, all
  application and billing tests, PostgreSQL isolation checks, browser smoke,
  strict configuration, secret scanning, immutable-image inspection, and a
  signed Android build.
- The dedicated Android run regenerated store screenshots, built and synced the
  release, imported the protected JobAgent key, signed the AAB, recorded its
  digest, and uploaded the artifact. Play upload was intentionally skipped.
- Remote AAB artifact:
  `unascout-android-b3a1077b2100774b9394f19dcf4f5cbfce7ded61`
- Remote AAB SHA-256:
  `740B0DA0108A49680EBCD33DCCAF16AFE5AB30BD841FF1A92A1E22433F4A19E0`
- Remote AAB signer SHA-256:
  `FF:B8:EE:4A:EA:C9:B1:CB:82:6D:FB:B1:0C:02:FD:35:3F:40:A2:CC:19:D5:F9:63:75:75:F8:06:7F:48:80:FD`
- Dedicated iOS signed archive workflow:
  `https://github.com/fefejiro/FTC-HOLDING/actions/runs/32176666950`
- The iOS workflow completed successfully from `b3a1077b` with App Store
  upload disabled.
  This proves the protected signing material and archive path, not an uploaded
  IPA, TestFlight build, App Review submission, or public availability.
- The exported IPA was retrieved from the workflow evidence and verified with
  SHA-256 `95EF5BA50344780AAD474EE10D3F991F805C345A8855825E2D603F10367E344D`.
  Its signed application identity is
  `G6UNC88GQ5.cloud.unalabs.jobagent`.

Final store screenshots were generated under:

`D:\FTC-HOLDING-temp\unascout-store-assets-final`

The Apple contact sheet and Google feature graphic were visually inspected. No
text clipping, incoherent overlap, blank screen, or placeholder Capacitor art
was present.

## External State

- Railway is authenticated to `Michael Fejiro's Projects` on the Hobby plan.
  Dedicated project `una-jobagent` has web, worker, migration, PostgreSQL,
  private storage, and backup resources online.
- `https://jobagent.unalabs.cloud/`, `/app`, `/healthz`, `/readyz`,
  `/api/v1/release`, `/api/v1/plans`, and `/edgez` return healthy production
  responses. The release endpoint identifies deployed commit
  `b3a1077b2100774b9394f19dcf4f5cbfce7ded61` and schema
  `011_revenue_launch`.
- The public landing page now exposes a canonical URL, Open Graph, Twitter
  card, and `SoftwareApplication` structured data. Production `robots.txt`
  and `sitemap.xml` both return `200`; the sitemap contains the public landing,
  privacy, terms, and support pages.
- A disposable owner-controlled tenant completed public registration, Mailjet
  verification, login, recommendation/analysis, approval, proof timeline, and
  interview-preparation smoke at both required viewports. Redacted screenshots
  are retained in `D:\FTC-HOLDING-releases\unascout\live-proof-c96c1115`.
- The deployed shared Worker returns healthy status and Mailjet delivery is
  proven. Stripe catalog and Checkout remain disabled until a permanent live
  restricted key replaces the unsuitable CLI session credential.
- App Store Connect is visibly authenticated to the Fejiro Efiuvwere Apple
  profile for Fejiro Technology Consultancy Inc. The UnaScout record exists as
  Apple ID `6802774371`, bundle ID `cloud.unalabs.jobagent`, SKU
  `unascout-ios-2026`, and version `1.0` in `Waiting for Review`.
- Apple screenshots, Productivity category, `4+` age rating, store metadata,
  App Privacy responses, reviewer access, pricing, and availability are
  complete and submitted.
- Apple Developer portal is authenticated to the same organization and confirms
  App ID prefix `G6UNC88GQ5`; `/.well-known/apple-app-site-association` now
  returns `200` with `G6UNC88GQ5.cloud.unalabs.jobagent`.
- UnaScout iOS build `1.0.1 (2)` is attached to version `1.0`; App Review
  submission is verified, but public listing availability is not yet evidenced.
- UnaScout Play Console record, signed AAB `1.0.1 (2)`, Production rollout,
  listing, policy declarations, and review submission are externally verified;
  public Play availability is not yet evidenced.
- The hosted origin reports the exact merged commit, so the native privacy and
  Gmail-boundary hardening are part of the deployed customer image.

## Required External Gates

1. Install the permanent Stripe live restricted key, bootstrap and verify the
   approved catalog, prove no-charge Checkout and portal creation, then complete
   webhook/entitlement/cancellation/refund evidence before enabling checkout.
2. Keep the exact runtime image in place; `b3a1077b` is deployed and its
   release gates passed before promotion.
3. Poll the submitted Google Play Production release until approval, obtain the
   Play App Signing fingerprint, deploy Android Digital Asset Links, and verify
   both the association document and public listing.
4. Poll the submitted Apple version until approval and verify automatic release
   plus the public App Store URL.
5. Preserve the signed AAB, Apple submission ID, Play review receipt, metadata,
   policy declarations, and screenshots as immutable release evidence.
6. Complete physical iPhone and Android launch, sign-in, deep-link, privacy,
   pause/export/delete, and purchase-boundary tests.

## Not Claimed

This evidence claims a live backend and responsive customer proof for the exact
deployed SHA stated above. It does not claim active customer billing, a genuine
paid transaction, TestFlight availability, Play testing, store review, or public
store availability.

## Store Submission Receipts

- UnaScout iOS `1.0` is submitted to Apple App Review and currently reports
  `Waiting for Review`. Apple submission ID:
  `0083ab51-caa4-43c4-97ba-06ed1bdfeac0`.
- UnaScout Android `1.0.1 (2)` is staged for a 100% Production rollout across
  177 countries/regions. Listing text and required artwork are saved. Google
  Play accepted 11 changes for review and now reports `Changes in review`.
  Public availability is not yet claimed.
- Just Checking In `1.0.0` remains `Waiting for Review` in App Store Connect.
- Portal screenshots are retained outside Git at
  `D:\FTC-HOLDING-releases\unascout\store-release-2026-08-18`.
