# PeacePad Native Architecture Decision Gate

Date: 2026-07-25
Status: SUPERSEDED 2026-07-29
Evidence baseline: PR #148, commit `7a713fb61834f4b7b32c1538882cf666d128b4f9`

## Superseding decision

The product direction is now to develop PeacePad Native as the full iOS v2
successor while retaining the approved Capacitor version 1 as the live
production and rollback baseline.

This changes the destination, not the safety gates. Native v2 must reach
review-critical feature parity, preserve existing users and data, pass privacy
and device verification, and complete TestFlight acceptance before it can use
the production bundle ID or replace version 1.

See
[`NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md`](./NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md)
for the active decision and milestone plan. The analysis below is retained as
the historical 2026-07-25 decision record.

## Decision

**Recommend: adopt selected native concepts into the current Capacitor product.**

Keep the React Native lab as a reviewable product and testing reference, but do not begin a parallel client or full migration yet.

The lab proves that the Premium journey can be expressed as one coherent, typed, testable flow. It does not yet prove enough native-only advantage to justify duplicating the released client, rebuilding authentication and storage, or accepting a second mobile release path.

No implementation is authorized by this document. The submitted Capacitor app remains unchanged.

## Options

Scores use `1` for weakest/highest burden and `5` for strongest/lowest burden.

| Criterion | React Web + Capacitor | Capacitor + selected plugins | Parallel RN client | Full RN migration |
| --- | ---: | ---: | ---: | ---: |
| UX improvement | 2 | 4 | 5 | 5 |
| Existing code reuse | 5 | 4 | 2 | 1 |
| Evidence upload | 3 | 5 | 5 | 5 |
| Offline persistence | 3 | 5 | 5 | 5 |
| Notifications | 3 | 5 | 5 | 5 |
| WebRTC / calling | 3 | 4 | 5 | 5 |
| Accessibility potential | 3 | 4 | 5 | 5 |
| Security controllability | 3 | 4 | 4 | 4 |
| Automated testing maturity today | 4 | 4 | 3 | 2 |
| Release simplicity | 5 | 4 | 2 | 1 |
| Migration effort | 5 | 4 | 2 | 1 |
| Rollback safety | 5 | 5 | 4 | 2 |
| Maintenance cost | 5 | 4 | 2 | 2 |
| **Total** | **49** | **56** | **49** | **43** |

The numbers are directional decision aids, not claims of measured production performance.

## 1. Current React Web + Capacitor

### Strengths

- Maximum reuse of the existing web UI, API contracts, and release knowledge.
- One product surface and one rollback path.
- The submitted App Store client remains the operational baseline.
- Browser and web automation remain straightforward.

### Limits

- Complex mobile form flows can retain a web-like feel.
- File-system, background, notification, and offline behaviors need deliberate native bridges.
- Native interaction polish can be constrained without targeted work.

### Best fit

Stable near-term releases where native-only requirements remain modest.

## 2. Capacitor with selective native plugins

### Strengths

- Preserves the released application and most code reuse.
- Can add native document picking, encrypted local persistence, notifications, camera access, and calling capabilities incrementally.
- Each capability can be separately threat-modelled, tested, feature-flagged, and rolled back.
- Avoids maintaining two clients while PeacePad product-market learning is still active.

### Limits

- Plugin quality and platform support must be audited.
- Native plugins do not automatically make the overall UX feel native.
- WebRTC/background execution still require careful iOS lifecycle testing.

### Best fit

The current PeacePad stage: improve the existing product with narrowly justified native capabilities after privacy and architecture approval.

## 3. Parallel React Native client

### Strengths

- Allows native UX research without immediately replacing Capacitor.
- Provides a rollback path because Capacitor remains live.
- Can target the highest-value mobile journeys first.

### Limits

- Two clients multiply QA, accessibility, release, analytics, and security work.
- Shared backend contracts become a hard dependency.
- Feature drift is likely for a small team.
- The current lab has not yet proven device quality, secure storage, offline recovery, or real uploads.

### Best fit

A later stage with stable API contracts, dedicated mobile capacity, and evidence that native UX materially improves retention or trust.

## 4. Full React Native migration

### Strengths

- Maximum control over native interaction patterns and device capabilities.
- One native client after migration is complete.

### Limits

- Highest migration and release risk.
- Rebuilds working authentication, routing, storage, analytics, and operational knowledge.
- Weakest rollback once the native client replaces Capacitor.
- Requires complete device, accessibility, security, offline, and App Store regression matrices.
- Current automated prototype evidence is insufficient to justify this cost.

### Best fit

Only after a parallel native proof demonstrates material product gains and the migration can be funded and staffed.

## Capability decisions

| Capability | Recommended direction before implementation |
| --- | --- |
| UX | Apply the lab's guided vertical-slice hierarchy to Capacitor first |
| Evidence upload | Approve privacy model, then evaluate a Capacitor document-picker plugin |
| Offline persistence | Define encrypted local-data and conflict rules before selecting technology |
| Notifications | Add narrowly scoped Capacitor notifications only after consent and reminder rules |
| WebRTC / calling | Run a separate consent, background-mode, and reliability spike |
| Accessibility | Test the current Capacitor flow and lab prototype against the same matrix |
| Security | Threat-model evidence metadata, local cache, logs, screenshots, and exports first |
| Testing | Port the lab's state/validation contracts into technology-neutral tests where possible |
| Release | Preserve one live client until a native alternative is demonstrably superior |

## Approval gates before any native integration

1. Current Capacitor release is tested end to end on a real iPhone.
2. Evidence privacy, retention, deletion, and threat models are approved.
3. Backend contracts for binder, evidence metadata, timeline, and export are stable.
4. Offline ownership and conflict rules are defined.
5. Accessibility acceptance criteria are agreed.
6. Native capability is tied to a measurable user problem.
7. Rollback and feature-flag behavior are documented.

Until these gates are approved, do not begin backend integration, authentication, real upload, secure storage, file export, billing, App Store work, or bundle changes.

## PR #148 disposition

Keep PR #148 **draft** until the current six-screen simulator evidence gate is completed. If the simulator gate passes later, merge it explicitly as a non-production lab/reference—not as authorization to migrate.
