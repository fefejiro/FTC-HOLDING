# PeacePad iOS 1.0.1 candidate gate

Updated: 2026-08-03

## Candidate identity

- Current public App Store version: `1.0` (live lookup verified 2026-08-03)
- App Store version: `1.0.1`
- Build number: `2`
- Bundle identifier: `ca.peacepad.family`
- Source branch: `release/peacepad-ios-1.0.1-candidate`
- State: `prepared-not-submitted`

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

Verified locally with Node.js 22.23.0:

- App Store metadata validator: PASS
- dependency threshold: PASS (`0` critical, `2` high, `9` moderate)
- tracked-source secret scan and self-test: PASS
- TypeScript: PASS
- Vitest: PASS (`41/41` files, `181/181` tests)
- coverage generation: PASS; baseline measured, not a readiness claim
- production web/API build: PASS WITH WARNINGS
- Capacitor plugin inventory: PASS
- bundle ID/version/build drift gate: PASS

The generated main JavaScript chunk remains above the soft target. This is a
recorded optimization defect, not a hidden hard-gate pass.

## Privacy-manifest boundary

The installed Capacitor iOS 7.6.2 SDK contains its required
`PrivacyInfo.xcprivacy` files. Apple requires Xcode to aggregate the privacy
manifests across the app and embedded SDKs. Do not add an empty app manifest or
copy App Store privacy answers into source without first generating the Xcode
privacy report from this exact candidate.

Before archive approval:

1. run Xcode's privacy report for the exact archive;
2. reconcile the report with the app's actual server-side collection and App
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

Remote SSH from the current Windows environment was attempted using public-key
authentication and was rejected by the Mac host. This is an access boundary,
not a candidate failure; no password was embedded in source or used by the
gate.

- BLOCKED: Xcode archive and privacy report on the Mac
- BLOCKED: exact-build iPhone and iPad screenshots
- BLOCKED: controlled TestFlight device pass
- BLOCKED: App Privacy reconciliation against the exact archive
- BLOCKED: accessibility declaration backed by device evidence
- NOT AUTHORIZED: App Store version creation, binary upload, or submission

Do not move the package from `prepared-not-submitted` until every blocked gate
has current evidence from version `1.0.1` build `2`.
