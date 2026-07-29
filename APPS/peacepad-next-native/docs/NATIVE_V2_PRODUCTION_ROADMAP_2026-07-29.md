# PeacePad Native v2 Production Roadmap

Date: 2026-07-29

## Decision

PeacePad Next Native is the planned full native iOS successor to the live
React Web + Capacitor version 1 application.

Version 1 remains the production baseline and rollback path until native v2
passes every production, privacy, migration, device, and App Store gate in this
document.

This decision does not authorize:

- changing the lab bundle ID;
- writing to production from the lab;
- creating a second App Store record;
- uploading an unverified native build;
- using real family or court documents;
- removing the live Capacitor application.

## Verified starting point

The native workspace currently has:

- Expo SDK 54 and React Native 0.81;
- bundle ID `ca.peacepad.nextnative.lab`;
- production API writes disabled;
- typed in-memory state for one synthetic Premium flow;
- React Navigation;
- 3 passing test suites and 18 passing tests;
- passing TypeScript and lab guardrails.

It does not yet have production authentication, API integration, database
storage, secure evidence storage, offline recovery, real uploads, real export,
billing, or a complete device and accessibility matrix.

Overall production readiness is approximately 15%.

## Delivery sequence

### Gate 0 - Close version 1 launch acceptance

Target: 1-2 days

- Install version 1 from the public App Store on a real iPhone.
- Verify first launch and guest Compose.
- Verify ordinary and reviewer account access.
- Verify Privacy, Terms, Support, export, and account-deletion entry points.
- Record crashes and public screenshot/icon propagation.
- Save the approved promotional text.
- Freeze version 1 except for critical production fixes.

Exit evidence:

- real-iPhone acceptance record;
- public listing baseline;
- documented production rollback version and build.

### Gate 1 - Native production foundation

Target: 1-2 focused weeks

Build:

- explicit lab, staging, and release-candidate environments;
- typed API client and error envelope;
- secure session-token contract;
- query/cache and restart-recovery behavior;
- redacted diagnostics;
- feature flags and kill switches;
- app-level error and loading boundaries.

First staging-connected journey:

```text
Welcome
-> Terms and Privacy
-> optional AI consent remains off
-> guest session
-> message preview
-> app restart
-> session recovery or clean expiry
```

Exit evidence:

- automated contract and integration tests;
- Simulator proof;
- real-iPhone staging proof;
- offline, timeout, server-error, and restart proof;
- no production writes.

### Gate 2 - Review-critical version 1 parity

Target: 3-6 focused weeks

Implement and verify:

- existing-account sign-in and session restoration;
- guest and account Compose;
- rule-based preview and optional AI rewrite consent;
- invitations and deep links;
- Privacy, Terms, and Support;
- data export;
- permanent account deletion;
- permission denial and recovery;
- compatibility with existing accounts and stored data.

Create a parity matrix for every feature advertised on the public version 1
listing. Each feature must be:

- implemented in native v2;
- deliberately deferred and removed from v2 metadata; or
- explicitly deprecated with a user-safe migration decision.

Exit evidence:

- existing version 1 accounts and data work unchanged;
- review-critical paths pass contract, integration, and device tests;
- privacy declarations match observed native traffic and storage.

### Gate 3 - Production Premium vertical slice

Target: 3-6 focused weeks after Gate 2

Implement:

```text
Goal Setup
-> Case Binder
-> Evidence picker and upload
-> Evidence Detail review
-> Source-linked Timeline
-> Export and share
```

Approve before implementation:

- evidence privacy and threat model;
- ownership and authorization rules;
- retention and deletion cascade;
- local encryption and screenshot/cache policy;
- offline ownership and conflict rules;
- interrupted-upload recovery;
- export redaction and provenance rules.

Exit evidence:

- authenticated ownership enforcement;
- private retrieval;
- deletion cascade;
- interrupted-upload recovery;
- offline reconciliation;
- genuine file export and share;
- synthetic-data end-to-end proof.

### Gate 4 - Release hardening

Target: 2-3 focused weeks

- Signed Debug and Release builds.
- Privacy manifest, entitlements, and purpose strings.
- Production icon, splash, deep links, and notification configuration.
- Small and large iPhone, supported iPad, dark mode, Dynamic Type, VoiceOver,
  reduced motion, poor network, background/foreground, upgrade, performance,
  and crash checks.
- Internal TestFlight, followed by external TestFlight.
- Upgrade and rollback rehearsal.

Only after the release-candidate gate:

- configure the release flavor with `ca.peacepad.family`;
- set the marketing version to `2.0`;
- upload to the existing App Store record;
- keep version 1 public until native v2 is approved and released.

## Reuse plan

Reuse:

- existing production accounts and database;
- API domain and stable guest/auth/consent/message-preview/export/deletion
  contracts;
- version 1 consent and privacy wording;
- review-critical acceptance tests;
- native lab navigation, state types, validators, theme, and synthetic tests;
- version 1 ownership, quarantine, and deletion-safety patterns;
- current App Store record and brand assets.

Do not directly port:

- DOM, Radix, or Tailwind components;
- browser `localStorage`;
- Capacitor plugins;
- WebView cookie assumptions;
- unreviewed analytics or logging;
- unsupported privacy or security claims.

## Release and versioning rule

There will be one public PeacePad App Store record.

The lab stays `ca.peacepad.nextnative.lab`. A separately gated release
configuration may use `ca.peacepad.family` only when feature parity, migration,
signing, privacy, and TestFlight requirements have passed.

Uploading a native v2 TestFlight candidate must not remove or replace the public
version 1 binary.

## Current completion

| Area | Estimate |
|---|---:|
| React Native / Expo shell and tooling | 70% |
| Synthetic native UX prototype | 55% |
| Production authentication and API integration | 5% |
| Review-critical version 1 parity | 10% |
| Secure evidence upload and export | 0-5% |
| Offline and restart recovery | 0% |
| Device and accessibility QA | 5-10% |
| App Store v2 readiness | 5% |
| Overall production-native v2 | Approximately 15% |

Planning estimate:

- core native TestFlight candidate: roughly 8-14 focused weeks;
- full replacement: longer if calling, notifications, calendar, expenses, and
  every broad version 1 capability remain mandatory.

These are planning ranges, not delivery guarantees.

## Immediate sprint

Do not add more standalone mock screens.

The next implementation sprint is Gate 1:

```text
staging environment
-> typed API client
-> secure guest session
-> explicit consent
-> rule-based message preview
-> restart and error recovery
```

The sprint must end with automated tests plus one controlled Simulator and
real-iPhone staging pass.
