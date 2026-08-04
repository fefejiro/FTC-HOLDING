# PeacePad iOS 1.0.1 archive privacy inventory

Updated: 2026-08-04

Status: `AUTOMATED VERIFIED; ORGANIZER REPORT BLOCKED`

## Evidence identity

- source commit: `e513851363c2ae9fe903404c426774020a9af6a0`
- archive: `PeacePad-1.0.1-2.xcarchive`
- bundle identifier: `ca.peacepad.family`
- version/build: `1.0.1 (2)`
- Xcode: `26.5`
- archive signing: independently verified in the candidate gate

The inventory was read directly from the signed archive. It made no production
writes and did not export, upload, or submit a binary.

## Apple-supported report path

Apple documents the privacy report as an Xcode Organizer action: control-click
an archive and choose **Generate Privacy Report**. Xcode 26.5 exposes no
documented `xcodebuild` privacy-report command. The authenticated remote Mac did
not grant command-line UI automation access, so the official PDF remains a GUI
evidence gate. This document is a deterministic archive inventory; it is not
represented as Apple's PDF.

References:

- [Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)

## Embedded privacy manifests

The archived app contains exactly two `PrivacyInfo.xcprivacy` files:

1. `Frameworks/Capacitor.framework/PrivacyInfo.xcprivacy`
2. `Frameworks/Cordova.framework/PrivacyInfo.xcprivacy`

Both manifests declare:

```json
{
  "NSPrivacyCollectedDataTypes": [],
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyTracking": false,
  "NSPrivacyAccessedAPITypes": []
}
```

No app-level `PrivacyInfo.xcprivacy` exists at the archived app-bundle root.

## Embedded native frameworks

- `Capacitor.framework`
- `CapacitorApp.framework`
- `CapacitorPushNotifications.framework`
- `CapacitorStatusBar.framework`
- `Cordova.framework`

Only Capacitor and Cordova contribute a privacy manifest in this archive.

## Native permission purpose strings

The archived app declares purpose strings for:

- camera access for video calls and user-selected photos;
- microphone access for calls, voice notes, and guided practice;
- photo-library access for user-selected profile, conversation, and receipt
  images.

No location usage-description key was found in the archived `Info.plist`.

## Required-reason API heuristic

A read-only symbol and string scan covered the app executable and all five
embedded framework executables. It checked the current required-reason API
families for file timestamps, system boot time, disk space, active keyboards,
and user defaults. No matches were found.

This is a useful preflight signal, not an Apple validation and not a substitute
for the Organizer report or App Store Connect processing.

## Reconciliation result

| Check | Result |
| --- | --- |
| Archive manifests enumerated | AUTOMATED VERIFIED |
| Embedded SDK tracking declaration | None declared |
| Embedded SDK collected-data declaration | None declared |
| Embedded SDK required-reason API declaration | None declared |
| App-level manifest | Absent |
| Native permission strings | Camera, microphone, and photo library present |
| Required-reason API static preflight | No known-family matches; heuristic only |
| Official Organizer privacy-report PDF | BLOCKED after one controlled GUI retry |
| App Store Connect privacy answers | PARTIAL; worksheet exists but final answers require hosted-web/server reconciliation |

The empty embedded SDK declarations do **not** mean PeacePad collects no data.
The production Capacitor app loads `https://peacepad.ca`, and App Store Connect
answers must cover the hosted web client, server processing, optional features,
and third-party processors. The source-of-truth worksheet remains
`APP_PRIVACY_DECLARATION_WORKSHEET.md`.

Do not add an empty app-level manifest. If validated app data declarations or
required-reason API entries are added, the candidate must be rebuilt, archived,
and reverified as a new exact binary before upload.
