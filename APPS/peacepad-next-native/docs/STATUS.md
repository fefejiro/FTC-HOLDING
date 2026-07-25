# PeacePad Next Native Status

Last updated: 2026-07-25

## Scope

PeacePad Next Native remains an isolated React Native / Expo lab. This batch proves one synthetic, in-memory product slice:

```text
Goal Setup
-> Case Binder
-> Evidence Metadata
-> Evidence Detail Review
-> Timeline Entry
-> Export Preview
```

No production API, database, real document, App Store record, production bundle ID, or submitted Capacitor code is used.

## Status summary

| Capability | Status | Evidence |
| --- | --- | --- |
| Eight Home quick actions | AUTOMATED VERIFIED | RNTL parameterized navigation test |
| Default startup route | AUTOMATED VERIFIED | Home is asserted by RNTL |
| Evidence Detail startup route | AUTOMATED VERIFIED | `evidence-detail` route is asserted by RNTL |
| Unsupported startup fallback | AUTOMATED VERIFIED | Unknown route resolves to Home |
| Typed session-only lab state | AUTOMATED VERIFIED | Context test covers binder, evidence, review, timeline, and export |
| Goal selection | AUTOMATED VERIFIED | `Organize my records` continues to Binder |
| Binder required fields | AUTOMATED VERIFIED | Empty name and child label are blocked |
| Evidence metadata validation | AUTOMATED VERIFIED | Required title/source/description/file placeholder and ISO-like date are covered |
| Evidence Detail saved metadata | AUTOMATED VERIFIED | Saved synthetic metadata is asserted on Detail |
| Evidence confirmation | AUTOMATED VERIFIED | Confirmation updates review state |
| Source-linked timeline generation | AUTOMATED VERIFIED | Timeline entry cites the evidence ID and source |
| Export evidence/timeline selection | AUTOMATED VERIFIED | Selected counts reach 1 evidence and 1 timeline |
| Active-session state persistence | AUTOMATED VERIFIED | Edited evidence survives Detail -> Vault navigation |
| Production write capability | AUTOMATED VERIFIED | Config test plus guardrail enforce `false` |
| iOS simulator vertical-slice smoke | BLOCKED | No controllable Mac simulator session in this run; no new screenshots claimed |

## Verification results

```text
npm --workspace=@ftc/peacepad-next-native run typecheck
-> passed

npm --workspace=@ftc/peacepad-next-native run guardrails
-> PeacePad Next Native guardrails OK.

npm --workspace=@ftc/peacepad-next-native test
-> 3 suites passed, 18 tests passed

npm --workspace=@ftc/peacepad-next-native exec expo -- config --type public
-> SDK 54 config resolved
-> iOS bundleIdentifier ca.peacepad.nextnative.lab
-> productionApiWritesEnabled false

npm --workspace=@ftc/peacepad-next-native run sim:doctor
-> standalone simulator workdir
-> 18/18 checks passed
```

Direct monorepo Expo Doctor reports the unrelated root React 18 beside the lab's React 19. The established standalone simulator workdir removes that monorepo dependency noise and passes all 18 checks.

## Simulator evidence

The screenshots in `.local/peacepad-rn-sim/qa-2026-07-24` document the earlier clickable mock only. They do not prove the 2026-07-25 stateful vertical slice and are not relabelled as current evidence.

One controlled attempt plus one retry was made on 2026-07-25. Commit `7a713fb61834f4b7b32c1538882cf666d128b4f9` rendered its Home screen on an iPhone 17 simulator running iOS 26.5. The first in-app tap and the single retry were both misrouted into the Mac TV application instead of Simulator. The vertical-slice pass is recorded as `BLOCKED`; no startup-only image is claimed as six-screen proof.

Required new screenshots remain:

- Goal Setup.
- Case Binder.
- Evidence Metadata.
- Evidence Detail.
- Timeline.
- Export Preview.

Stop after one controlled simulator pass. If remote input is unreliable, record the blockage once and do not repeatedly retry.

## Known limitations

- Session state is memory-only and resets when the app restarts.
- Original-file metadata is a synthetic placeholder; no picker or upload exists.
- No authentication, database, private storage, offline queue, AI service, calls, billing, or production API integration exists.
- Evidence review creates one deterministic synthetic timeline entry.
- Export Preview selects records but does not create or share a file.
- Device, accessibility, dark-mode, and real-iPhone matrices remain incomplete.
- The submitted Capacitor app remains untouched.

## Architecture decision gate

See [`ARCHITECTURE_DECISION_GATE.md`](./ARCHITECTURE_DECISION_GATE.md). The current recommendation is to adopt selected native concepts into Capacitor after approval, while retaining this React Native work as a non-production lab.

See [`WORKFLOW_SCOPING_NOTE.md`](./WORKFLOW_SCOPING_NOTE.md) for the unrelated Garden workflow trigger caused by the shared root lockfile.

Continue the native lab through one controlled simulator proof and then assess:

1. Whether the state model remains understandable as auth and persistence contracts are designed.
2. Whether the evidence privacy/storage model can be approved before any upload work.
3. Whether the RN interaction and accessibility quality is materially better than adopting the same lessons in Capacitor.
4. Whether migration cost is justified after the submitted Capacitor release is fully tested.
