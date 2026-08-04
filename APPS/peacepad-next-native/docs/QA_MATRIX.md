# PeacePad Next Native QA Matrix

Last updated: 2026-08-04

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
| Sender can create and explicitly share an expiring invitation | AUTOMATED VERIFIED | rendered native-share test |
| Deep link prefills code but does not create a grant | AUTOMATED VERIFIED | linking and rendered state test |
| Sender can revoke a pending invitation | AUTOMATED VERIFIED | rendered UI and adapter lifecycle test |
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
| Postgres migration executes idempotently | AUTOMATED VERIFIED | `npm run test:sql` against disposable embedded PostgreSQL |
| Database rejects invalid regions/plaintext invitation codes | AUTOMATED VERIFIED | embedded PostgreSQL constraint proof |
| Postgres create/resolve/accept/grant/audit transaction | AUTOMATED VERIFIED | embedded PostgreSQL repository integration proof |
| HTTP create/resolve/restart/accept lifecycle | AUTOMATED VERIFIED | real loopback TCP host backed by embedded PostgreSQL |
| HTTP origin/media/body/readiness boundaries | AUTOMATED VERIFIED | focused host regression tests |
| HTTP logs exclude tokens and invitation codes | AUTOMATED VERIFIED | log-redaction assertions |
| Shared rate-limit keys are hashed before persistence | AUTOMATED VERIFIED | Postgres limiter test |
| Trusted bearer session ignores actor spoofing headers | AUTOMATED VERIFIED | HTTP bridge test |
| Runtime rejects non-staging service origins | AUTOMATED VERIFIED | runtime factory tests |
| SQL schema excludes plaintext code/deep-link columns | AUTOMATED VERIFIED | migration guardrail |
| Layers private by default | AUTOMATED VERIFIED | adapter/UI tests |
| Cross-family reads/writes blocked | AUTOMATED VERIFIED | authorization tests |
| Layers identified by name/state, not colour alone | AUTOMATED VERIFIED | labels and accessibility state |
| Sharing expansion requires confirmation | AUTOMATED VERIFIED | UI interaction test |
| Month grid, seven-day schedule, and day agenda | AUTOMATED VERIFIED | rendered switching and event-placement test |
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
| Jest/RNTL | AUTOMATED VERIFIED | 25 suites / 137 tests |
| Embedded PostgreSQL | AUTOMATED VERIFIED | migration, constraints, invitation acceptance, grant, and audit chain passed |
| Coverage | AUTOMATED VERIFIED | 86.09 / 80.31 / 80.64 / 89.10 |
| Primary navigation roles and selected state | AUTOMATED VERIFIED | five named tabs; exactly one selected |
| Invitation and calendar selector semantics | AUTOMATED VERIFIED | named tabs expose selected state |
| Calendar layer controls do not depend on colour | AUTOMATED VERIFIED | named checkbox and sharing button states |
| Message Check disclosure and opt-out semantics | AUTOMATED VERIFIED | expanded state and named opt-out control |
| Core interactive target sizes | AUTOMATED VERIFIED | 44-point compact controls; 48-point primary/navigation controls |
| Dynamic Type not disabled | AUTOMATED VERIFIED | release guard rejects `allowFontScaling={false}` |
| Large-text adaptive layout | AUTOMATED VERIFIED | 1.6x rendered tests stack Home and enlarge two-line navigation |
| VoiceOver and 200% text visual pass | NOT STARTED | requires controlled Simulator and real-device evidence |
| Expo config | AUTOMATED VERIFIED | lab bundle; diagnostics/writes false |
| Expo Doctor | BLOCKED | 17/18; app React 19 and monorepo-root React 18 duplicate |
| Expo Doctor (standalone native install) | AUTOMATED VERIFIED | 18/18 with a clean temporary npm install outside the monorepo |
| iOS export | AUTOMATED VERIFIED | 846 modules |
| Local staging host health | AUTOMATED VERIFIED | `/health` and database-backed `/readyz` 200 over real TCP |
| Readiness without database | AUTOMATED VERIFIED | `/readyz` fails closed with 500 |
| Host restart with durable resolution claim | AUTOMATED VERIFIED | resolve before restart; accept after restart passed |
| Standalone production dependency audit | BLOCKED | 11 inherited Expo toolchain advisories: 1 high, 10 moderate, 0 critical; breaking Expo 57 force-upgrade rejected |
| Diff/secret checks | AUTOMATED VERIFIED | passed |
| Native lab GitHub workflow | BLOCKED | GitHub account billing lock prevented job start; local isolated checks passed |
| Maestro invitation/calendar flows | SIMULATOR VERIFIED | Maestro 2.8.0 passed both flows on disposable iPhone 17 Pro / iOS 26.5 Simulator |

The path-scoped native workflow is
`.github/workflows/peacepad-native-lab-gates.yml`. It is intentionally
separate from Garden Portal Deep QA and does not deploy or write to any
PeacePad production service.

## Current device evidence required

| Evidence | Status |
| --- | --- |
| Home | SIMULATOR VERIFIED |
| Invitation preview and acceptance | SIMULATOR VERIFIED |
| Earlier Month/Week/Day selection on commit `02d19cf5` | SIMULATOR VERIFIED |
| Current Month grid, Week schedule, and Day agenda | SIMULATOR VERIFIED |
| Current invitation QR sender flow | SIMULATOR VERIFIED |
| Layer sharing | SIMULATOR VERIFIED |
| Message Check opt-in, review, explicit send | SIMULATOR VERIFIED |
| Real-iPhone staging pass | NOT STARTED |

Current calendar evidence is in `docs/evidence/calendar-proof-2026-08-04` and
was captured from an iPhone 17 Simulator running iOS 26.5 at source commit
`e0936d2e`. It proves the current Month grid, Week schedule, and Day agenda with
an honest fictional empty state. The additional evidence in
`docs/evidence/maestro-2026-08-04` proves invitation QR creation and explicit
calendar sharing on a disposable iPhone 17 Pro Simulator running iOS 26.5. The
clean product runtime came from `7f01845c`; proof definitions ran at
`afefbe31`. No historical screenshot was used as current evidence.

The evidence in `docs/evidence/quiet-premium-2026-08-01` remains historical
proof for Home, invitation, the earlier calendar selector, and Message Check on
commit `02d19cf5`; it is not relabelled as current calendar evidence.

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

- Provision an isolated networked staging Postgres instance and service
  runtime; embedded PostgreSQL regression proof now passes locally.
- Run Expo Doctor from a clean standalone native install in CI; the native
  dependency graph itself passes 18/18. Keep the shared web dependency tree
  unchanged and triage the inherited advisories separately.
- Apply `staging/migrations/0001_invitation_slice.sql` and grant a dedicated,
  least-privilege runtime role.
- Inject server-only peppers and connect a real staging session authenticator.
- Run live concurrency, rollback, rate-limit, and audit-restoration tests.
- Verify native share-sheet, deep-link, and scannable QR behavior on device.
- Repeat invitation creation/acceptance and calendar sharing on a real iPhone.
- Run one real-iPhone staging pass with fictional accounts.
- Complete VoiceOver, large-text layout, contrast, dark mode, offline, and
  weak-network matrices before any production migration decision.
