# PeacePad Native Coordination Scope

## Purpose

This stacked change adds the reviewable coordination layer on top of the isolated native foundation. It remains a non-production React Native/Expo client with fictional in-memory coordination data and device-local retry intent storage.

## Included

- Quiet task navigation: Home, Messages, Calendar, Records, and More
- Expiring invitation creation, preview, acceptance, decline, and revocation contracts
- Calendar layers with Month, Week, and Day views and explicit sharing confirmation
- Message Check, original-draft preservation, explicit send, corrections, search, and bounded retry
- Typed `/api/v2` compatibility client plus an isolated fictional adapter
- Accessibility labels, state-derived summaries, safe route fallback, and production-write guardrails

## Excluded

- Case Binder and attachment intents (next stacked records change)
- Networked staging services and production authentication (later staging change)
- Calls, expenses, billing, notifications, professional portal, and production migration
- Real family information, court records, file bytes, and `SourceArtifact`

## Safety proof

- Bundle identifier: `ca.peacepad.nextnative.lab`
- `productionApiWritesEnabled: false`
- Live Capacitor source under `APPS/peacepad` is unchanged
- Default coordination adapter is fictional and in-memory
- Diagnostics remain disabled unless explicitly enabled in the local lab

## Source mapping

The implementation was reconstructed selectively from the previously published native work, with unsafe or out-of-scope portions removed. Relevant source commits are:

- `02d19cf5` task shell and quiet presentation
- `a2e0c7cc`, `1a73be3d`, `473080c4` invitation and calendar interaction depth
- `53fb49bc`, `e0936d2e`, `11178833`, `1c94ef8f` messaging, correction, search, and retry behavior
- `386428a1` final pre-attachment coordination boundary

No whole commit was replayed. Every included file was reviewed against this scope.

## Local verification

- Clean workspace dependency install: LOCAL VERIFIED
- Semantic lockfile comparison: 3,450 base keys preserved; zero removed
- Guardrails and TypeScript: LOCAL VERIFIED
- Jest/RNTL: 11 suites, 101 tests; LOCAL VERIFIED
- Coverage: 85.12% statements, 78.22% branches, 83.50% functions, 87.73% lines
- Standalone Expo Doctor: 18/18 checks; LOCAL VERIFIED
- iOS export: 950 modules; LOCAL VERIFIED
- Expo config: lab bundle and production writes disabled; LOCAL VERIFIED
- Secret scan and live Capacitor diff: LOCAL VERIFIED
