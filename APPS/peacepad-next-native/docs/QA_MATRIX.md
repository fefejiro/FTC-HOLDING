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
| Resolution proof survives service restart | AUTOMATED VERIFIED | durable claim store and cross-service test |
| Region binding and optimistic concurrency | AUTOMATED VERIFIED | staging service tests |
| Create/accept/decline/revoke idempotency | AUTOMATED VERIFIED | staging replay tests |
| Expiry and single-use enforcement | AUTOMATED VERIFIED | staging service tests |
| Resolve attempts rate-limited | AUTOMATED VERIFIED | staging service/route tests |
| Hash-linked append-only audit sequence | AUTOMATED VERIFIED | staging audit-chain test |
| Invitation/grant/idempotency/audit writes are atomic | AUTOMATED VERIFIED | transaction rollback test |
| Postgres compare-and-swap persistence adapter | AUTOMATED VERIFIED | SQL contract tests |
| Shared rate-limit keys are hashed before persistence | AUTOMATED VERIFIED | Postgres limiter test |
| Trusted bearer session ignores actor spoofing headers | AUTOMATED VERIFIED | HTTP bridge test |
| Runtime rejects non-staging service origins | AUTOMATED VERIFIED | runtime factory tests |
| SQL schema excludes plaintext code/deep-link columns | AUTOMATED VERIFIED | migration guardrail |
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
| Jest/RNTL | AUTOMATED VERIFIED | 20 suites / 117 tests |
| Coverage | AUTOMATED VERIFIED | 85.29 / 79.85 / 80.05 / 88.42 |
| Expo config | AUTOMATED VERIFIED | lab bundle; diagnostics/writes false |
| Expo Doctor | BLOCKED | 17/18; app React 19 and monorepo-root React 18 duplicate |
| iOS export | AUTOMATED VERIFIED | 846 modules |
| Local staging host health | AUTOMATED VERIFIED | `/health` 200 |
| Readiness without database | AUTOMATED VERIFIED | `/readyz` fails closed with 500 |
| Production dependency audit | BLOCKED | 25 inherited advisories; breaking blanket upgrade rejected |
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

- Provision an isolated staging Postgres instance and service runtime.
- Resolve the duplicate-React Expo Doctor finding without modifying unrelated
  applications, and plan safe Expo/React Native dependency remediation.
- Apply `staging/migrations/0001_invitation_slice.sql` and grant a dedicated,
  least-privilege runtime role.
- Inject server-only peppers and connect a real staging session authenticator.
- Run live concurrency, rollback, rate-limit, and audit-restoration tests.
- Add tested device sharing and scannable QR behavior.
- Verify calendar layer sharing on Simulator or real iPhone.
- Run one real-iPhone staging pass with fictional accounts.
- Complete accessibility, dark mode, dynamic type, offline, and weak-network
  matrices before any production migration decision.
