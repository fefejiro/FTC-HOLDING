# PeacePad Next Native QA Matrix

Last updated: 2026-08-01

Statuses: `IMPLEMENTED`, `AUTOMATED VERIFIED`, `SIMULATOR VERIFIED`, `BLOCKED`,
and `NOT STARTED`.

## Product and safety proof

| Requirement | Status | Evidence |
| --- | --- | --- |
| Visible app name PeacePad | AUTOMATED VERIFIED | Expo config and guardrail |
| Task navigation | AUTOMATED VERIFIED | `src/App.test.tsx` |
| No internal wording/fake metrics on normal Home | AUTOMATED VERIFIED | rendered negative/state assertions |
| Unsupported startup route safely falls back | AUTOMATED VERIFIED | resolver test |
| Diagnostics prohibited in staging | AUTOMATED VERIFIED | environment test |
| Invitation reveals no family data before resolution | AUTOMATED VERIFIED | UI flow test |
| Identity/family/role/access/expiry preview contract | AUTOMATED VERIFIED | domain/UI tests |
| Explicit accept/decline before grant | AUTOMATED VERIFIED | UI and adapter tests |
| Invalid, expired, revoked, used, rate-limited states | AUTOMATED VERIFIED | contract/adapter tests |
| Invitation code excluded from URL | AUTOMATED VERIFIED | request test |
| Server stores only peppered invitation-code hashes | AUTOMATED VERIFIED | staging service storage assertion |
| Authenticated actor matches trusted session context | AUTOMATED VERIFIED | staging service/route tests |
| Family invitation permission required | AUTOMATED VERIFIED | staging authorization test |
| Code resolution proof required before accept/decline | AUTOMATED VERIFIED | staging claim test |
| Region binding and optimistic concurrency | AUTOMATED VERIFIED | staging service tests |
| Create/accept/decline/revoke idempotency | AUTOMATED VERIFIED | staging replay tests |
| Expiry and single-use enforcement | AUTOMATED VERIFIED | staging service tests |
| Resolve attempts rate-limited | AUTOMATED VERIFIED | staging service/route tests |
| Hash-linked append-only audit sequence | AUTOMATED VERIFIED | staging audit-chain test |
| Layers private by default | AUTOMATED VERIFIED | adapter/UI tests |
| Cross-family reads/writes blocked | AUTOMATED VERIFIED | authorization tests |
| Layers identified by name/state, not colour alone | AUTOMATED VERIFIED | labels and accessibility state |
| Sharing expansion requires confirmation | AUTOMATED VERIFIED | UI interaction test |
| Month/Week/Day switching | AUTOMATED VERIFIED | UI interaction test |
| Event create/update/delete contract | AUTOMATED VERIFIED | adapter lifecycle test |
| Message Check defaults off per chat | AUTOMATED VERIFIED | UI/adapter tests |
| Rule-based preview works with AI off | AUTOMATED VERIFIED | adapter test |
| Original draft preserved | AUTOMATED VERIFIED | adapter/UI tests |
| Preview never automatically sends | AUTOMATED VERIFIED | explicit-send flow test |
| Production host/writes blocked | AUTOMATED VERIFIED | config and guardrails |

## Tooling

| Check | Status | Result |
| --- | --- | --- |
| TypeScript | AUTOMATED VERIFIED | passed |
| Guardrails | AUTOMATED VERIFIED | passed |
| Jest/RNTL | AUTOMATED VERIFIED | 15 suites / 87 tests |
| Coverage | AUTOMATED VERIFIED | 84.60 / 79.58 / 79.16 / 87.80 |
| Expo config | AUTOMATED VERIFIED | lab bundle; diagnostics/writes false |
| Expo Doctor | AUTOMATED VERIFIED | 18/18 |
| iOS export | AUTOMATED VERIFIED | 841 modules |
| Diff/secret checks | AUTOMATED VERIFIED | passed |

## Current device evidence required

| Evidence | Status |
| --- | --- |
| Home | SIMULATOR VERIFIED |
| Invitation preview and acceptance | SIMULATOR VERIFIED |
| Month/Week/Day calendar | SIMULATOR VERIFIED |
| Layer sharing | BLOCKED |
| Message Check opt-in, review, explicit send | SIMULATOR VERIFIED |
| Real-iPhone staging pass | NOT STARTED |

Current evidence is in `docs/evidence/quiet-premium-2026-08-01` and was
captured from an iPhone 17 simulator running iOS 26.5 at source commit
`02d19cf5`. Layer sharing is automated-verified, but its visible Simulator
control did not activate through the remote pointer after the permitted retry.

The historical records screenshots in
`docs/evidence/premium-vertical-slice-2026-07-31` remain valid only for commit
`86adf4cb`; they are not current quiet-premium evidence.

## Safety boundary

| Gate | Status |
| --- | --- |
| Bundle `ca.peacepad.nextnative.lab` | AUTOMATED VERIFIED |
| Production writes disabled | AUTOMATED VERIFIED |
| Diagnostics disabled in checked-in config | AUTOMATED VERIFIED |
| Approved Capacitor app untouched | IMPLEMENTED |
| No App Store action | IMPLEMENTED |
| No real family/court/child data | IMPLEMENTED |

## Remaining promotion gates

- Replace the in-memory invitation repository and limiter with durable,
  concurrency-safe staging infrastructure.
- Bind route actors to trusted session middleware and inject the server-only
  hash pepper from staging secrets.
- Deploy the staging invitation slice and verify its authorization/audit proof.
- Add tested device sharing and scannable QR behavior.
- Verify calendar layer sharing on Simulator or real iPhone.
- Run one real-iPhone staging pass with fictional accounts.
- Complete accessibility, dark mode, dynamic type, offline, and weak-network
  matrices before any production migration decision.
