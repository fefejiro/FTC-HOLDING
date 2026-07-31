# PeacePad Next Native QA Matrix

Last updated: 2026-07-31

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
| Lab device journey requires no backend | AUTOMATED VERIFIED | Synthetic adapter tests; staging still uses typed HTTP client |
| Timeout/network/HTTP/invalid-response mapping | AUTOMATED VERIFIED | `PeacePadApiClient.test.ts` |
| Secure session restore, expiry, invalid data, reset | AUTOMATED VERIFIED | `secureGuestSession.test.ts` |

## Tooling and configuration

| Check | Status | Result |
| --- | --- | --- |
| TypeScript | AUTOMATED VERIFIED | Passed |
| Lab guardrails | AUTOMATED VERIFIED | Passed |
| Jest/RNTL suite | AUTOMATED VERIFIED | 10 suites, 55 tests |
| Coverage threshold | AUTOMATED VERIFIED | Global 75% gate; 82.94% statements / 85.86% branches / 75.79% functions / 85.67% lines |
| Production dependency audit | BLOCKED | 19 high / 8 moderate transitive Expo/RN advisories; fixes require breaking SDK upgrade |
| Expo public config | AUTOMATED VERIFIED | SDK 54; lab bundle; writes false |
| Standalone Expo Doctor | AUTOMATED VERIFIED | 18/18 |
| Simulator proof-context manifest | AUTOMATED VERIFIED | `sim:prepare` records commit, dirty state, bundle ID, and write boundary |
| Direct monorepo Expo Doctor | BLOCKED | Root React 18 duplicates isolated lab React 19 |

## Current simulator proof

| Screen | Status | Current evidence |
| --- | --- | --- |
| Goal Setup | SIMULATOR VERIFIED | [`01-goal-setup.png`](./evidence/premium-vertical-slice-2026-07-31/01-goal-setup.png) |
| Case Binder | SIMULATOR VERIFIED | [`02-case-binder.png`](./evidence/premium-vertical-slice-2026-07-31/02-case-binder.png) |
| Evidence Metadata | SIMULATOR VERIFIED | [`03-evidence-metadata.png`](./evidence/premium-vertical-slice-2026-07-31/03-evidence-metadata.png) |
| Evidence Detail | SIMULATOR VERIFIED | [`04-evidence-detail.png`](./evidence/premium-vertical-slice-2026-07-31/04-evidence-detail.png) |
| Timeline | SIMULATOR VERIFIED | [`05-timeline.png`](./evidence/premium-vertical-slice-2026-07-31/05-timeline.png) |
| Export Preview | SIMULATOR VERIFIED | [`06-export-preview.png`](./evidence/premium-vertical-slice-2026-07-31/06-export-preview.png) |

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

### 2026-07-30 Gate 1 controlled pass

- Tested source commit: `e6c7a5525f232d546d505e14140b21764cdd3f41`.
- Device: iPhone 17 simulator, iOS 26.5.
- Result: `SIMULATOR VERIFIED`.
- Welcome: [`01-welcome.png`](./evidence/gate1-2026-07-30/01-welcome.png).
- Existing-account shell: [`02-existing-account.png`](./evidence/gate1-2026-07-30/02-existing-account.png).
- Required consent with AI off: [`03-consent-ai-off.png`](./evidence/gate1-2026-07-30/03-consent-ai-off.png).
- Synthetic guest compose: [`04-guest-compose.png`](./evidence/gate1-2026-07-30/04-guest-compose.png).
- Rule-based preview: [`05-message-preview.png`](./evidence/gate1-2026-07-30/05-message-preview.png).
- Restart recovery: [`06-session-recovered.png`](./evidence/gate1-2026-07-30/06-session-recovered.png).
- Proof context: [`SIMULATOR_PROOF_CONTEXT.json`](./evidence/gate1-2026-07-30/SIMULATOR_PROOF_CONTEXT.json).
- All values remained synthetic. No production API, App Store, real family, court, or child data was used.

### 2026-07-31 Premium vertical-slice controlled pass

- Tested source commit: `86adf4cb5056758ea64395391b11d03892c0cf2d`.
- Device: iPhone 17 simulator, iOS 26.5.
- Result: `SIMULATOR VERIFIED`.
- Goal Setup: [`01-goal-setup.png`](./evidence/premium-vertical-slice-2026-07-31/01-goal-setup.png).
- Case Binder: [`02-case-binder.png`](./evidence/premium-vertical-slice-2026-07-31/02-case-binder.png).
- Evidence Metadata: [`03-evidence-metadata.png`](./evidence/premium-vertical-slice-2026-07-31/03-evidence-metadata.png).
- Evidence Detail: [`04-evidence-detail.png`](./evidence/premium-vertical-slice-2026-07-31/04-evidence-detail.png).
- Source-linked Timeline: [`05-timeline.png`](./evidence/premium-vertical-slice-2026-07-31/05-timeline.png).
- Export Preview with 1 evidence and 1 timeline item selected: [`06-export-preview.png`](./evidence/premium-vertical-slice-2026-07-31/06-export-preview.png).
- Proof context: [`SIMULATOR_PROOF_CONTEXT.json`](./evidence/premium-vertical-slice-2026-07-31/SIMULATOR_PROOF_CONTEXT.json).
- All values remained synthetic. Production API writes remained disabled, bundle ID remained `ca.peacepad.nextnative.lab`, and the submitted Capacitor app was untouched.
- Visual defects: long Binder/Evidence forms require several swipes; standalone Expo host chrome shows a `Safari` return indicator. No functional blocker was found.

## Remaining architecture evidence

| Area | Status |
| --- | --- |
| One controlled iPhone simulator Premium vertical-slice pass | SIMULATOR VERIFIED |
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
| Welcome -> consent -> guest -> preview | SIMULATOR VERIFIED | `01-welcome.png`, `03-consent-ai-off.png`, `04-guest-compose.png`, `05-message-preview.png` |
| Existing-account staging shell | SIMULATOR VERIFIED | `02-existing-account.png`; no production credentials used |
| Restart -> secure session refresh | SIMULATOR VERIFIED | `06-session-recovered.png` plus RNTL and SecureStore tests |
| iOS Simulator on tested source commit | SIMULATOR VERIFIED | iPhone 17 / iOS 26.5; proof context pins clean `e6c7a552` source |
| Real iPhone against staging | NOT STARTED | No production API use permitted |

