# PeacePad Next Native Status

Last updated: 2026-08-04

## Scope boundary

This is the isolated React Native / Expo successor app. Its visible name is
**PeacePad**, while its identifier remains `ca.peacepad.nextnative.lab`. The
approved Capacitor app, production data/API, App Store record, and
`ca.peacepad.family` were not changed.

## Quiet-Premium coordination sprint

| Capability | Status | Evidence |
| --- | --- | --- |
| Home, Messages, Calendar, Records, More shell | AUTOMATED VERIFIED | `src/App.test.tsx` |
| State-derived Home; no fixture metrics/internal copy | AUTOMATED VERIFIED | rendered tests and retired legacy Home |
| Diagnostics disabled outside local lab | AUTOMATED VERIFIED | environment tests and guardrail |
| Typed `/api/v2` coordination client | AUTOMATED VERIFIED | HTTP contract tests |
| Invitation preview before explicit acceptance | AUTOMATED VERIFIED | UI and adapter tests |
| Invalid/expired/revoked/used/rate-limited handling | AUTOMATED VERIFIED | HTTP mapping and adapter tests |
| Invitation creation, native sharing, deep-link prefill, and revocation | AUTOMATED VERIFIED | rendered UI, link-routing, and adapter lifecycle tests |
| Private-by-default calendar layers | AUTOMATED VERIFIED | UI and authorization tests |
| Month/Week/Day calendar presentations and event lifecycle | AUTOMATED VERIFIED | rendered view-switching and event-placement tests plus adapter lifecycle tests |
| Explicit calendar sharing confirmation | AUTOMATED VERIFIED | rendered interaction test |
| Per-chat Message Check, default off | AUTOMATED VERIFIED | UI and adapter tests |
| Original draft preserved; no automatic send | AUTOMATED VERIFIED | explicit-send tests |
| Third-party AI consent separate/off | AUTOMATED VERIFIED | consent and preference tests |
| Current quiet-premium Simulator evidence | SIMULATOR VERIFIED | iPhone 17 / iOS 26.5 Month, Week, and Day evidence captured on `e0936d2e` |
| Maestro invitation and calendar-sharing flows | IMPLEMENTED | `e2e/maestro`; deterministic Expo URL supplied at runtime |
| Real-iPhone staging evidence | NOT STARTED | Requires deployed staging slice and controlled device session |
| Staging `/api/v2` invitation handler core | AUTOMATED VERIFIED | Reviewed Node host plus framework-neutral route/service tests; not deployed |
| Postgres staging repository and migration | AUTOMATED VERIFIED | Transaction/rollback/CAS and durable resolution-claim tests; migration prepared but not applied |
| Shared staging rate limiter | AUTOMATED VERIFIED | Atomic Postgres upsert contract; not deployed |
| Trusted staging session boundary | AUTOMATED VERIFIED | Bearer authenticator bridge ignores spoofed actor headers |
| Staging host health/fail-closed readiness | AUTOMATED VERIFIED | Local `/health` returned 200; `/readyz` returned 500 with the database intentionally unavailable |
| Persistent staging deployment | NOT STARTED | Requires isolated database/service provisioning and secret injection |

## Verification

```text
guardrails       passed
typecheck        passed
Jest/RNTL        21 suites / 121 tests passed
coverage         85.29 statements / 80.06 branches / 79.74 functions / 88.42 lines
Expo Doctor      17/18 in monorepo; isolated native install 18/18
Expo config      PeacePad; ca.peacepad.nextnative.lab; diagnostics/writes false
iOS export       passed; 846 modules bundled
diff check       passed
secret scan      no credential value found in changed runtime files
```

The standalone native checks are path-scoped in
`.github/workflows/peacepad-native-lab-gates.yml`. They install the native
manifest outside the monorepo workspace, then run guardrails, typecheck,
Jest/coverage, Expo Doctor, Expo config, and an iOS export. This avoids turning
the unrelated Garden workflow or the monorepo's older web React dependency
into a native-lab failure.

The first PR execution was **BLOCKED before job start** because GitHub reports
the account is locked for a billing issue. This is an infrastructure/account
constraint, not a native test failure; the same isolated checks pass locally.

## Current flow

```text
Home
|- Send message -> optional Message Check -> explicit send
|- Add event -> private layer -> confirmed sharing
|- Invite co-parent -> create/share/revoke or resolve -> preview -> accept/decline
`- Add record -> binder -> detail -> timeline -> export preview
```

All current state is fictional and session-only. No real family message,
invitation code, child information, court document, credential, or production
write was used.

## Simulator evidence boundary

The screenshots under `docs/evidence/calendar-proof-2026-08-04` prove the
current Month grid, seven-day Week schedule, and Day agenda on commit
`e0936d2e`. They were captured from an iPhone 17 Simulator running iOS 26.5
after the primary task chrome was simplified. The prepared source was clean,
the bundle remained `ca.peacepad.nextnative.lab`, production writes remained
disabled, and the empty calendar state was fictional and session-only.
Automated interaction coverage separately proves view switching.

The screenshots under `docs/evidence/quiet-premium-2026-08-01` prove the
quiet-premium Home, invitation, earlier Month/Week/Day selection, and Message
Check explicit-send journeys on commit `02d19cf5`. The simulator was an iPhone
17 running iOS 26.5. All records and messages were fictional, the bundle
remained `ca.peacepad.nextnative.lab`, and production writes remained disabled.
They remain historical evidence for the earlier shell and are not used as proof
of the current calendar presentation.

Calendar layer sharing and the current invitation-QR sender proof remain
**BLOCKED** for new Simulator evidence. Maestro 2.8.0 connected to the iPhone 17
Simulator and the checked-in flows opened the deterministic Expo URL, but Expo
Go remained pinned to an earlier `useContext` red-screen state. On the permitted
retry, the Maestro XCUITest cleanup also reported a SpringBoard crash. The
standalone source at `66cd4108` was clean and isolated; no further simulator
retries were made. Neither interaction is marked Simulator verified.

The six screenshots under
`docs/evidence/premium-vertical-slice-2026-07-31` prove the earlier records
vertical slice on commit `86adf4cb`. They were added by remote commit
`43b50b64` and are preserved as historical evidence. They do **not** prove the
new quiet-premium Home, invitation, calendar, or Message Check UI in this
commit and are not relabelled as current evidence.

## Known limitations

- Staging server authorization, hashed single-use codes, persisted
  idempotency/audit events, and infrastructure rate limits are not deployed.
- The reviewed Node staging host is locally runnable, validates staging-only
  origins/database/session configuration, exposes health/readiness endpoints,
  bounds JSON bodies, applies strict CORS, and logs no request bodies or tokens.
  It does not auto-apply migrations.
- The invitation handler core now verifies trusted actors, family permission,
  region/version headers, idempotency, peppered code hashes, expiry, single
  use, resolution claims, local rate limits, and hash-linked audit events.
  In-memory adapters remain available only for deterministic tests.
- A Postgres-backed store, transactional unit-of-work boundary, shared
  Postgres rate limiter, trusted-session bridge, staging-only runtime factory,
  and isolated schema migration now exist. They are automated-verified but
  have not been connected to a database or deployed service.
- Invitation-resolution proof is persisted as an expiring peppered subject
  hash, so accept/decline authorization survives a process restart or a second
  service instance without storing the submitted code or bearer token.
- PostgreSQL CLI tooling was unavailable locally, so the migration received
  static guardrail and adapter-contract verification but no live SQL execution.
- Durable idempotency values and rate-limit subjects are peppered before
  persistence; plaintext invitation codes, deep links, and raw limiter keys are
  not represented by the staging schema.
- The product adapter is memory-only; only the earlier guest session uses
  SecureStore.
- Invitation creation, native share-sheet delivery, deep-link prefill,
  acceptance, revocation, and scannable QR presentation are automated-verified.
  Device proof for the new sender flow remains open.
- Calendar view selection/layers/events and Month/Week/Day presentations are
  implemented for the fixed fictional August 2026 fixture. Date navigation,
  recurrence, offline behavior, and production persistence are later gates.
- Message Check is rule-based and does not call third-party AI.
- Calendar layer-sharing Simulator proof and all real-iPhone staging evidence
  remain required.
- Reusable Maestro flows now exist for invitation QR and calendar sharing. The
  Mac has a user-local Temurin 17 runtime and Maestro 2.8.0, but the current
  iOS 26.5 Simulator session must be reset before those flows are rerun.
- The shared monorepo Expo Doctor run is 17/18 because web workspaces expose
  React 18 above the native workspace's React 19. A clean standalone install of
  the native manifest passed Expo Doctor 18/18, confirming the native app's own
  dependency graph is healthy. CI should use that isolated install strategy;
  changing the root web dependency graph is not required for this lab.
- A clean standalone native audit reports 11 inherited Expo toolchain
  advisories (10 moderate, 1 high, 0 critical). The previous 25-advisory count
  included unrelated monorepo dependencies. Expo dependency compatibility
  passes; the remaining blanket repair requires a breaking Expo 57 upgrade and
  was intentionally not applied. See `docs/DEPENDENCY_RISK_REGISTER.md`.

## Honest completion map

| Area | Status |
| --- | ---: |
| Quiet-premium information architecture | 85% |
| Secure invitation product flow | 75% |
| Layered calendar product flow | 65% |
| Per-chat Message Check | 70% |
| Typed staging compatibility client | 75% |
| Staging invitation server core | 70% |
| Automated verification | 94% |
| Current device verification | 72% |
| Overall production-native v2 | 35% |

## Next best move

Reset the disposable iPhone 17 Simulator/Expo Go session, then run the two
checked-in Maestro flows once to capture the scannable invitation QR and
calendar-sharing confirmation. If the simulator remains unstable, move the
same checks to the real-iPhone staging pass instead of retrying remote input.
After an explicit
cost/hosting decision, provision one isolated staging database and service,
apply the prepared migration, grant a least-privilege runtime role, and run live
API checks. Do not expand into calling, billing, or production migration before
those gates pass.
