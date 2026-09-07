# PeacePad iOS Review Recovery - 2026-07-25

## Final outcome - 2026-07-26

The focused recovery was completed and existing build `1.0.9 (1)` was
resubmitted successfully. App Store Connect displayed `Waiting for Review` for
both the submission and the app-version item.

Verified final state:

- production reviewer deployment: `SUCCESS`;
- final rotated reviewer login: `SUCCESS`;
- reviewer identity: synthetic user match;
- session cookies returned: `2`;
- sign-in required: enabled in App Review Information;
- review notes: saved;
- Resolution Center response: sent;
- release method: automatic after approval;
- replacement binary: not created;
- React Native lab: untouched.

Operational details and next-owner actions are recorded in
`../ios-prep/IOS_APP_REVIEW_HANDOVER_2026-07-26.md`.

## Decision and scope

Ship a focused privacy/review hardening update to the current React Web +
Capacitor product before making a React Native architecture decision.

In scope:

- one premium first-run welcome screen;
- explicit Terms and Privacy acknowledgment;
- separate optional, default-off AI consent;
- an isolated synthetic Apple reviewer account;
- privacy-policy and runtime privacy corrections;
- functional export and in-app account deletion;
- metadata, App Privacy, and App Review recovery work.

Out of scope:

- React Native migration or changes to `APPS/peacepad-next-native`;
- PR #148;
- production billing or IAP;
- premium evidence/legal modules;
- real court documents or real family data;
- a new App Store record;
- production bundle-ID changes.

Required identities:

```text
Current production app: ca.peacepad.family
React Native lab:        ca.peacepad.nextnative.lab
Submitted version/build: 1.0.9 (1)
```

## Status vocabulary

- **IMPLEMENTED**: source exists in the release worktree.
- **AUTOMATED VERIFIED**: relevant automated checks passed on the exact commit.
- **BROWSER VERIFIED**: current production-like browser evidence exists.
- **TESTFLIGHT VERIFIED**: current screenshot or recorded evidence exists from
  the submitted iOS build.
- **BLOCKED**: a named external dependency prevents the check.
- **NOT STARTED**: no implementation or evidence.

Do not treat source inspection as runtime proof and do not mark TestFlight work
complete using historical screenshots.

## Implementation status

| Area | Current status | Acceptance evidence required |
| --- | --- | --- |
| Premium first-run welcome | AUTOMATED VERIFIED in desktop Chromium and emulated iPhone SE Chromium; native/TestFlight proof pending | Fresh install shows it once; returning user and logout do not replay it; direct links still work |
| Consent separation | AUTOMATED VERIFIED | Welcome creates no session; Terms and Privacy are explicit; AI is separate/default-off |
| Server-side AI consent | AUTOMATED VERIFIED | Unit/API tests show each enabled external-AI route is consent-gated or release-disabled; rule-based preview still works |
| Reviewer-session endpoint | PRODUCTION VERIFIED | Final secret-backed credentials worked and returned the expected synthetic identity and session cookies |
| Synthetic reviewer account | PRODUCTION VERIFIED | Non-admin synthetic reviewer identity matched; no real family or court data was used |
| Public social login hidden | IMPLEMENTED in UI; deployment verification pending | No Google/Supabase/OIDC entry point is visible; legacy compatibility routes remain and must be checked against production configuration/network traffic |
| Versioned Privacy Policy | IMPLEMENTED; deployment verification pending | Public policy content and canonical URL match production behavior |
| Google Analytics disabled | AUTOMATED VERIFIED in source; production network verification pending | No loader, ID, cookie, request, or event |
| PostHog disabled | AUTOMATED VERIFIED in source; production network verification pending | Analytics adapter is a no-op; no request or event |
| Sensitive-content logging removed | AUTOMATED VERIFIED in release guard; production log verification pending | Logs contain no message body, transcript, call-session credential, access token, invite code, precise location, or family detail |
| Generic notifications | IMPLEMENTED; device verification pending | No notification preview contains message text |
| IP-location fallback removed | AUTOMATED VERIFIED in source; production route/network verification pending | No IP geolocation request; location comes only from a user feature |
| In-app account deletion | AUTOMATED VERIFIED by safety and contract tests; runtime verification pending | Disposable synthetic account is deleted immediately, files removed, sessions invalidated |
| Public deletion instructions | IMPLEMENTED; production verification pending | Public copy points to the actual in-app path and never calls deactivation deletion |
| App Privacy answers | NOT STARTED in App Store Connect | Completed worksheet reconciled with exact binary and production network evidence |
| App Review credentials/notes | SUBMITTED | Sign-in required, final reviewer credentials, notes, and Resolution Center response were saved; status is Waiting for Review |

## Automated verification

Run from `APPS/peacepad` on the release branch:

```bash
npm run check
npm test
npm run guard:openai-secrets:all
npm run build
```

Run focused browser coverage after the build:

```bash
npx playwright test tests/e2e/p1-critical/welcome-consent.spec.ts --project=p1-critical-chromium
```

Also run the existing guest/compose coverage that proves:

- no-auth and guest-first behavior;
- alternate intervention paths, not only one happy path;
- Privacy, Terms, Support, deletion, invitation, and direct compose links;
- AI opt-in and opt-out;
- permission denial.

### Current local evidence

```text
Typecheck: PASS
Unit/API tests: PASS - 40 files, 179 tests
Focused review/privacy tests: PASS - 64 tests
Upload ownership/privacy regression: PASS - 13 tests
Secret scan: PASS
Production build: PASS
Current public URL reachability: PASS - Privacy, Terms, Support, and Help return
  HTTP 200; corrected release copy is not deployed yet
Desktop Chromium welcome/consent: PASS - 2 tests
Emulated iPhone SE Chromium welcome/consent: PASS
Emulated iPhone SE Chromium account access: PASS against the static production build
In-app browser: BLOCKED by the browser-connection capability in this session
Native iOS simulator/TestFlight: NOT RUN in this Windows-only pass
Capacitor config/plugins: PARTIAL PASS - iOS plugins detected; `cap doctor`
  also reports an unrelated missing Android generated-assets directory
```

The local Vite development process terminated with `ECONNRESET` after several
page loads on Node 24.13.1. The same missing iPhone account-access scenario
passed against the static production build, so this is recorded as local dev
server instability rather than an application assertion failure. None of the
Chromium checks are represented as native simulator or TestFlight evidence.

Known non-blocking build observations:

- the main JavaScript chunk is 822.26 kB, 40.08 kB over the current soft bundle
  target;
- Vite reports existing dynamic/static import and large-chunk warnings;
- Xcode's privacy report and any `PrivacyInfo.xcprivacy` decision remain Mac-only
  release gates;
- the shared Windows dependency cache does not exactly match the app lockfile,
  so the release Mac must install from the committed lockfile before native
  verification.

## Current completion estimate

| Recovery area | Estimate | Remaining proof |
| --- | ---: | --- |
| Premium welcome and returning-user routing | 95% | Native fresh-install and logout check |
| Consent and AI enforcement | 92% | Production network/log check |
| Reviewer account code path | 100% | Deployed credential and session verified |
| Privacy/runtime hardening | 90% | Production traffic and processor verification |
| Export and deletion | 85% | Disposable deployed-account end-to-end pass |
| Automated verification | 95% | Record final exact-commit rerun |
| App Store Connect recovery | 100% for Guideline 2.1 | Await Apple review |
| Overall review recovery | 95% | Apple approval and public-release verification are external pending steps |

Record results against an exact commit:

```text
Commit tested: <FULL_GIT_SHA>
Typecheck: <PASS/FAIL>
Unit/API tests: <PASS/FAIL and counts>
Browser tests: <PASS/FAIL and counts>
Secret scan: <PASS/FAIL>
Production build: <PASS/FAIL>
```

## Production and reviewer-account gate

- [x] Deploy the verified reviewer recovery.
- [ ] Confirm `https://peacepad.ca/health` and API health return current healthy
      responses.
- [x] Configure reviewer login only through deployment secrets.
- [ ] Keep the raw password out of source, logs, screenshots, shell history, and
      test artifacts.
- [x] Enter the raw password only in App Store Connect's protected reviewer
      credential field.
- [x] Verify valid login from a clean session.
- [ ] Verify invalid credentials and rate limiting.
- [x] Verify reviewer account is non-admin and contains synthetic data only.
- [ ] Verify no public social-login entry point is visible.
- [ ] Verify legacy Supabase/OIDC configuration and traffic; hidden is not the
      same as removed.
- [ ] Keep `PEACEPAD_ENABLE_V2_EXTERNAL_AI` and
      `PEACEPAD_ENABLE_PATTERN_LEARNING` unset or `false` for this release.
- [ ] Verify export.
- [ ] Verify permanent deletion using a disposable synthetic account.
- [ ] Confirm two-user functionality is described narrowly. Do not claim a live
      paired-flow pass unless the exact synthetic two-account setup was tested.

## Browser and iOS acceptance pass

Capture current evidence for:

- [ ] Fresh-install welcome on a small iPhone.
- [ ] Fresh-install welcome on a large iPhone.
- [ ] Returning-user and post-logout behavior.
- [ ] Guest-first Compose and alternate intervention paths.
- [ ] Explicit Terms and Privacy acknowledgment.
- [ ] AI remains off when not selected.
- [ ] One intended OpenAI path works only after separate AI-message opt-in.
- [ ] Disabled call/Conch, court-log, event/location, v2, and pattern-learning
      AI paths remain unavailable or local.
- [ ] Reviewer login.
- [ ] Account privacy/settings.
- [ ] Export.
- [ ] Permanent deletion using disposable synthetic data.
- [ ] Invitation and other direct/deep links.
- [ ] Camera, microphone, notification, and location permission denial.
- [ ] Large text and basic VoiceOver labels.

Use one controlled TestFlight pass. If remote control is unreliable, make one
retry, record the blocker, and stop rather than repeatedly fighting the remote
Mac.

## Binary decision record

### Path A - same binary

Preferred when App Store Connect permits resubmitting `1.0.9 (1)` after
metadata/server corrections.

Required proof:

- the existing Capacitor binary still loads `https://peacepad.ca`;
- all corrected welcome, login, consent, privacy, export, and deletion behavior
  is visible through that binary;
- no native SDK, permission, entitlement, or manifest correction is required.

Decision:

```text
Use 1.0.9 (1): YES
Evidence owner: Fejiro Efiuvwere
Verified at: 2026-07-26 17:55 EDT
Reason: App Store Connect permitted metadata/server correction and resubmission
        of the existing hosted Capacitor binary.
```

### Path B - replacement binary

Use `1.0.10`, build `2` only if Apple requires a replacement binary, the
existing shell cannot exercise the corrections, or Xcode identifies a native
privacy/SDK issue.

Required work:

- preserve `ca.peacepad.family`;
- sync the exact verified web/API source;
- generate Xcode's privacy report;
- add `PrivacyInfo.xcprivacy` if required by detected APIs/SDKs;
- archive, upload, process, and repeat TestFlight acceptance.

Decision:

```text
Use 1.0.10 (2): <YES/NO>
Apple/native trigger: <EXACT REQUIREMENT>
Evidence owner: <NAME>
Verified at: <UTC TIMESTAMP>
```

## App Store Connect gate

- [ ] Reconcile `ios-prep/APP_PRIVACY_DECLARATION_WORKSHEET.md` with the exact
      deployed runtime and binary.
- [x] Select sign-in required.
- [x] Enter synthetic reviewer credentials.
- [x] Add the exact testing path from `ios-prep/APP_REVIEW_RESPONSE_2_1.md`.
- [x] Explain guest-first behavior and separate AI consent.
- [x] Explain paired/two-user limits without overstating testability.
- [x] Confirm public Privacy, Terms, Support, and Help URLs.
- [x] Confirm automatic/manual release setting.
- [x] Submit the selected binary.
- [ ] Record the status and timestamp without changing the submission while it
      is in review unless a critical defect is confirmed.

## Release evidence

```text
Release commits: 5f3bb51d, 269add93, 827f9273
Production reviewer deploy: be3c7b6c-cc1b-4fb8-bd72-93e1390085e3
Production health: reviewer deployment SUCCESS
Reviewer login: SUCCESS; identity match; two session cookies
Guest consent: merged automated recovery coverage
AI opt-out: default-off behavior documented and tested
AI opt-in: server-side consent enforcement covered by merged tests
Export: reviewer-account control available
Deletion: merged disposable synthetic account smoke and safety coverage
Public URLs: Privacy, Terms, Support, and Help verified reachable
TestFlight device: existing submitted build retained
iOS version: 1.0.9 (1)
App Privacy: not re-edited during the Guideline 2.1 correction
Binary selected: existing 1.0.9 (1)
App Review resubmitted: 2026-07-26 approximately 17:55 EDT
Current Apple status: Waiting for Review
```

## Stop conditions

Stop and report before:

- changing the submitted production bundle ID;
- creating a second App Store record;
- adding real court/family documents;
- expanding into premium modules, billing, or React Native;
- claiming a check passed without current evidence;
- uploading a replacement binary without an Apple/native reason.
