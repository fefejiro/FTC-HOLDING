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
| Maestro invitation and calendar-sharing flows | SIMULATOR VERIFIED | iPhone 17 Pro / iOS 26.5; `docs/evidence/maestro-2026-08-04` |
| Real-iPhone staging evidence | NOT STARTED | Requires deployed staging slice and controlled device session |
| Staging `/api/v2` invitation handler core | AUTOMATED VERIFIED | Reviewed Node host plus framework-neutral route/service tests; not deployed |
| Postgres staging repository and migration | AUTOMATED VERIFIED | Migration executed twice against embedded PostgreSQL; database constraints plus create/resolve/accept/grant/audit path passed |
| Shared staging rate limiter | AUTOMATED VERIFIED | Atomic Postgres upsert contract; not deployed |
| Trusted staging session boundary | AUTOMATED VERIFIED | Bearer authenticator bridge ignores spoofed actor headers |
| Staging host health/fail-closed readiness | AUTOMATED VERIFIED | Local `/health` returned 200; `/readyz` returned 500 with the database intentionally unavailable |
| Real HTTP invitation lifecycle and host restart | AUTOMATED VERIFIED | Loopback create/resolve, host restart, accept, persisted grant/audit, CORS and log-redaction proof |
| Staging migration and runtime-role separation | AUTOMATED VERIFIED | distinct database identities, advisory-locked migration, PUBLIC revocation, least-privilege grants, and guardrails |
| Post-deploy readiness smoke | AUTOMATED VERIFIED | safe-target validation plus `/health` and `/readyz` response tests; not run against a deployed service |
| Persistent staging deployment | NOT STARTED | Requires isolated database/service provisioning and secret injection |

## Verification

```text
guardrails       passed
typecheck        passed
Jest/RNTL        27 suites / 155 tests passed
embedded SQL     migration, constraints, HTTP restart, acceptance, grant, audit passed
coverage         86.28 statements / 80.37 branches / 81.11 functions / 89.45 lines
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

The screenshots under `docs/evidence/maestro-2026-08-04` prove the current
invitation sender and calendar-layer sharing journeys on an iPhone 17 Pro
Simulator running iOS 26.5. Maestro 2.8.0 created invitation code `P00001`,
verified the scannable QR accessibility element, scrolled the calendar action
fully into view, confirmed sharing, and verified the resulting **Make private
Parenting Time** control. The product runtime was prepared from clean source
commit `7f01845c`; the corrected proof definitions were executed at
`afefbe31`. The bundle remained `ca.peacepad.nextnative.lab`, diagnostics and
production writes remained disabled, and every value was fictional and
session-only.

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
- Railway config now runs the reviewed migration entrypoint before service
  startup. The migration owner and runtime database credentials must be
  distinct. An advisory lock serializes migration; PUBLIC access is revoked;
  and only schema usage plus table CRUD and sequence usage are granted to the
  dedicated runtime role. Provisioning and a live smoke test remain open.
- The HTTP host is dependency-injected and verified over a real loopback TCP
  socket. A fictional owner creates an invitation, a fictional recipient
  resolves it, the host restarts, and acceptance succeeds from the persisted
  resolution claim. This is not a managed database failover or load test.
- The invitation handler core now verifies trusted actors, family permission,
  region/version headers, idempotency, peppered code hashes, expiry, single
  use, resolution claims, local rate limits, and hash-linked audit events.
  In-memory adapters remain available only for deterministic tests.
- A Postgres-backed store, transactional unit-of-work boundary, shared
  Postgres rate limiter, trusted-session bridge, staging-only runtime factory,
  and isolated schema migration now exist. The migration and complete
  invitation acceptance transaction run successfully against embedded
  PostgreSQL, but no networked staging service has been provisioned.
- Invitation-resolution proof is persisted as an expiring peppered subject
  hash, so accept/decline authorization survives a process restart or a second
  service instance without storing the submitted code or bearer token.
- The migration is executed by `npm run test:sql` using a disposable embedded
  PostgreSQL engine. This proves DDL compatibility, database constraints, and
  repository behavior without a paid service. It does not prove network/TLS,
  runtime roles, multi-process concurrency, backups, or managed-service
  operations.
- Durable idempotency values and rate-limit subjects are peppered before
  persistence; plaintext invitation codes, deep links, and raw limiter keys are
  not represented by the staging schema.
- The product adapter is memory-only; only the earlier guest session uses
  SecureStore.
- Invitation creation and scannable QR presentation are Simulator verified.
  Native share-sheet delivery, deep-link handoff, acceptance, and revocation
  remain automated-verified and still require a real-device pass.
- Calendar view selection/layers/events and Month/Week/Day presentations are
  implemented for the fixed fictional August 2026 fixture. Date navigation,
  recurrence, offline behavior, and production persistence are later gates.
- Message Check is rule-based and does not call third-party AI.
- Calendar layer sharing is Simulator verified; all real-iPhone staging
  evidence remains required.
- Reusable Maestro flows now pass for invitation QR and calendar sharing. The
  first-run bootstrap flow documents the one Expo Go onboarding tap that is not
  exposed through the native accessibility hierarchy.
- Core navigation, invitation mode, calendar view, layer visibility/sharing,
  Message Check disclosure, and opt-out controls now expose named roles and
  selected, checked, expanded, or disabled state. Primary and compact controls
  have 44- or 48-point minimum targets. A release guard rejects disabled font
  scaling and likely encoding corruption. This is automated accessibility
  verification only; VoiceOver, large-text layout, contrast, Switch Control,
  and real-device evidence remain open.
- At a system font scale of 1.35 or higher, Home actions stack into one column,
  primary navigation grows from 48 to 68 points and permits two-line labels,
  calendar layer controls stack vertically, and the Message Check enabled row
  stops forcing side-by-side content. Unit and rendered integration tests prove
  the responsive switch at 1.6x. A 200% Simulator screenshot/VoiceOver pass is
  still required before this becomes device-verified.
- iOS now uses native adaptive semantic colours while Android retains the
  reviewed light palette until its separate theme implementation. App chrome,
  primary surfaces, cards, inputs, success/warning/error states, and status bar
  follow the iOS system appearance. Automated contrast checks keep core light
  and dark text/action pairs at WCAG AA (4.5:1 or greater). A dark Simulator
  screenshot and assistive-technology pass remain required.
- A controlled iPhone 17 Pro / iOS 26.5 dark-theme and accessibility-extra-large
  Simulator attempt on source commit `959698dc` bundled successfully. Expo Go's
  first-run developer sheet then obscured the product. The single retry used a
  direct Simulator URL to avoid SSH GUI activation, but the sheet could not be
  dismissed because Maestro had no Java runtime and macOS denied SSH Apple
  Events access. No obscured screenshot was retained or represented as product
  evidence. This visual gate is **BLOCKED** until a local GUI session can dismiss
  the one-time sheet or a signed development build replaces Expo Go.
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
| Staging invitation server core | 85% |
| Automated verification | 95% |
| Accessibility foundation | 45% |
| Adaptive theme foundation | 55% |
| Current device verification | 82% |
| Overall production-native v2 | 42% |

## Next best move

Do not repeat the blocked Expo Go remote-control attempt. Prepare the isolated
networked staging deployment with an explicit migration command, least-privilege
runtime role, and post-deploy readiness smoke test. After that gate passes, use
one controlled real-iPhone staging session for invitation, calendar, theme, and
large-text evidence. A future Mac GUI session may close the one-time Expo Go
sheet, or a signed development build can replace Expo Go. Do not expand into
calling, billing, or production migration before these gates pass.
