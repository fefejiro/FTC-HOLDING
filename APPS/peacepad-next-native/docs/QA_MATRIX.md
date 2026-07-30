# PeacePad Next Native QA Matrix

Last updated: 2026-07-29

Status vocabulary:

- `IMPLEMENTED`: code exists but has not passed the required proof.
- `AUTOMATED VERIFIED`: repeatable automated proof passes.
- `SIMULATOR VERIFIED`: current screenshot evidence exists from the iOS simulator.
- `BLOCKED`: attempted or required proof cannot proceed for a recorded external reason.
- `NOT STARTED`: no implementation or proof exists.

## Automated product proof

| Requirement | Status | Evidence |
| --- | --- | --- |
| Home quick action: Goal Setup | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Case Binder | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Calm Compose | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Parenting Logs | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Evidence Vault | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Evidence Detail | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Timeline | AUTOMATED VERIFIED | `App.test.tsx` |
| Home quick action: Export Preview | AUTOMATED VERIFIED | `App.test.tsx` |
| Default startup is Gate 1 Foundation | AUTOMATED VERIFIED | `App.test.tsx` |
| `evidence-detail` startup route | AUTOMATED VERIFIED | `App.test.tsx` |
| Unsupported startup route falls back to Foundation | AUTOMATED VERIFIED | `App.test.tsx` |
| Organize-records goal routes to Binder | AUTOMATED VERIFIED | Full vertical-slice test |
| Binder required fields | AUTOMATED VERIFIED | Empty required-field test |
| Evidence required metadata | AUTOMATED VERIFIED | Missing required-field test |
| Invalid/missing ISO-like event date | AUTOMATED VERIFIED | Invalid date test |
| Evidence metadata reaches Detail | AUTOMATED VERIFIED | Full vertical-slice test |
| Evidence review confirmation | AUTOMATED VERIFIED | UI and state tests |
| Source-linked timeline generation | AUTOMATED VERIFIED | UI and state tests |
| Evidence export selection | AUTOMATED VERIFIED | Full vertical-slice test |
| Timeline export selection | AUTOMATED VERIFIED | Full vertical-slice test |
| State survives active-session navigation | AUTOMATED VERIFIED | Detail -> Vault persistence test |
| Production writes disabled | AUTOMATED VERIFIED | Config test and guardrail |
| Real conch asset replaces placeholder mark | AUTOMATED VERIFIED | `FoundationScreen.test.tsx` |
| Existing-account shell performs no write | AUTOMATED VERIFIED | `FoundationScreen.test.tsx` |
| Welcome creates no guest session or consent | AUTOMATED VERIFIED | `FoundationScreen.test.tsx` |
| Required consent precedes session creation | AUTOMATED VERIFIED | UI and API client tests |
| Optional AI consent defaults off | AUTOMATED VERIFIED | UI, API payload, and SecureStore tests |
| Staging API isolation | AUTOMATED VERIFIED | `environment.test.ts` and guardrails |
| Timeout/network/HTTP/invalid-response mapping | AUTOMATED VERIFIED | `PeacePadApiClient.test.ts` |
| Secure session restore, expiry, invalid data, reset | AUTOMATED VERIFIED | `secureGuestSession.test.ts` |

## Tooling and configuration

| Check | Status | Result |
| --- | --- | --- |
| TypeScript | AUTOMATED VERIFIED | Passed |
| Lab guardrails | AUTOMATED VERIFIED | Passed |
| Jest/RNTL suite | AUTOMATED VERIFIED | 8 suites, 47 tests |
| Coverage threshold | AUTOMATED VERIFIED | Global 75% gate; 82.32% statements / 85.35% branches |
| Production dependency audit | BLOCKED | 19 high / 8 moderate transitive Expo/RN advisories; fixes require breaking SDK upgrade |
| Expo public config | AUTOMATED VERIFIED | SDK 54; lab bundle; writes false |
| Standalone Expo Doctor | AUTOMATED VERIFIED | 18/18 |
| Direct monorepo Expo Doctor | BLOCKED | Root React 18 duplicates isolated lab React 19 |

## Current simulator proof

| Screen | Status | Current evidence |
| --- | --- | --- |
| Goal Setup | BLOCKED | RDP input did not load tested commit; no current screenshot |
| Case Binder | BLOCKED | RDP input did not load tested commit; no current screenshot |
| Evidence Metadata | BLOCKED | RDP input did not load tested commit; no current screenshot |
| Evidence Detail | BLOCKED | RDP input did not load tested commit; no current screenshot |
| Timeline | BLOCKED | RDP input did not load tested commit; no current screenshot |
| Export Preview | BLOCKED | RDP input did not load tested commit; no current screenshot |

The July 24 screenshots are historical visual evidence for the earlier mock. They are not evidence for this stateful batch.

### 2026-07-25 controlled attempt

- Target commit: `7a713fb61834f4b7b32c1538882cf666d128b4f9`.
- Visible simulator: iPhone 17, iOS 26.5.
- Clean lab session: Home rendered from the exact target commit.
- Result: `BLOCKED`.
- Reason: the exact build rendered, but the first in-app tap was intercepted by the Mac Dock and opened Apple TV. After closing it and explicitly focusing Simulator, the single allowed retry was again routed into Apple TV instead of the simulated app.
- Screenshots accepted as current evidence: none.
- Synthetic-data confirmation: no new record was entered.
- Production-write confirmation: automated config/guardrail proof remains passed; no production action occurred.

## Remaining architecture evidence

| Area | Status |
| --- | --- |
| One controlled iPhone simulator vertical-slice pass | BLOCKED |
| Small/large iPhone layout | NOT STARTED |
| iPad layout | NOT STARTED |
| Dark mode and large text | NOT STARTED |
| VoiceOver/accessibility audit | NOT STARTED |
| Offline/session recovery policy | NOT STARTED |
| Guest session contract | AUTOMATED VERIFIED |
| Account auth/recovery contract | NOT STARTED |
| Private evidence storage threat model | NOT STARTED |
| Backend API contracts | NOT STARTED |
| Real file picker/upload | NOT STARTED |
| Export generation/sharing | NOT STARTED |
| Migration/rollback decision | NOT STARTED |

## Safety boundary

| Gate | Status |
| --- | --- |
| Synthetic data only | AUTOMATED VERIFIED |
| No production API write capability | AUTOMATED VERIFIED |
| Bundle ID `ca.peacepad.nextnative.lab` | AUTOMATED VERIFIED |
| Submitted Capacitor app untouched | IMPLEMENTED |
| No real court/child/family documents | IMPLEMENTED |
| No App Store Connect upload | IMPLEMENTED |

## Gate 1 device evidence

| Journey | Status | Evidence |
| --- | --- | --- |
| Welcome -> consent -> guest -> preview | AUTOMATED VERIFIED | RNTL with injected staging adapter |
| Restart -> secure session refresh | AUTOMATED VERIFIED | RNTL plus SecureStore unit tests |
| iOS Simulator on current commit | BLOCKED | Requires one controlled Mac pass after commit |
| Real iPhone against staging | NOT STARTED | No production API use permitted |
