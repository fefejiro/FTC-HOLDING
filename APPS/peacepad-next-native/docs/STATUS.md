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
| Staging `/api/v2` invitation handler core | AUTOMATED VERIFIED | Framework-neutral route/service tests; not deployed |
| Postgres staging repository and migration | AUTOMATED VERIFIED | Transaction/rollback/CAS adapter tests; migration prepared but not applied |
| Shared staging rate limiter | AUTOMATED VERIFIED | Atomic Postgres upsert contract; not deployed |
| Trusted staging session boundary | AUTOMATED VERIFIED | Bearer authenticator bridge ignores spoofed actor headers |
| Persistent staging deployment | NOT STARTED | Requires isolated database/service provisioning and secret injection |

## Verification

```text
guardrails       passed
typecheck        passed
Jest/RNTL        18 suites / 105 tests passed
coverage         84.87 statements / 79.43 branches / 78.84 functions / 87.90 lines
Expo Doctor      18/18 passed
Expo config      PeacePad; ca.peacepad.nextnative.lab; diagnostics/writes false
iOS export       passed; 841 modules bundled
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
- The invitation handler core now verifies trusted actors, family permission,
  region/version headers, idempotency, peppered code hashes, expiry, single
  use, resolution claims, local rate limits, and hash-linked audit events.
  In-memory adapters remain available only for deterministic tests.
- A Postgres-backed store, transactional unit-of-work boundary, shared
  Postgres rate limiter, trusted-session bridge, staging-only runtime factory,
  and isolated schema migration now exist. They are automated-verified but
  have not been connected to a database or deployed service.
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

## Honest completion map

| Area | Status |
| --- | ---: |
| Quiet-premium information architecture | 85% |
| Secure invitation product flow | 65% |
| Layered calendar product flow | 55% |
| Per-chat Message Check | 70% |
| Typed staging compatibility client | 75% |
| Staging invitation server core | 60% |
| Automated verification | 90% |
| Current device verification | 70% |
| Overall production-native v2 | 32% |

## Next best move

Provision a new isolated staging database and service, apply the prepared
migration, grant a least-privilege runtime role, and inject staging-only secret
material. Then run live API contract tests and one real-iPhone staging pass,
including calendar layer sharing. Do not expand into calling, billing, or
production migration before those gates pass.
