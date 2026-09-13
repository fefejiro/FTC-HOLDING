# SayWetin iOS App Store handoff

**Date:** 2026-09-12
**Portfolio control:** `DOCS/FTC_DUAL_STORE_PARITY_PROGRAM_2026-09-12.md`
**Current status:** `source_ready`; no iOS build, upload, TestFlight release or public App Store listing is claimed.
**Canonical implementation:** `5877c8773`

## Reuse contract

| Item | Preserve and reuse |
| --- | --- |
| Product name | `SayWetin` |
| Android package | `com.saywetin.app` |
| iOS bundle ID | `com.saywetin.app` |
| EAS project | `@official_fejiro/saywetin-native` |
| API | `https://api.saywetin.app` |
| Web surface | `https://saywetin.app` |
| Android release lane | Existing local-credential Play workflow |

The iOS lane is an extension of the existing Expo project. It does not require
a second Expo account, EAS project, API, domain, backend, or product name. The
configured EAS project ID is already in `app.json` so a clean checkout does not
fall into `eas init`.

## Completed locally

- Added the existing iOS bundle ID and build number to `app.json`.
- Added the existing `expo-audio` microphone permission through Expo config.
- Added a `production-ios` profile using remote iOS credentials and the Xcode
  26 EAS image. The existing Android `production` profile remains unchanged.
- Routed native listen, lyrics and slang requests through the existing
  canonical API resolver.
- Confirmed the resolved iOS config retains the existing product, API and
  Android package identity.

## Read-only evidence

The following checks were run from the isolated release worktree:

```text
eas whoami                         existing FTC Expo account authenticated
eas project:info --non-interactive @official_fejiro/saywetin-native resolved
eas config --platform ios ...      production-ios resolved successfully
eas build:list --platform ios      [] (no iOS build exists yet)
```

No `eas init`, cloud build, submit, credential mutation, app-record mutation,
plan change or payment action was run. The EAS account's current billing plan
and remaining build allowance were not exposed by the local CLI, so they remain
an owner-console check before consuming a cloud build.

## Owner-console gate before a build

The account holder must confirm all of the following in the existing consoles:

1. The current Apple Developer membership and FTC team are active.
2. An exact SayWetin App Store Connect record is either present for
   `com.saywetin.app` or, after an exact search proves it absent, the owner
   explicitly approves creating that single missing store record. Do not create
   a duplicate record or identifier.
3. The existing Expo/EAS plan has approved build capacity without an upgrade or
   paid overage. If not, stop and use the existing Mac lane or wait for quota.
4. Privacy URL, support URL, age rating, content rights, screenshots and review
   notes are truthful and ready for the exact SayWetin record.
5. The existing Apple signing credentials are available to the approved EAS
   project. Do not create or copy credentials between products.

## Candidate build sequence

Run from a clean, reviewed source worktree only. The build command is intentionally
not automatic because it consumes provider capacity:

```powershell
cd "APPS/saywetin-native"
npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
eas project:info --non-interactive
eas config --platform ios --profile production-ios --json --non-interactive

# Run only after the owner-console gate above is confirmed.
eas build --platform ios --profile production-ios --non-interactive --no-wait
eas build:list --platform ios --limit 5 --json
```

The build output is a candidate, not public release proof. Install it on a real
iPhone, exercise Listen, recognition/result, audio permission denial/retry,
offline/error states and the production API round-trip, then save the build ID,
version/build number, artifact SHA-256 and device result without secrets.

## Submission sequence

Only after the candidate passes device QA and the exact App Store record is
visible, submit the existing build through the existing Apple path. Use the
approved EAS/ASC credentials already associated with this product; never accept
a prompt to create a new app, team, identifier or plan.

```powershell
eas submit --platform ios --profile production --latest --non-interactive
```

Pause immediately if EAS asks to create an app record, requests a plan upgrade,
cannot resolve the bundle ID, or reports missing Apple agreements/credentials.
Those are owner-console gates, not reasons to create parallel infrastructure.

## Completion proof

Mark SayWetin `public_live` only when all of these are saved:

- exact App Store Connect app ID and `com.saywetin.app` bundle ID;
- source commit, version/build and artifact SHA-256;
- EAS build/upload receipt and processing status;
- real iPhone install and core-flow result;
- Apple App Store public URL that resolves independently;
- public listing install/open proof and the corresponding evidence record.

An EAS upload, TestFlight invitation, review submission or “processed” build is
not public availability.
