# PeacePad Next Native Status

Last updated: 2026-07-29

## Scope

PeacePad Next Native remains an isolated React Native / Expo lab. The current
branch combines the synthetic Premium product slice with a staging-only Gate 1
foundation:

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
| Default startup route | AUTOMATED VERIFIED | Empty/unknown routes resolve to Gate 1 Foundation |
| PeacePad conch brand | AUTOMATED VERIFIED | Foundation test asserts the actual image asset |
| Existing-account route shell | AUTOMATED VERIFIED | Shell creates no session and performs no API write |
| Required consent boundary | AUTOMATED VERIFIED | Terms and Privacy acknowledgement precede guest creation |
| Optional AI consent | AUTOMATED VERIFIED | Defaults off and is sent separately |
| Lab/staging isolation | AUTOMATED VERIFIED | Production target is rejected; writes remain false |
| Typed API/error contract | AUTOMATED VERIFIED | Guest start, preview, HTTP, timeout, invalid response, and network paths |
| Secure device session | AUTOMATED VERIFIED | SecureStore save/read/reset, expiry, invalid data, and consent |
| Restart recovery behavior | AUTOMATED VERIFIED | Stored session refreshes through the injected staging API |
| Evidence Detail startup route | AUTOMATED VERIFIED | `evidence-detail` route is asserted by RNTL |
| Unsupported startup fallback | AUTOMATED VERIFIED | Unknown route resolves to Foundation |
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
| Simulator proof context | AUTOMATED VERIFIED | Generated manifest pins commit, dirty state, bundle ID, and write boundary |
| GitHub Actions execution | BLOCKED | PR #160 Garden jobs ran zero steps; GitHub reports an account billing lock |
| Cloudflare branch check | BLOCKED | External PeacePad Worker check failed; no provider log or deploy action authorized |
| iOS simulator vertical-slice smoke | BLOCKED | No controllable Mac simulator session in this run; no new screenshots claimed |

## Verification results

```text
npm --workspace=@ftc/peacepad-next-native run typecheck
-> passed

npm --workspace=@ftc/peacepad-next-native run guardrails
-> PeacePad Next Native guardrails OK.

npm --workspace=@ftc/peacepad-next-native test
-> 8 suites passed, 47 tests passed

npm --workspace=@ftc/peacepad-next-native run test:coverage
-> 82.32% statements
-> 85.35% branches
-> 75.65% functions
-> 85.11% lines
-> global 75% threshold enforced

npm --workspace=@ftc/peacepad-next-native exec expo -- config --type public
-> SDK 54 config resolved
-> iOS bundleIdentifier ca.peacepad.nextnative.lab
-> productionApiWritesEnabled false

npm --workspace=@ftc/peacepad-next-native run sim:doctor
-> standalone simulator workdir
-> 18/18 checks passed
```

Direct monorepo Expo Doctor reports the unrelated root React 18 beside the lab's React 19. The established standalone simulator workdir removes that monorepo dependency noise and passes all 18 checks.

`npm audit --omit=dev` in that standalone workdir reports 19 high and 8
moderate transitive advisories in the supported Expo 54 / React Native 0.81
toolchain. The offered automatic fixes require breaking upgrades to React
Native 0.86 or Expo 57, so no forced audit mutation was applied. This remains a
release blocker to resolve through a separately tested supported-SDK upgrade.

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

- Premium product state is memory-only and resets when the app restarts.
- The separate Gate 1 guest token and consent state use SecureStore.
- Original-file metadata is a synthetic placeholder; no picker or upload exists.
- No account authentication, database, evidence storage, offline queue, AI
  service, calls, billing, or production API integration exists.
- Evidence review creates one deterministic synthetic timeline entry.
- Export Preview selects records but does not create or share a file.
- Device, accessibility, dark-mode, and real-iPhone matrices remain incomplete.
- The submitted Capacitor app remains untouched.

## Architecture decision gate

The 2026-07-25 recommendation to adopt selected native concepts into Capacitor
has been superseded by the decision to develop a full native v2 while keeping
the approved Capacitor version 1 as the live rollback baseline.

See
[`NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md`](./NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md)
for the parity-first production gates. The lab remains non-production and its
existing safety controls remain mandatory.

See [`WORKFLOW_SCOPING_NOTE.md`](./WORKFLOW_SCOPING_NOTE.md) for the unrelated Garden workflow trigger caused by the shared root lockfile.

Continue the native client through one controlled simulator proof and Gate 1,
then assess:

1. Whether the state model remains understandable as auth and persistence contracts are designed.
2. Whether the evidence privacy/storage model can be approved before any upload work.
3. Whether the RN interaction and accessibility quality is materially better than adopting the same lessons in Capacitor.
4. Whether migration cost is justified after the submitted Capacitor release is fully tested.

## Honest completion map

| Area | Status |
| --- | ---: |
| Expanded repository audit and reuse map | 100% |
| Product thesis and 24-30 month program design | 85% |
| Synthetic Premium vertical slice | 60% |
| Gate 1 environment/API/session foundation | 55% |
| Automated native verification | 70% |
| Simulator proof for this exact commit | 0% |
| Real-iPhone staging proof | 0% |
| Production auth and account recovery | 5% |
| Production evidence integrity and export | 5% |
| Native calling transport | 0% |
| Review-critical v1 parity | 10% |
| Overall production-native v2 | 16-18% |
