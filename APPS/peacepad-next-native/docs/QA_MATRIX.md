# PeacePad Next Native QA Matrix

Last updated: 2026-07-25

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
| Default startup is Home | AUTOMATED VERIFIED | `App.test.tsx` |
| `evidence-detail` startup route | AUTOMATED VERIFIED | `App.test.tsx` |
| Unsupported startup route falls back to Home | AUTOMATED VERIFIED | `App.test.tsx` |
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

## Tooling and configuration

| Check | Status | Result |
| --- | --- | --- |
| TypeScript | AUTOMATED VERIFIED | Passed |
| Lab guardrails | AUTOMATED VERIFIED | Passed |
| Jest/RNTL suite | AUTOMATED VERIFIED | 3 suites, 18 tests |
| Expo public config | AUTOMATED VERIFIED | SDK 54; lab bundle; writes false |
| Standalone Expo Doctor | AUTOMATED VERIFIED | 18/18 |
| Direct monorepo Expo Doctor | BLOCKED | Root React 18 duplicates isolated lab React 19 |

## Current simulator proof

| Screen | Status | Current evidence |
| --- | --- | --- |
| Goal Setup | BLOCKED | No 2026-07-25 controlled simulator session |
| Case Binder | BLOCKED | No 2026-07-25 controlled simulator session |
| Evidence Metadata | BLOCKED | No 2026-07-25 controlled simulator session |
| Evidence Detail | BLOCKED | No 2026-07-25 controlled simulator session |
| Timeline | BLOCKED | No 2026-07-25 controlled simulator session |
| Export Preview | BLOCKED | No 2026-07-25 controlled simulator session |

The July 24 screenshots are historical visual evidence for the earlier mock. They are not evidence for this stateful batch.

## Remaining architecture evidence

| Area | Status |
| --- | --- |
| One controlled iPhone simulator vertical-slice pass | BLOCKED |
| Small/large iPhone layout | NOT STARTED |
| iPad layout | NOT STARTED |
| Dark mode and large text | NOT STARTED |
| VoiceOver/accessibility audit | NOT STARTED |
| Offline/session recovery policy | NOT STARTED |
| Auth/session contract | NOT STARTED |
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
