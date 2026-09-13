# FTC Dual-Store Parity Program

**Date:** 2026-09-12
**Goal owner:** FTC Holding / Manchi
**Working rule:** Reuse what already exists. Spend only with explicit approval.

## 1. Objective

Bring the FTC mobile product portfolio to truthful public availability on both:

- Google Play
- Apple App Store

This is a portfolio release program, not a request to rebuild every product or
open a collection of new accounts. The target is to close real platform gaps
using the source code, APIs, domains, store accounts, release credentials,
CI workflows and Mac/Xcode capacity that already exist.

## 2. Hard cost and duplication guardrails

The agent must follow these rules for the entire program:

1. Do not create a second Apple Developer account, Google Play developer
   account, Expo account, Railway account, Cloudflare account, GitHub account,
   database, API, domain, or paid automation service.
2. Do not create a duplicate App Store Connect app, Google Play app, bundle ID,
   Android package name, product name, or public listing when an existing record
   can be found and reused.
3. Do not run `eas init`, create a new EAS project, or create a new EAS
   organisation until the existing EAS project has been searched for and the
   owner has approved the exception.
4. Do not upgrade EAS, Railway, GitHub, Mac hosting, Cloudflare, API vendors or
   any other plan. Do not enable usage-based billing or overage billing.
5. Do not buy hardware, a Mac, a new certificate service, an additional CI
   provider, or a second backend merely to make the pipeline convenient.
6. Do not create a new API endpoint or backend service to solve a packaging
   problem. Reuse the current production API and custom domain for each app.
7. Before any action that may charge money, create an account, create a store
   record, upgrade a plan, or change a production billing setting: stop and
   report the exact action and expected cost. Continue only after explicit
   owner approval.
8. Never put Apple keys, Play service-account JSON, keystores, provisioning
   profiles, passwords, or tokens into source control or documentation.
9. Never copy signing material between products. Existing signing material
   must be located in the approved secret store or provider account.
10. A build, upload, TestFlight invitation, Play draft, or review submission is
    not public availability. Public completion requires a working public store
    listing and install/open proof.

## 3. Cost posture

The existing Apple Developer membership is the account-level prerequisite for
the current iOS apps. If it is active under the existing FTC organisation, this
program must use it; it must not create another membership. Apple currently
lists the Developer Program at 99 USD per membership year:

<https://developer.apple.com/programs/enroll/>

EAS has a free plan with limited monthly builds. The agent must check the
existing Expo account billing/plan before the first cloud build and use only
the existing free allowance or already-approved capacity. If the quota is
exhausted, wait or use the existing local/Mac lane; never upgrade automatically:

<https://expo.dev/pricing>
<https://docs.expo.dev/billing/faq/>

Dispatch already documents an active Railway Hobby service and existing
TomTom/Waze API usage. That is existing runtime burn, not permission to add
another service or provider. Keep the current service and API configuration;
only change it when a release blocker is proven.

### Read-only provider check on 2026-09-12

- The repository contains existing EAS and Google Play release references, but
  no provider billing data is stored locally.
- The available Chrome session opened the App Store Connect shell but did not
  expose the app/account dashboard.
- The available Chrome session redirected Google Play Console to a developer
  signup page.
- No account, app, plan, payment method or store record was created or changed.

Therefore, “no new account cost” is the controlling plan, but active membership,
current billing plan and account permissions remain **owner-console items to
verify** before a build or submission. The agent must not infer that a signup
page means the existing account is missing, and must not complete enrollment.

## 4. Audited starting point

### Workspace

- Canonical repository: `C:\FTC HOLDING`
- Current shared checkout is dirty with unrelated work; it must not be used
  for release builds or bulk commits.
- The audit found 49 dirty entries and approximately 2.6 GB free on C:.
- D: has approximately 75.7 GB free and may hold durable release artifacts and
  caches, subject to the workspace policy.
- Use a named clean release worktree for implementation. Preserve all
  unrelated changes.

### Product and identity matrix

| Product | Existing platform evidence | Existing identity to preserve | iOS/Android action | Initial status |
| --- | --- | --- | --- | --- |
| SayWetin | Expo/React Native Android app, EAS and Play workflow; live web/API | Android package `com.saywetin.app`; API `https://api.saywetin.app`; existing EAS project | Add iOS configuration to the same Expo project and use the existing product name. Create an App Store record only if an exact existing SayWetin record cannot be found. | Android public listing confirmed; iOS not public |
| Dispatch | Capacitor Android shell; live web/API | Capacitor/app identity `ca.emergencyprompt.roadside`; production host `https://dispatch.unalabs.cloud`; private admin host remains private | Add the iOS Capacitor platform using the same product identity, then use the existing Apple team. An iOS app record is required only because no public iOS listing was found. | Web and Android lane present; public store state needs direct verification; iOS missing |
| PeacePad | Existing Android and iOS native projects, App Store/Play metadata and iOS release workflows | Bundle/package `ca.peacepad.family`; existing public App Store record and Play listing | Reuse the existing production app record and iOS pipeline. Do not create a second “nextnative” store app; lab identifiers are test identities only. | Both public listings confirmed |
| Just Checking In | Existing Unity Android/iOS pipeline, Apple record and Play record | Apple App ID `6799443182`; Android package `com.ftcholding.justcheckingin` | Finish the existing records and workflows. Do not create another JCI app record. | Public App Store listing confirmed; Play record/draft is not public |
| UnaScout | Existing iOS release track and separate Android/reviewer history | Android package `cloud.unalabs.jobagent`; existing iOS record is documented in the canonical release worktree | Reconcile the existing iOS record and Android record. Do not confuse UnaScout evidence with Just Checking In evidence. | Public Google Play listing confirmed; iOS submission is documented as Waiting for Review; no public iOS listing found in the current search |
| Anion | Mobile scaffold only in the current portfolio | No proven production mobile store identity | Defer until a real mobile product flow exists. | Not first wave |
| JobAgent / ATEAM | Web and operations products | No current production mobile release requirement established | Do not force web products into app stores as wrappers. | Defer |

The portfolio handover explicitly distinguishes a release track from public
availability. That distinction remains mandatory for this program.

### Fresh public listing check on 2026-09-12

Confirmed public listings under **Fejiro Technology Consultancy Inc**:

- [PeacePad on the App Store](https://apps.apple.com/ca/app/peacepad/id6793350735)
- [PeacePad on Google Play](https://play.google.com/store/apps/details?id=ca.peacepad.family)
- [Just Checking In Game on the App Store](https://apps.apple.com/ca/app/just-checking-in-game/id6799443182)
- [SayWetin on Google Play](https://play.google.com/store/apps/details?hl=en_US&id=com.saywetin.app)
- [UnaScout on Google Play](https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent)

No public App Store result was found for SayWetin, Dispatch or UnaScout in the
current exact-name search. No public Dispatch listing was confirmed by the
current exact-package search. These are verification gaps, not permission to
create duplicate records. Check the existing consoles and account region
before creating anything.

### Implementation and provider audit update - 2026-09-12

The reuse-first implementation pass made local, non-billing changes only:

- **SayWetin:** the authenticated existing Expo account resolved the existing
  EAS project `@official_fejiro/saywetin-native`. `eas project:info` and the
  iOS `eas config` resolved successfully after linking the existing project ID
  in app configuration. The iOS build history is empty, which means no iOS
  candidate has been built or uploaded yet. `eas init`, `eas build`, `eas
  submit`, credential mutation and billing changes were not run.
- **SayWetin source readiness:** the existing Android package and production
  API remain unchanged. The same Expo project now has an iOS bundle ID, the
  existing `expo-audio` permission, a guarded Xcode 26 EAS profile and one
  canonical API resolver for native clients.
- **Dispatch:** the existing Capacitor 7 app now contains an iOS project with
  the existing identity `ca.emergencyprompt.roadside`, production host and
  reused Dispatch icon assets. Local TypeScript check, production web build
  and iOS Capacitor sync passed in the isolated worktree. The expected Windows
  warnings are that CocoaPods and `xcodebuild` are unavailable; archive,
  signing and device smoke must use the existing Mac/Xcode lane.
- **UnaScout:** the canonical release handoff records an uploaded iOS build in
  App Store Connect with state **Waiting for Review**, while independently
  resolving public evidence currently proves Android only. This remains
  `review_pending`, not `public_live`.
- **Just Checking In:** the existing App Store listing is public; the existing
  Play record remains a draft/not-public according to the release handoff. It
  must be completed in that record, not recreated.
- **Provider/cost boundary:** the available browser session did not expose
  active Apple/Play dashboards or EAS billing/quota data. No app, account,
  payment method, plan, credential, store record or submission changed during
  this pass. Cloud builds and store operations remain owner-console gates until
  existing capacity and the exact target record are confirmed.

The current implementation evidence is intentionally split between the
portfolio plan and the per-app handoffs:

- `APPS/saywetin-native/ops/IOS_APP_STORE_HANDOFF.md`
- `APPS/dispatch/DOCS/IOS_APP_STORE_HANDOFF.md`

## 5. Existing pipelines to reuse

### SayWetin

Reuse:

- Expo SDK 54 React Native app in `APPS/saywetin-native`
- Existing EAS project/account and Play submission workflow
- Existing `https://api.saywetin.app` backend
- Existing `https://saywetin.app` web surface
- Existing QA, unit, API, contract and Android Maestro coverage

Required preparation:

- Add `ios.bundleIdentifier` and a build number without changing the existing
  Android package.
- Configure the existing `expo-audio` permission through the app config.
- Make all native API clients use the existing canonical API resolver so the
  iOS binary does not fall back to the old Railway hostname.
- Add only the required iOS App Store metadata, privacy URL, support URL and
  screenshots.
- Use the existing EAS project. If the project link is missing in a clean
  worktree, locate it first; do not initialise a new project automatically.

The appropriate iOS builder is EAS. EAS supports iOS build and submission from
Windows/Linux, so a new Mac is not required for SayWetin:

<https://docs.expo.dev/submit/ios/>

### Dispatch

Reuse:

- Existing React/Vite web product
- Existing `https://dispatch.unalabs.cloud` production host
- Existing Railway backend, Supabase database and Cloudflare edge
- Existing Playwright smoke test
- Existing Capacitor Android project and release helper
- Existing FTC Mac/Xcode capacity used by the other iOS products

Required preparation:

- Add `@capacitor/ios` at the existing Capacitor 7 version.
- Generate and commit the iOS project in the Dispatch source worktree.
- Add a production iOS sync command alongside the existing Android command.
- Configure the same app identity `ca.emergencyprompt.roadside` unless the
  Apple account proves that identifier is already occupied by another product.
- Keep the admin host private and out of the public driver flow.
- Add meaningful app-level utility and native polish. A thin website wrapper can
  be rejected under Apple guideline 4.2.
- Do not reuse the tracked `android/peacepad-release.keystore`; treat the
  tracked Dispatch signing files as a security finding and use approved secret
  storage/Play App Signing instead.

Capacitor’s existing iOS workflow is the reference:

<https://capacitorjs.com/docs/v7/ios>

### PeacePad

Reuse the existing production iOS project, App Store record, Play listing,
metadata, privacy materials, TestFlight workflows and Mac/Xcode path. First
reconcile which PeacePad source worktree is the release source of truth. The
test bundle identifier `ca.peacepad.nextnative.lab` must not become a new public
store record.

Before any Android update, raise the relevant Capacitor Android lane from API
35 to API 36 and rerun device/regression gates.

### Just Checking In

Reuse the existing Unity 6000.4.5f1 project, Apple App Store record, App Store
Connect scripts, Android package, Play record and existing Mac/Xcode workflow.
The current handover says the Play draft is not public and still needs genuine
listing assets. Finish those existing tasks; do not make a second listing.

### UnaScout

Use the canonical UnaScout release worktree and current console records. Verify
the app name, iOS bundle ID, Android package, public URLs, reviewer credentials,
privacy URL and current review state before changing anything. The separate
UnaScout reviewer issue must not be mixed with JCI’s release record.

## 6. Store and platform gates to handle now

### Apple

As of 28 April 2026, App Store Connect uploads must be built with Xcode 26 or
later using the iOS 26 SDK:

<https://developer.apple.com/news/upcoming-requirements/>

The shared Mac/Xcode lane and the EAS image must be checked before any upload.
An app record must exist before a build is uploaded, and App Review remains a
separate Apple-controlled step:

<https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow>

Every app needs accurate privacy details, age rating, content rights,
screenshots, support URL, privacy URL and review notes. Do not fabricate
reviewer accounts, screenshots or data declarations.

### Google Play

Starting 31 August 2026, new apps and updates must target Android API 36 or
higher:

<https://developer.android.com/google/play/requirements/target-sdk>

The current Dispatch and PeacePad Capacitor variables target API 35, so they
need a controlled API 36 upgrade before their next Play update. JCI’s current
release evidence already targets API 36; verify rather than rebuild blindly.

Google also says Play package names must be registered by 30 September 2026.
Verify all existing FTC packages and developer identity in the existing Play
Console account before that date:

<https://support.google.com/googleplay/android-developer/answer/16984799?hl=en-GB>

## 7. Rollout phases

### Phase 0 — Read-only inventory and cost lock

- Confirm current Apple team, Play account, Expo account/project and existing
  Mac/Xcode route without creating anything.
- Confirm current plan/billing screens or provider evidence where available.
- Record existing app records, IDs, package names, bundle IDs, domains, APIs,
  workflow names and public links.
- Check Play package registration before 30 September 2026.
- Identify stale/duplicate candidates, especially PeacePad lab identities and
  the Dispatch signing files.
- Produce a GO/HOLD list. No build or upload until the matrix is complete.

### Phase 1 — Reuse-first implementation

- Create only the missing platform configuration inside the existing product
  source.
- Centralise API configuration only where current clients disagree; do not add
  an API or domain.
- Add required iOS native projects/configuration for SayWetin and Dispatch.
- Upgrade only the necessary Android target SDK files to API 36.
- Keep product names, logos, package identities and existing URLs.

### Phase 2 — QA and internal distribution

- Run each product’s existing unit, type, API, contract, E2E and device gates.
- Build one candidate per product/platform, not repeated speculative builds.
- Record source SHA, version/build, artifact SHA-256, builder, provider build ID
  and environment.
- Upload to existing TestFlight/internal Play tracks where appropriate.
- Install on a real device and verify the primary user flow and backend
  round-trip.

### Phase 3 — Store completion

- Complete missing store metadata using truthful product content.
- Provide real screenshots from the tested build.
- Provide reviewer credentials only through the store console when required;
  never put them in Git or this document.
- Present the evidence and any external submission risks to the owner before
  irreversible final App Review/production actions.
- Submit through the existing Apple/Google records only.
- Verify the public listing URL, install, launch and core flow after approval.

### Phase 4 — Portfolio closeout

- Update the store matrix with public links and release evidence.
- Update the Una Labs portfolio status so “release track” is not shown as
  “publicly available” without proof.
- Keep a release ledger for future updates.
- Mark each product `public_live` only after both stores are independently
  proven.

## 8. Definition of complete

For each in-scope product, completion means all of the following are true:

- Existing product identity and existing store record were reused where one
  existed.
- No unapproved account, service, API, domain or paid plan was created.
- The app builds from a clean, reproducible source worktree.
- The signed Android AAB and iOS IPA have recorded hashes and source SHAs.
- The binary installs on a real Android/iOS device.
- The primary user flow works against the existing production backend.
- Store privacy, support, age-rating, content-rights and review information are
  complete and truthful.
- Google Play listing is publicly reachable and installable.
- Apple App Store listing is publicly reachable and installable.
- Evidence is saved without secrets.

Allowed statuses:

`inventory` → `source_ready` → `internal_test` → `provider_accepted` →
`review_pending` → `public_live`

Never collapse these statuses into one vague “released” label.

## 9. Working files and evidence

Primary existing files:

- `APPS/saywetin-native/app.json`
- `APPS/saywetin-native/eas.json`
- `APPS/saywetin-native/src/api/config.ts`
- `APPS/dispatch/capacitor.config.ts`
- `APPS/dispatch/package.json`
- `APPS/dispatch/scripts/capacitor-build-release.mjs`
- `APPS/dispatch/DOCS/WORKFLOW.md`
- `APPS/peacepad/ios-prep/`
- `APPS/peacepad/ios/`
- `APPS/just-checking-in-game/scripts/`
- `APPS/una-labs-site/DOCS/UNALABS_VNEXT_HANDOVER.md`
- `APPS/saywetin-native/ops/IOS_APP_STORE_HANDOFF.md`
- `APPS/dispatch/DOCS/IOS_APP_STORE_HANDOFF.md`

The program may add a companion matrix or release ledger under `DOCS/`, but it
must not copy secrets into it.

## 10. Copy-paste goal prompt for the agent

Use the following as the standing implementation goal:

```text
GOAL: FTC DUAL-STORE PARITY — REUSE-FIRST, COST-CONTROLLED RELEASE

Bring the current FTC mobile products to truthful public availability on both
Google Play and Apple App Store. Work until the goal is complete or a concrete
external blocker requires owner input.

SCOPE
- First wave: SayWetin, Dispatch, PeacePad, Just Checking In and UnaScout.
- Defer Anion, JobAgent and ATEAM unless a real production mobile runtime and
  store intent are proven during inventory.

NON-NEGOTIABLE COST RULES
1. Reuse the existing Apple Developer team, Google Play developer account,
   Expo account/project, GitHub workflows, Railway services, Cloudflare hosts,
   APIs, domains, Mac/Xcode capacity and store records.
2. Do not create a new Apple/Google/Expo/Railway/Cloudflare/GitHub account.
3. Do not create duplicate app records, names, package IDs, bundle IDs, APIs,
   domains, databases or paid services.
4. Do not run `eas init` or create an EAS project until the existing project has
   been searched for and the owner approves a documented exception.
5. Do not upgrade a plan, trigger usage-based billing, buy hardware, buy a Mac,
   add a CI provider, add an API provider or create a backend service.
6. Before anything that can charge money, create an account/record, or alter a
   production billing setting, STOP and report the exact action and expected
   cost. Wait for explicit owner approval.
7. Never expose or commit tokens, Apple keys, Play JSON, keystores, profiles,
   passwords or reviewer credentials.

WORKSPACE SAFETY
- Treat `C:\FTC HOLDING` as a shared dirty checkout. Preserve unrelated work.
- Do not build or release from the dirty root.
- Use a named clean release worktree and keep large artifacts/caches off C:
  where practical.
- Do not bulk-stage, reset, clean or delete unrelated files.

INVENTORY FIRST — NO BUILD YET
- Confirm the exact source-of-truth worktree for each product.
- Read the actual package scripts and release workflows.
- Record app name, Android package, iOS bundle ID, Play app ID, App Store app
  ID, current version/build, API host, web host, privacy/support URLs, current
  track and public URL.
- Verify existing Apple team, Play account, Expo project, CI secrets by name
  only, Mac/Xcode runner and provider billing state without creating anything.
- Search for existing store records before creating any missing record.
- Produce an evidence-backed GO/HOLD matrix and identify duplicates/stale
  identities.

REUSE PLAN
- SayWetin: use the existing Expo SDK 54/EAS project and
  `https://api.saywetin.app`; add only missing iOS config, microphone permission,
  build number, metadata and API resolver hardening. Use EAS only within the
  existing approved billing capacity.
- Dispatch: use the existing Capacitor 7 app, `ca.emergencyprompt.roadside`,
  `https://dispatch.unalabs.cloud`, Railway, Supabase, Cloudflare and Playwright.
  Add `@capacitor/ios` and the iOS project; use the existing Mac/Xcode lane. Do
  not expose the private admin host. Do not copy the tracked Android keystore.
- PeacePad: reuse `ca.peacepad.family`, its existing App Store/Play records,
  iOS project, metadata and TestFlight workflow. Never turn a lab/test bundle
  ID into a second public app.
- Just Checking In: reuse the existing Unity, Apple record, Android package,
  Play record and Mac/Xcode pipeline. Keep JCI evidence separate from UnaScout.
- UnaScout: reconcile the existing iOS and Android records from the canonical
  worktree and consoles. Do not invent identifiers or use stale reviewer data.

CURRENT PLATFORM GATES
- Apple uploads must use Xcode 26+ and the iOS 26 SDK.
- Google Play new apps/updates must target Android API 36+.
- Register/verify all existing Play package names before 2026-09-30.
- Check Dispatch and PeacePad API/compile SDK values before their next Android
  upload.
- Treat Apple guideline 4.2 as a product-value gate for any Capacitor shell;
  do not submit a featureless website wrapper.

IMPLEMENTATION ORDER
1. Complete inventory, cost lock and matrix.
2. Prepare the missing iOS configuration in SayWetin and Dispatch.
3. Upgrade only required Android target SDK files and run regression tests.
4. Build one candidate per platform from clean source.
5. Test on real Android/iOS devices against the existing production APIs.
6. Upload to existing internal TestFlight/Play tracks and capture provider
   evidence.
7. Complete truthful store metadata and screenshots.
8. Before final irreversible public App Review/production actions, present the
   evidence, exact record, version/build and any cost risk for owner approval.
9. Submit only to existing records and verify public listings after approval.
10. Update the release ledger and portfolio status with public proof.

RELEASE EVIDENCE REQUIRED
- source worktree and commit SHA
- app name, package/bundle ID and existing store record ID
- version and build/version code
- artifact path, size and SHA-256
- build provider and build/upload ID
- internal test result and real-device smoke result
- API/web health result
- store track/review/public URL
- exact blocker or approval boundary, if any

SUCCESS CONDITION
Do not say “all apps are on both stores” until each in-scope product has a
working public Google Play listing and a working public Apple App Store listing,
with installation/open proof and a saved evidence record. “Uploaded”,
“TestFlight”, “draft”, “accepted by provider” or “release track” is not enough.
```

## 11. Owner approval boundaries

The agent may perform read-only audits, local code/documentation changes,
existing CI validation and non-billing tests within the scoped worktrees. The
agent must pause for owner direction when:

- a new account, store record, identifier or paid service appears necessary;
- a provider requires a plan upgrade or paid overage;
- an existing identifier is unavailable or appears to belong to another app;
- a production backend/API/domain change is required beyond the existing
  configuration;
- final irreversible public store submission requires a fresh business or
  legal decision;
- a provider rejects the binary or requests information not supported by
  truthful product evidence.

This document is the controlling plan for the dual-store goal. Implementation
notes and per-app evidence should link back here rather than create competing
release plans.
