# PeacePad Next Native Status

Last updated: 2026-08-01

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
| Invitation creation contract with code/deep link | AUTOMATED VERIFIED | adapter lifecycle test |
| Private-by-default calendar layers | AUTOMATED VERIFIED | UI and authorization tests |
| Month/Week/Day selection and event lifecycle | AUTOMATED VERIFIED | UI and adapter tests |
| Explicit calendar sharing confirmation | AUTOMATED VERIFIED | rendered interaction test |
| Per-chat Message Check, default off | AUTOMATED VERIFIED | UI and adapter tests |
| Original draft preserved; no automatic send | AUTOMATED VERIFIED | explicit-send tests |
| Third-party AI consent separate/off | AUTOMATED VERIFIED | consent and preference tests |
| Current quiet-premium Simulator evidence | SIMULATOR VERIFIED | iPhone 17 / iOS 26.5; commit `02d19cf5`; fresh device-only screenshots |
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
Jest/RNTL        20 suites / 117 tests passed
coverage         85.29 statements / 79.85 branches / 80.05 functions / 88.42 lines
Expo Doctor      17/18 in monorepo; isolated native install 18/18
Expo config      PeacePad; ca.peacepad.nextnative.lab; diagnostics/writes false
iOS export       passed; 846 modules bundled
diff check       passed
secret scan      no credential value found in changed runtime files
```

## Current flow

```text
Home
|- Send message -> optional Message Check -> explicit send
|- Add event -> private layer -> confirmed sharing
|- Invite co-parent -> resolve -> preview access -> accept/decline
`- Add record -> binder -> detail -> timeline -> export preview
```

All current state is fictional and session-only. No real family message,
invitation code, child information, court document, credential, or production
write was used.

## Simulator evidence boundary

The fresh screenshots under
`docs/evidence/quiet-premium-2026-08-01` prove the current quiet-premium Home,
invitation, Month/Week/Day calendar switching, and Message Check explicit-send
journeys on commit `02d19cf5`. The simulator was an iPhone 17 running iOS 26.5.
All records and messages were fictional, the bundle remained
`ca.peacepad.nextnative.lab`, and production writes remained disabled.

Calendar layer sharing remains **BLOCKED** for Simulator evidence. The control
was visible and its confirmation behavior is automated-verified, but the remote
pointer did not activate that one control after the permitted retry. It is not
marked Simulator verified.

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
- Invitation acceptance and code/deep-link contracts exist. Device sharing and
  scannable QR presentation still require implementation and proof.
- Calendar view selection/layers/events are implemented; full grids,
  recurrence, offline behavior, and production persistence are later gates.
- Message Check is rule-based and does not call third-party AI.
- Calendar layer-sharing Simulator proof and all real-iPhone staging evidence
  remain required.
- The shared monorepo Expo Doctor run is 17/18 because web workspaces expose
  React 18 above the native workspace's React 19. A clean standalone install of
  the native manifest passed Expo Doctor 18/18, confirming the native app's own
  dependency graph is healthy. CI should use that isolated install strategy;
  changing the root web dependency graph is not required for this lab.
- `npm audit --omit=dev --workspace=@ftc/peacepad-next-native` currently reports
  25 inherited Expo/React Native toolchain advisories (3 low, 13 moderate,
  7 high, 2 critical). The suggested blanket repair requires a breaking Expo
  upgrade and was intentionally not applied.

## Honest completion map

| Area | Status |
| --- | ---: |
| Quiet-premium information architecture | 85% |
| Secure invitation product flow | 65% |
| Layered calendar product flow | 55% |
| Per-chat Message Check | 70% |
| Typed staging compatibility client | 75% |
| Staging invitation server core | 70% |
| Automated verification | 94% |
| Current device verification | 70% |
| Overall production-native v2 | 33% |

## Next best move

Adopt the proven standalone native install strategy in CI and triage the
dependency advisories without a breaking blind upgrade. Then, after an explicit
cost/hosting decision, provision one isolated staging database and service,
apply the prepared migration, grant a least-privilege runtime role, and run
live API plus real-iPhone staging checks.
Do not expand into calling, billing, or production migration before those gates
pass.
