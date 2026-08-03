# PeacePad iOS 1.0.1 candidate gate

Updated: 2026-08-03

## Candidate identity

- App Store version: `1.0.1`
- Build number: `2`
- Bundle identifier: `ca.peacepad.family`
- Source branch: `release/peacepad-ios-1.0.1-candidate`
- State: `prepared-not-submitted`

The npm package version remains an internal web-package identifier and is not
the iOS release identity. The iOS archive derives its public version and build
from the Xcode project settings verified by
`npm run verify:ios-release-candidate`.

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

- BLOCKED: Xcode archive and privacy report on the Mac
- BLOCKED: exact-build iPhone and iPad screenshots
- BLOCKED: controlled TestFlight device pass
- BLOCKED: App Privacy reconciliation against the exact archive
- BLOCKED: accessibility declaration backed by device evidence
- NOT AUTHORIZED: App Store version creation, binary upload, or submission

Do not move the package from `prepared-not-submitted` until every blocked gate
has current evidence from version `1.0.1` build `2`.
