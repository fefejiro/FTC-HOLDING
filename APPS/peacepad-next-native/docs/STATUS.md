# PeacePad Next Native Status

Last updated: 2026-07-31

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
| Synthetic lab runtime | AUTOMATED VERIFIED | Device journey uses an in-memory adapter; staging retains typed HTTP |
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
| Gate 1 iOS simulator journey | SIMULATOR VERIFIED | iPhone 17 / iOS 26.5 evidence captured from clean commit `e6c7a5525f232d546d505e14140b21764cdd3f41` |
| GitHub Actions execution | BLOCKED | PR #160 Garden jobs ran zero steps; GitHub reports an account billing lock |
| Cloudflare branch check | BLOCKED | External PeacePad Worker check failed; no provider log or deploy action authorized |
| Premium six-screen simulator vertical slice | SIMULATOR VERIFIED | One controlled iPhone 17 / iOS 26.5 pass completed from clean source `86adf4cb5056758ea64395391b11d03892c0cf2d` |

## Verification results

```text
npm --workspace=@ftc/peacepad-next-native run typecheck
-> passed

npm --workspace=@ftc/peacepad-next-native run guardrails
-> PeacePad Next Native guardrails OK.

npm --workspace=@ftc/peacepad-next-native test
-> 10 suites passed, 55 tests passed

npm --workspace=@ftc/peacepad-next-native run test:coverage
-> 82.94% statements
-> 85.86% branches
-> 75.79% functions
-> 85.67% lines
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

The screenshots in `.local/peacepad-rn-sim/qa-2026-07-24` document the earlier clickable mock only. They are not relabelled as current evidence.

The 2026-07-25 attempt on commit `7a713fb61834f4b7b32c1538882cf666d128b4f9` remains a historical blocked run: remote input was twice misrouted into the Mac TV application.

### 2026-07-30 Gate 1 controlled pass

- Tested source commit: `e6c7a5525f232d546d505e14140b21764cdd3f41`.
- Device: iPhone 17 simulator, iOS 26.5.
- Proof context: clean source, bundle `ca.peacepad.nextnative.lab`, production API writes disabled.
- Welcome rendered with the PeacePad conch identity.
- Existing-account staging shell opened without creating a session or using production credentials.
- Terms and Privacy were explicitly selected while optional AI processing remained off.
- A synthetic guest session opened Calm Compose.
- The rule-based preview returned `Neutral`; no message was sent.
- Expo Go was terminated and reopened; the private guest session was restored.
- Result: `SIMULATOR VERIFIED`.

Current simulator-native evidence:

- [`01-welcome.png`](./evidence/gate1-2026-07-30/01-welcome.png)
- [`02-existing-account.png`](./evidence/gate1-2026-07-30/02-existing-account.png)
- [`03-consent-ai-off.png`](./evidence/gate1-2026-07-30/03-consent-ai-off.png)
- [`04-guest-compose.png`](./evidence/gate1-2026-07-30/04-guest-compose.png)
- [`05-message-preview.png`](./evidence/gate1-2026-07-30/05-message-preview.png)
- [`06-session-recovered.png`](./evidence/gate1-2026-07-30/06-session-recovered.png)
- [`SIMULATOR_PROOF_CONTEXT.json`](./evidence/gate1-2026-07-30/SIMULATOR_PROOF_CONTEXT.json)

### 2026-07-31 Premium vertical-slice controlled pass

- Tested source commit: `86adf4cb5056758ea64395391b11d03892c0cf2d`.
- Device: iPhone 17 simulator, iOS 26.5.
- Proof context: clean source, bundle `ca.peacepad.nextnative.lab`, production API writes disabled.
- Selected the synthetic `Organize my records` goal.
- Validated the synthetic `Parenting contact record` binder.
- Validated one synthetic evidence record and confirmed that its saved values appeared in Evidence Detail.
- Confirmed the review state, which generated a source-linked Timeline entry.
- Selected both the evidence item and generated timeline item in Export Preview.
- Result: `SIMULATOR VERIFIED`.

Current simulator-native evidence:

- [`01-goal-setup.png`](./evidence/premium-vertical-slice-2026-07-31/01-goal-setup.png)
- [`02-case-binder.png`](./evidence/premium-vertical-slice-2026-07-31/02-case-binder.png)
- [`03-evidence-metadata.png`](./evidence/premium-vertical-slice-2026-07-31/03-evidence-metadata.png)
- [`04-evidence-detail.png`](./evidence/premium-vertical-slice-2026-07-31/04-evidence-detail.png)
- [`05-timeline.png`](./evidence/premium-vertical-slice-2026-07-31/05-timeline.png)
- [`06-export-preview.png`](./evidence/premium-vertical-slice-2026-07-31/06-export-preview.png)
- [`SIMULATOR_PROOF_CONTEXT.json`](./evidence/premium-vertical-slice-2026-07-31/SIMULATOR_PROOF_CONTEXT.json)

Observed defects:

- Binder and Evidence Metadata remain long forms that require several vertical swipes on an iPhone-sized screen.
- The standalone Expo lab shows a `Safari` return indicator in the simulator status area; this is host-context chrome, not production navigation.
- No functional blocker was found in the selected synthetic journey.

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
| Synthetic Premium vertical slice | 65% |
| Gate 1 environment/API/session foundation | 70% |
| Automated native verification | 75% |
| Gate 1 simulator proof for tested commit | 100% |
| Premium vertical-slice simulator proof on current code | 100% |
| Real-iPhone staging proof | 0% |
| Production auth and account recovery | 5% |
| Production evidence integrity and export | 5% |
| Native calling transport | 0% |
| Review-critical v1 parity | 10% |
| Overall production-native v2 | 20-22% |

