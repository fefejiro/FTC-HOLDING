# PeacePad iOS 1.0.1 candidate gate

Updated: 2026-08-04

## Candidate identity

- Current public App Store version: `1.0` (live lookup verified 2026-08-03)
- App Store version: `1.0.1`
- Build number: `2`
- Bundle identifier: `ca.peacepad.family`
- Source branch: `release/peacepad-ios-1.0.1-candidate`
- State: `signed-archive-verified-not-submitted`

The npm package version remains an internal web-package identifier and is not
the iOS release identity. The iOS archive derives its public version and build
from the Xcode project settings verified by
`npm run verify:ios-release-candidate`.

Apple's public lookup returns version `1.0` for App Store ID `6793350735` in
both Canada and the United States. The metadata validator therefore requires
the candidate target to compare newer than `1.0`; it will reject a target equal
to or below the current public version.

## Integrated local evidence

The candidate combines the App Store metadata package from draft PR #166 with
the dependency and CI hardening from draft PR #167. It does not include React
Native lab work or new product features.

Verified locally with Node.js 22.23.0, including the quiet first-run regression:

- App Store metadata validator: PASS
- dependency threshold: PASS (`0` critical, `2` high, `9` moderate)
- tracked-source secret scan and self-test: PASS
- TypeScript: PASS
- Vitest: PASS (`42/42` files, `185/185` tests)
- coverage generation: PASS; baseline measured, not a readiness claim
- production web/API build: PASS WITH WARNINGS
- Capacitor plugin inventory: PASS
- bundle ID/version/build drift gate: PASS

The generated main JavaScript chunk remains above the soft target. This is a
recorded optimization defect, not a hidden hard-gate pass.

The complete Mac gate was rerun on 2026-08-04 at exact commit
`e513851363c2ae9fe903404c426774020a9af6a0` with Xcode 26.5. The authenticated
macOS session produced and verified a signed App Store archive:

- archive identity: `1.0.1 (2)`
- bundle identifier: `ca.peacepad.family`
- signing team: `G6UNC88GQ5`
- distribution certificate: `Apple Distribution: Fejiro Technology Consultancy Inc (G6UNC88GQ5)`
- profile: `PeacePad App Store 2026`
- profile UUID: `c8078374-c73c-4a25-8dbb-f5699c0fc802`
- embedded SDK privacy manifests: `2`
- evidence directory: `.local/peacepad-ios-v101/e513851363c2`

The gate explicitly confirmed that no binary was exported, uploaded, or
submitted. A direct Cloudflare Pages preview then passed a synthetic browser
journey from welcome through required consent to compose with optional AI
processing off and no automatic What's New interruption. The verified two-file
frontend delta was promoted to the documented `ftc-holding` Pages production
project; live ownership verification identified asset
`/assets/index-DQd33p3p.js`.

The Capacitor production configuration intentionally loads
`https://peacepad.ca`. Therefore the installed binary's visible web interface
is controlled by the live Pages deployment, not solely by the packaged
`dist/public` directory. After the production promotion, the exact Release
simulator build was relaunched on iPhone 17 / iOS 26.5 and captured at the
compose screen without the stale 1.0.9 modal. This is a combined binary-shell
and live-web smoke, not proof that the packaged fallback client rendered.
The retained screenshot is
`.local/peacepad-ios-v101/e513851363c2/exact-build-live-web-after-fix.png`.

## Privacy-manifest boundary

The signed archive has now been inspected directly. It contains exactly two
`PrivacyInfo.xcprivacy` files, from Capacitor and Cordova. Both declare no
tracking, no tracking domains, no collected-data types, and no required-reason
APIs. No app-level manifest exists at the app-bundle root. The complete result
is recorded in `IOS_V101_ARCHIVE_PRIVACY_INVENTORY.md`.

Apple's supported report flow remains an Xcode Organizer context-menu action;
Xcode 26.5 exposes no documented `xcodebuild` equivalent. The remote Mac did not
grant command-line UI automation access, so the official PDF remains blocked.
The deterministic inventory must not be labelled as Apple's report.

Before archive approval:

1. generate Xcode's official privacy report for the exact archive when GUI
   access is available;
2. reconcile the archive inventory and report with actual hosted-web and
   server-side collection and App
   Store privacy answers;
3. add an app-level `PrivacyInfo.xcprivacy` only with validated data types and
   required-reason APIs;
4. confirm the manifest is included at the app-bundle root;
5. retain the report with the release evidence.

## Remaining release gates

Run the repeatable Mac gate from `APPS/peacepad`:

```bash
bash scripts/ios-v101-mac-gate.sh
```

That command runs the application verification suite, confirms a clean
Capacitor sync, checks the Release build settings, and produces an unsigned
Release simulator build. When the Apple signing account is available, run:

```bash
bash scripts/ios-v101-mac-gate.sh --archive
```

The archive option validates the archived app identity and prints the exact
Xcode Organizer privacy-report step. Neither mode exports, uploads, submits, or
changes App Store Connect. Evidence is written under the ignored
`.local/peacepad-ios-v101/<commit>` directory.

Public-key SSH access and the authenticated Mac desktop were both available for
the final gate. macOS keychain access was repaired without committing or
logging credentials. Command-line signing outside the GUI session remained
isolated, so the successful archive was produced from the authenticated visible
Terminal session and independently verified afterward.

- VERIFIED: signed Xcode archive on the Mac
- AUTOMATED VERIFIED: exact signed-archive privacy inventory, including all
  embedded manifests, native frameworks, and permission purpose strings
- BLOCKED: official Xcode Organizer privacy-report PDF; Apple documents a GUI
  action and the remote session denied command-line UI automation after one
  controlled retry
- PARTIAL: exact Release simulator build launched on iPhone 17 / iOS 26.5 and
  rendered the corrected live-web compose flow; one iPad Pro 13-inch / iOS 26.5
  attempt booted the device but timed out before producing a screenshot, so the
  complete iPhone/iPad set remains incomplete
- BLOCKED: controlled TestFlight device pass
- PARTIAL: App Privacy reconciliation; native archive inventory is verified,
  while hosted-web/server answers and the official Organizer PDF remain open
- BLOCKED: accessibility declaration backed by device evidence
- NOT AUTHORIZED: App Store version creation, binary upload, or submission

Do not export, upload, or submit this archive until every remaining blocked gate
has current evidence from version `1.0.1` build `2` and explicit release
authorization is given.
