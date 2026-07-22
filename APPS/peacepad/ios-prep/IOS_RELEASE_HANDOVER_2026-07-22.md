# PeacePad iOS Release Handover - 2026-07-22

## Purpose

This handover captures the actual PeacePad iOS release work completed during the MacInCloud/Xcode/App Store Connect session on July 21-22, 2026, plus the safest next developer path.

It is intentionally not a rewrite plan. PeacePad is still a React/Vite + Express app wrapped with Capacitor for iOS. Preserve that architecture for the next release pass unless a verified blocker proves otherwise.

## Current release state

| Area | Current state | Evidence / notes |
| --- | --- | --- |
| Repo architecture | Capacitor iOS remains the active path for the first iOS release. | `capacitor.config.ts` uses app ID `ca.peacepad.family`, app name `PeacePad`, web dir `dist/public`, and production server URL `https://peacepad.ca`. |
| Version | `1.0.9` in `package.json`. | Xcode archive screenshot also showed version `1.0.9` and build `1`. |
| iOS bundle ID | `ca.peacepad.family`. | Matches prior iOS prep docs and Capacitor config. |
| Apple Developer team | Fejiro Technology Consultancy Inc. | Confirmed in Apple Developer / Xcode account screens during the remote Mac session. Do not store Apple credentials in repo. |
| Simulator run | Verified successful. | Xcode ran `App` on an iPhone 17 Pro simulator. Console showed WebRTC heartbeat logs, meaning the wrapped app launched and JS executed. |
| Archive | Created locally on the MacInCloud machine. | Observed archive path pattern: `APPS/peacepad/ios/App/PeacePad3.xcarchive`; archive contained `Products/Applications/App.app`. |
| Archive validation | Validation succeeded. | Xcode Organizer showed `Validation succeeded` for `App`, version `1.0.9`, build `1`. |
| App Store Connect app record | App record existed. | App Store Connect showed a PeacePad app record with Apple ID `6793350735`, SKU `PEACEPAD-IOS-001`, and app category/info fields. |
| App Store Connect upload/TestFlight | Not fully verified in repo evidence. | Next developer must verify whether the validated archive was uploaded, processed, and attached to TestFlight/App Store review. Do not assume from local archive validation alone. |
| Public App Store availability | Not verified. | User later requested public availability, but this handover has no final proof that the app was submitted, approved, or live. |

## What changed during this release push

1. The iOS path was advanced from Windows-only preparation into a real macOS/Xcode flow.
2. The Apple Developer account was added to Xcode.
3. The app built and ran in the iOS simulator.
4. A local Xcode archive was produced.
5. Xcode Organizer validation succeeded for the archive.
6. App Store Connect was opened and the PeacePad app record was visible.
7. An FTC iOS App Store release skill/playbook was added at `skills/ftc-ios-app-store-release/SKILL.md` so future iOS releases can follow a cleaner checklist.
8. The repo was cleaned and committed locally after the session.

## Important distinction: validation is not availability

The last verified state is:

```text
simulator_ok + archive_validated + app_record_exists
```

That does not necessarily mean:

```text
build_uploaded
testflight_internal
testflight_external
submitted_for_review
live_on_app_store
```

The next developer should verify App Store Connect directly before doing more build work.

## Known account and access notes

- The enrolled Apple Developer account belongs to the organization account holder.
- The user also wants a separate personal Apple account to be able to test on iPhone.
- Do not ask the user to sign out of iCloud on the iPhone.
- If using internal TestFlight, the personal tester usually needs App Store Connect access as an internal tester.
- If using external TestFlight/public link, Apple Beta App Review may be required before public sharing works.
- Do not record Apple passwords, 2FA codes, MacInCloud passwords, `.p12` passwords, or recovery material in repo docs.

## Next developer checklist

### 1. Verify App Store Connect state first

Open App Store Connect and confirm:

- App: PeacePad
- Bundle ID: `ca.peacepad.family`
- SKU: `PEACEPAD-IOS-001`
- Apple ID: `6793350735`
- Team: Fejiro Technology Consultancy Inc.
- Latest build status for version `1.0.9` build `1`

Record the exact state as one of:

- `archive_validated_only`
- `build_uploaded_processing`
- `build_uploaded_complete`
- `testflight_internal_ready`
- `testflight_external_waiting_beta_review`
- `ready_for_app_review`
- `submitted_for_app_review`
- `live`

### 2. If the build was not uploaded, upload the validated archive

On the Mac:

1. Open Xcode Organizer.
2. Select the validated `App` archive.
3. Choose `Distribute App`.
4. Choose App Store Connect upload.
5. Preserve warnings/errors exactly.
6. Wait for processing in App Store Connect.

Do not trigger Xcode Cloud unless explicitly requested.

### 3. Configure TestFlight

For personal testing:

- Prefer internal TestFlight if the personal tester has accepted the App Store Connect invitation.
- If the user wants a shareable public link, create an external tester group and expect Apple Beta App Review.
- Add the processed build to the selected tester group.
- Confirm TestFlight status is active before telling the user to install.

### 4. Prepare public App Store submission

Before submitting for public review, verify and complete:

- Build selected for the app version.
- Export compliance answered truthfully.
- App Privacy completed truthfully.
- Privacy policy URL works.
- Terms/support URLs work.
- Screenshots uploaded for required device classes.
- Age rating completed.
- Review contact info completed.
- Demo/review notes explain the guest-first co-parenting flow.
- Pricing and availability configured.

Do not claim “we do not collect sensitive info” broadly without checking the App Privacy questionnaire categories. For App Store Connect, answer the narrow data-type questions based on actual app behavior and storage, not marketing language.

## App Privacy guidance for PeacePad

Use the narrowest truthful declarations.

Likely non-sensitive categories may include account/contact identifiers, user-generated messages/content, app diagnostics, product analytics, and support/contact data depending on current production behavior.

Do not select “Sensitive Info” unless the app actually collects Apple’s sensitive data categories beyond normal app communication/content handling.

Mark data as linked to the user if it is stored against an account, profile, device, session, or identifiable record.

Mark tracking as “No” unless PeacePad shares data across apps/sites for advertising or third-party tracking.

## Repo and contribution notes

- Local commits do not update GitHub contribution squares until pushed to GitHub and counted by GitHub’s contribution rules.
- The commit author email must be connected to the GitHub account.
- Contributions typically count on the default branch, `gh-pages`, or after a pull request is merged into a counted branch.
- Private-repo contribution visibility also depends on GitHub profile settings.

## Preserved repo docs to reuse

- `ios-prep/IOS_BUILD_STEPS.md`
- `ios-prep/TESTFLIGHT_HANDOFF_2026-06-29.md`
- `ios-prep/APP_STORE_METADATA.md`
- `ios-prep/INFO_PLIST_PERMISSIONS.md`
- `skills/ftc-ios-app-store-release/SKILL.md`

## Recommended next work order

1. Verify App Store Connect processing/build state.
2. If no processed build exists, upload the validated archive or create a fresh archive only if the old one is missing/invalid.
3. Get internal TestFlight install working on the user’s iPhone.
4. Only after TestFlight install works, create external testing/public link if requested.
5. Only after external testing and metadata are clean, submit for public App Store review.
6. After Apple approval, update repo docs with the exact live version, build, approval date, and TestFlight/App Store URLs.

## Stop conditions

Pause and ask the account holder to act if:

- Apple asks to accept a new legal agreement.
- Apple asks for billing, tax, or banking setup.
- Apple requires 2FA/password entry.
- The app record bundle ID/team does not match `ca.peacepad.family` / Fejiro Technology Consultancy Inc.
- Upload fails validation.
- App Store Connect requests a privacy answer that cannot be verified from the app/repo.
- A certificate must be revoked or replaced.
- Public App Review submission would be triggered before the user confirms.

