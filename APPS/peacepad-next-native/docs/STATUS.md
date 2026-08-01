# PeacePad Next Native Status

Last updated: 2026-07-31

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
| Current quiet-premium Simulator evidence | NOT STARTED | No callable Mac/iOS Simulator in this execution session |
| Real-iPhone staging evidence | NOT STARTED | Requires deployed staging slice and controlled device session |
| Staging `/api/v2` server handlers | NOT STARTED | Client contract and in-memory adapter only |

## Verification

```text
guardrails       passed
typecheck        passed
Jest/RNTL        12 suites / 74 tests passed
coverage         82.38 statements / 77.81 branches / 75.47 functions / 85.71 lines
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

The six screenshots under
`docs/evidence/premium-vertical-slice-2026-07-31` prove the earlier records
vertical slice on commit `86adf4cb`. They were added by remote commit
`43b50b64` and are preserved as historical evidence. They do **not** prove the
new quiet-premium Home, invitation, calendar, or Message Check UI in this
commit and are not relabelled as current evidence.

## Known limitations

- Staging server authorization, hashed single-use codes, persisted
  idempotency/audit events, and infrastructure rate limits are not deployed.
- The product adapter is memory-only; only the earlier guest session uses
  SecureStore.
- Invitation acceptance and code/deep-link contracts exist. Device sharing and
  scannable QR presentation still require implementation and proof.
- Calendar view selection/layers/events are implemented; full grids,
  recurrence, offline behavior, and production persistence are later gates.
- Message Check is rule-based and does not call third-party AI.
- Current Simulator and real-iPhone screenshots remain required.

## Honest completion map

| Area | Status |
| --- | ---: |
| Quiet-premium information architecture | 85% |
| Secure invitation product flow | 65% |
| Layered calendar product flow | 55% |
| Per-chat Message Check | 70% |
| Typed staging compatibility client | 75% |
| Staging server implementation | 0% |
| Automated verification | 90% |
| Current device verification | 0% |
| Overall production-native v2 | 24% |

## Next best move

Implement the staging `/api/v2` invitation slice first: authorization, hashed
single-use codes, rate limiting, idempotency, optimistic concurrency, and
append-only audit events. Then connect the existing UI and run one Simulator
pass followed by one real-iPhone staging pass. Do not expand into calling,
billing, or production migration before that proof.
