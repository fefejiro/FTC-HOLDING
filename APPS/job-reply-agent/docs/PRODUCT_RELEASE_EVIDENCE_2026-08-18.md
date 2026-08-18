# UnaScout Store Release Evidence - 2026-08-18

## Release Identity

- Internal product: `JobAgent`
- Public brand: `UnaScout` by Una Labs
- Branch: `release/unascout-store-publish`
- Release commit: `e6fe31c63`
- Evidence head: `daec0390537d75b14b8a38a31889e9e3550dda43`
- Draft PR: `https://github.com/fefejiro/FTC-HOLDING/pull/257`
- Native application ID: `cloud.unalabs.jobagent`
- Native version: `1.0.1 (2)`
- Schema version: `011_revenue_launch`

## Completed And Locally Verified

- Replaced default Capacitor artwork with generated UnaScout icons and splash
  assets for PWA, Android, iOS, and store submission.
- Added the iOS privacy manifest, non-exempt-encryption declaration, and an
  iPhone-only v1 target.
- Kept native clients free of Stripe checkout and external purchase prompts.
- Added exact-domain association generation. Runtime association endpoints fail
  closed until `APPLE_APP_ID_PREFIX` and `PLAY_APP_SIGNING_SHA256` contain the
  identities issued by Apple and Google.
- Added complete English (U.S.) Apple and Google store metadata, ASO guidance,
  deterministic screenshot capture, and metadata validation.
- Updated iOS release automation to use Xcode 26 on `macos-26`, validate a
  JobAgent-specific provisioning profile, upload the IPA, and poll App Store
  Connect processing.
- Updated Android release automation to require JobAgent-specific signing
  secrets and record bundle and signer evidence.

## Verification Results

| Check | Result |
|---|---|
| TypeScript build | Passed |
| Lint | Passed |
| Application tests | `30` passed files, `1` skipped; `226` passed tests, `11` skipped |
| Store metadata and native contract check | Passed |
| Customer smoke | Passed at `390x844` and `1440x1000` |
| Store screenshots | 5 Apple images at `1290x2796`; 5 Google images at `1080x1920` |
| Google feature graphic | `1024x500` |
| Android debug build | Passed |
| Android signed release bundle | Passed |

The signed release bundle is:

`D:\FTC-HOLDING-worktrees\unascout-main-release\APPS\job-reply-agent\android\app\build\outputs\bundle\release\app-release.aab`

- Size: `3,250,977` bytes
- AAB SHA-256: `D2BFD88D7DF5A8D88130FE7349A6E8D30DC42FCE4487E045C7F625DACA22BAED`
- Upload signer SHA-256:
  `FF:B8:EE:4A:EA:C9:B1:CB:82:6D:FB:B1:0C:02:FD:35:3F:40:A2:CC:19:D5:F9:63:75:75:F8:06:7F:48:80:FD`
- Signing material remains outside Git in `D:\jobagent-release-secrets`.

## Remote CI Evidence

- JobAgent SaaS release gates:
  `https://github.com/fefejiro/FTC-HOLDING/actions/runs/32142960353`
- UnaScout Android release:
  `https://github.com/fefejiro/FTC-HOLDING/actions/runs/32142993982`
- Both runs completed successfully against evidence head `daec03905`.
- The SaaS run passed standalone install, dependency audit, build, lint, all
  application and billing tests, PostgreSQL isolation checks, browser smoke,
  strict configuration, secret scanning, immutable-image inspection, and a
  signed Android build.
- The dedicated Android run regenerated store screenshots, built and synced the
  release, imported the protected JobAgent key, signed the AAB, recorded its
  digest, and uploaded the artifact. Play upload was intentionally skipped.
- Remote AAB artifact ID: `9326695864`
- Remote AAB SHA-256:
  `714A82DDFDC3B993D2704BE5090111ECFCDCB4CE13BA1B56AB0079C786049107`
- Remote AAB signer SHA-256:
  `FF:B8:EE:4A:EA:C9:B1:CB:82:6D:FB:B1:0C:02:FD:35:3F:40:A2:CC:19:D5:F9:63:75:75:F8:06:7F:48:80:FD`

Final store screenshots were generated under:

`D:\FTC-HOLDING-temp\unascout-store-assets-final`

The Apple contact sheet and Google feature graphic were visually inspected. No
text clipping, incoherent overlap, blank screen, or placeholder Capacitor art
was present.

## External State

- App Store Connect is visibly authenticated to the Fejiro Technology
  Consultancy organization.
- No UnaScout App Store record, uploaded iOS build, TestFlight build, App Review
  submission, or public listing is yet evidenced.
- No UnaScout Play Console record or uploaded AAB is yet evidenced.
- The hosted Cloudflare edge remains separate from the unavailable JobAgent
  application origin. `/app`, `/healthz`, `/readyz`, and `/api/v1/release` must
  return the exact release before either native shell can be released safely.

## Required External Gates

1. Recover or replace the dedicated JobAgent Railway origin and verify the exact
   release SHA, schema, queues, database, storage, and backup behavior.
2. Create the Apple and Google app records, obtain their exact association and
   signing identities, deploy the association responses, and verify them live.
3. Produce the signed iOS archive with dedicated JobAgent credentials and upload
   it through the GitHub Actions macOS workflow.
4. Upload the signed AAB manually for the first Play release, complete policy
   declarations and testing requirements, and submit the eligible track.
5. Complete physical iPhone and Android launch, sign-in, deep-link, privacy,
   pause/export/delete, and purchase-boundary tests.

## Not Claimed

This evidence does not claim a live backend, TestFlight availability, Play
testing, store review, public store availability, active customer billing, or a
genuine paid transaction.
