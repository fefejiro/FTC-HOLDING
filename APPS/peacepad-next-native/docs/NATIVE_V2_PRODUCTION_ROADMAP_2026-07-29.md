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

The isolated native workspace currently records:

- Expo SDK 54 and React Native 0.81;
- bundle ID `ca.peacepad.nextnative.lab`;
- production writes and diagnostics disabled;
- typed native task shell and coordination client;
- trusted fictional staging sessions stored device-only after consent;
- durable local PostgreSQL proof for invitations, calendar, messaging,
  receipts, corrections, search, Message Check preferences, and metadata-only
  attachment intents;
- real loopback HTTP and host-restart proof;
- 37 passing Jest/RNTL suites and 244 passing tests;
- 81.31% statements, 76.88% branches, 78.64% functions, and 86.64% lines;
- standalone Expo Doctor 18/18;
- passing iOS export with 963 modules bundled;
- current Simulator evidence using fictional values only.

This proof is local and Simulator-based. It does not prove a deployed staging
service, real-iPhone networking, existing-account/data compatibility, secure
byte ingestion, object storage, backup restoration, production migration, or
App Store readiness. Production readiness is therefore reported by promotion
gate, not a percentage.

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

## Current promotion position

| Gate | Current truth |
| --- | --- |
| Version 1 production baseline | VERIFIED |
| Native Simulator foundation | VERIFIED |
| Local durable API/database proof | VERIFIED |
| PR integration and reviewability | BLOCKED |
| Isolated deployed staging | NOT STARTED |
| Real-iPhone staging proof | NOT STARTED |
| Review-critical version 1 parity | PARTIAL / UNPROVEN |
| Secure byte ingestion | NOT STARTED |
| Evidence integrity pipeline | PROPOSED |
| Production migration | NOT AUTHORIZED |
| Native v2 App Store release | NOT STARTED |

Planning ranges remain directional only. They are not completion claims. Calls,
recording, expenses, payments, broad notifications, professional accounts,
court-form generation, AI OCR, and production migration remain paused.

## Immediate execution order

Do not add more standalone mock screens or another broad feature batch.

1. Approve the PR #148 disposition and PR #160 decomposition.
2. Finish the attachment-intent boundary without accepting bytes.
3. Deploy isolated staging with fictional accounts and operational smoke proof.
4. Complete a two-account real-iPhone pass.
5. Close review-critical version 1 parity and compatibility.
6. Build generated-byte SourceArtifact proof locally.
7. Introduce private staging object storage only after the prior gates pass.

The current Gate 1 automated and Simulator foundation is verified. Gate 1 is
not complete because isolated deployed staging, real-iPhone proof, weak-network
and offline matrices, and production-compatible identity remain open.

See [Next handover](./NEXT_HANDOVER_2026-08-05.md) for the exact continuation
contract and stop conditions.
