# Dispatch iOS App Store handoff

**Date:** 2026-09-12
**Portfolio control:** `DOCS/FTC_DUAL_STORE_PARITY_PROGRAM_2026-09-12.md`
**Current status:** `source_ready` for the iOS project; Android public listing confirmed; no iOS archive, upload, TestFlight release or public App Store listing is claimed.
**Canonical implementation:** `5877c8773`

## Reuse contract

| Item | Preserve and reuse |
| --- | --- |
| Product name | `Dispatch` |
| Android application ID | `ca.emergencyprompt.roadside` |
| iOS bundle ID | `ca.emergencyprompt.roadside` |
| Google Play listing | https://play.google.com/store/apps/details?id=ca.emergencyprompt.roadside |
| Public host | `https://dispatch.unalabs.cloud` |
| Private admin host | `https://dispatch-admin.unalabs.cloud` |
| Backend/data | Existing Railway, Supabase and Cloudflare path |
| Native lane | Existing FTC Mac/Xcode capacity used by the other iOS apps |

The iOS project is a Capacitor 7 extension of the existing Dispatch app. It
uses the same production host and app identity; it does not create a second
API, backend, domain, database, Apple account or product name. The tracked
Android keystore is not part of this lane and must not be copied or reused.

## Completed locally

- Added `@capacitor/ios` at the existing Capacitor 7 version.
- Generated `ios/` with the existing Dispatch bundle ID.
- Added production iOS sync/open scripts beside the existing Android scripts.
- Reused the existing Dispatch icon to populate the iOS app icon and splash
  assets; no new creative asset service was used.
- Added the location usage description required by the existing geolocation
  flow.
- Fixed release-blocking type checks without changing the Dispatch API
  contract. The operator map links now retain the selected region.

## Local evidence

Run from `APPS/dispatch` in the isolated release worktree:

```text
npm run check             PASS
npm run build             PASS
npm run cap:sync:ios:prod PASS
```

The sync completed after copying the production web bundle and native config.
Windows correctly reported that CocoaPods and `xcodebuild` are unavailable;
that is the handoff boundary to the existing Mac/Xcode runner, not a new
provider requirement.

## Public Android evidence

The exact existing package `ca.emergencyprompt.roadside` resolves to the public
[Dispatch Emergency Prompt Google Play listing](https://play.google.com/store/apps/details?id=ca.emergencyprompt.roadside)
under the FTC developer account. This confirms the Android store half without
creating a new package or Play record. The iOS half remains unlisted.

## Owner-console and review gates

Before any archive or store operation, confirm in the existing Apple/Google
consoles:

1. The FTC Apple team is active and `ca.emergencyprompt.roadside` is either an
   existing identifier for Dispatch or is explicitly approved as the one
   missing identifier to register. Never create a duplicate identifier.
2. The exact existing Dispatch App Store record is located, or the owner
   explicitly approves creating the one missing record after an exact search.
3. The existing Apple signing path and Mac/Xcode capacity are available without
   adding an account, paid CI service or plan upgrade.
4. Privacy URL, support URL, age rating, content rights, screenshots and review
   notes are truthful. Dispatch must demonstrate useful roadside assistance
   utility beyond a repackaged website under Apple guideline 4.2.
5. The existing Android package/Play listing is confirmed above. The source
   now targets API 36; complete the local/CI regression pass before any future
   Android upload and keep updates on this exact Play record.

## Existing Mac/Xcode lane

On the approved existing Mac runner:

```bash
cd "APPS/dispatch"
npm ci --ignore-scripts --workspaces=false
npm run cap:sync:ios:prod
cd ios
pod install
open App.xcworkspace
```

Use Xcode 26 or later with the existing FTC team. Select the existing product
identity, run a real-device smoke test and archive the Release configuration.
The archive/export must use the existing protected signing store; do not put
certificates, provisioning profiles or passwords in this repository.

The repository now contains `.github/workflows/dispatch-ios-release.yml`, which
mirrors the existing JCI/UnaScout `macos-26` release pattern. It is manually
gated with `inventory`, `preflight`, `archive` and `upload` modes. It reuses the existing
FTC team-level Apple certificate, team ID, keychain and App Store Connect API
key path already present for the other iOS lanes. Only a Dispatch-specific
provisioning profile is required because profiles are bundle-specific. The
upload mode accepts only an owner-supplied existing App Store ID and has no
record-creation or App Review-submission step. A new CI provider is not
required. The read-only inventory dispatch (run [34733647511](https://github.com/fefejiro/FTC-HOLDING/actions/runs/34733647511))
was rejected before any job step because GitHub reported the account locked for
a billing issue; no Apple lookup or store operation ran.

## Completion proof

Mark Dispatch `public_live` only when all of these are saved:

- exact App Store Connect app ID and `ca.emergencyprompt.roadside` bundle ID;
- source commit, version/build and archive/IPA SHA-256;
- Xcode/CI archive and upload receipt;
- real iPhone install and customer request-flow result;
- operator/admin boundary and private-host smoke result;
- Apple App Store public URL that resolves independently;
- public listing install/open proof and the corresponding evidence record.

An Xcode archive, TestFlight invitation, App Store Connect processing receipt,
or internal track is not public availability.
