# PeacePad Architecture Decision

Status: Phase 1 architecture decision record  
Date: 2026-07-23  
Decision: keep the submitted React web + Capacitor architecture as the production path; build PeacePad Next incrementally; keep React Native as a research lane only.

## Context

VERIFIED: PeacePad iOS v1 has been submitted to Apple App Review. The submitted app uses:

```text
React Web Application
→ Capacitor Native Shell
→ Existing iOS Xcode Workspace
→ App Store Connect
→ TestFlight / App Store
```

VERIFIED: The active source under `APPS/peacepad` is:

- React + Vite frontend.
- Node/Express/TypeScript backend.
- PostgreSQL + Drizzle schema.
- Capacitor iOS and Android wrappers.
- Production frontend at `peacepad.ca`.
- Production API at `api.peacepad.ca`.

VERIFIED: `capacitor.config.ts` uses:

- `appId: ca.peacepad.family`
- `appName: PeacePad`
- production URL: `https://peacepad.ca`
- native wrappers for iOS and Android.

VERIFIED: The release packet records App Store submission for iOS app version `1.0`, build `1.0.9 (1)`.

## Decision

PROPOSED/ADOPTED for Phase 1 planning:

1. Do not rewrite PeacePad during Apple review.
2. Do not migrate the current product to React Native during this task.
3. Do not change the submitted iOS build, bundle ID, certificates, provisioning, metadata, pricing, screenshots, or App Store review state unless Apple raises a specific issue or the founder explicitly authorizes replacement submission.
4. Build PeacePad Next first as a governed evolution of the current React/Express/Capacitor app.
5. Treat React Native/Expo as a separate spike only after the current iOS release is live/tested and the Premium Delta data model is stable.

## Rationale

VERIFIED: The current stack already got through the hardest release gate: Xcode archive, App Store Connect build selection, screenshot fixes, pricing/availability, and App Review submission.

VERIFIED: The existing app already contains the core foundations needed for PeacePad Next:

- guest compose and tone rewrite;
- authenticated messaging;
- calendar/events;
- scheduled calls and call preferences;
- file-upload patterns;
- receipt uploads;
- audit/export ideas;
- account export/deletion;
- support resources;
- safety-plan encryption;
- analytics/usage foundations;
- iOS and Android native wrappers.

INFERRED: A React Native rewrite now would add delivery risk without solving the immediate product questions. The bigger unknowns are not "which client framework?" but:

- what users will repeatedly use;
- what records need to be preserved;
- what privacy/security level the evidence vault requires;
- what Apple/legal/privacy boundaries apply to AI, calls, documents, and child-related features;
- whether users will pay for premium organization/export workflows.

## Alternatives considered

### Option 1: Continue React web + Capacitor

Status: SELECTED.

Strengths:

- VERIFIED: production app and release pipeline already exist.
- VERIFIED: iOS build is submitted.
- VERIFIED: codebase already contains features and patterns PeacePad Next can reuse.
- Lower migration risk.
- Faster iteration for onboarding, analytics, parenting-time logs, and evidence foundation.

Weaknesses:

- Some native workflows may be harder: background calls, native document picker, deep offline capture, share-sheet import, and WebRTC edge cases.
- Mobile polish requires disciplined safe-area, keyboard, and device QA.

### Option 2: Full React Native rewrite now

Status: REJECTED for current phase.

Strengths:

- Better long-term native UX possibilities.
- Better native document picker/share-sheet path.
- Cleaner mobile-only interaction model.

Weaknesses:

- Would interfere with the submitted iOS release if treated as replacement.
- No verified local PeacePad RN/Expo source tree found.
- Would multiply architecture, release, QA, and credential complexity.
- Does not answer product validation questions by itself.

### Option 3: Parallel React Native spike

Status: PROPOSED later, not current implementation.

Allowed later scope:

- onboarding carousel;
- calm rewrite screen;
- parenting-event screen;
- one document-upload flow;
- local navigation;
- synthetic data only.

Must not:

- use production bundle ID;
- connect to production database;
- upload to App Store Connect;
- replace the submitted app;
- access private legal materials;
- duplicate backend business rules unnecessarily.

### Option 4: Native Swift

Status: UNKNOWN/DEFER.

Potentially strong for iOS polish and App Store-native behavior, but likely too expensive for current solo-founder constraints and would not reuse much current product logic.

### Option 5: Hybrid shared-domain architecture

Status: PROPOSED as long-term target.

Keep backend domain contracts stable while allowing multiple clients:

```text
Current Web/Capacitor Client
        ↓
Shared API Contracts and Domain Models
        ↓
Express/API + Postgres + Object Storage
        ↑
Future React Native Client / Professional Portal
```

## Architecture direction for PeacePad Next

### Keep

VERIFIED/PROPOSED:

- React/Vite frontend for current app.
- Express API.
- Drizzle/PostgreSQL schema.
- Capacitor iOS/Android wrappers.
- Guest compose route.
- Existing `/api/messages/preview` contract.
- Account export/deletion foundation.
- Current App Store review track.

### Add incrementally

PROPOSED:

- Feature flags for unfinished premium features.
- Privacy-conscious analytics layer.
- Case Binder data model.
- Private object storage abstraction.
- Evidence hash/provenance metadata.
- Parenting-time event model.
- Child-call schedule/log model.
- Manual timeline.
- Export package model.
- AI safety and source-citation layer.

### Do not add yet

PROPOSED:

- Billing implementation.
- Real-time call reactivation.
- Call recording/transcription.
- OCR pipeline.
- Professional accounts.
- React Native app.
- Court-form automation.
- Public/legal claims of admissibility.

## Data architecture implications

VERIFIED current useful entities:

- `users`
- `guest_sessions`
- `messages`
- `notes`
- `tasks`
- `child_updates`
- `children`
- `events`
- `schedule_templates`
- `expenses`
- `calls`
- `scheduled_calls`
- `call_preferences`
- `call_recordings`
- `support_resources`
- `audit_logs`
- `push_subscriptions`
- `safety_plans`
- `prep_chat_sessions`

PROPOSED new entities for Premium:

- `case_binders`
- `case_participants`
- `case_documents`
- `case_document_versions`
- `evidence_items`
- `evidence_tags`
- `evidence_event_links`
- `parenting_time_logs`
- `contact_attempts`
- `child_call_logs`
- `document_processing_jobs`
- `document_ai_summaries`
- `case_timeline_items`
- `export_packages`
- `export_package_items`
- `premium_entitlements`

## Security and privacy direction

VERIFIED: current code has user export/delete endpoints and encrypted safety-plan storage.

PROPOSED for Next:

- No court/evidence files in Git.
- No private court records as fixtures.
- No sensitive payloads in analytics.
- No message bodies or file contents in telemetry.
- Private object storage instead of local/static upload serving for evidence vault.
- File hash and provenance tracking, but never market hashes as legal admissibility proof.
- AI summaries must be source-linked, uncertainty-labeled, and user-confirmed.
- Legal boundaries: PeacePad prepares and organizes; it does not advise, decide, or guarantee outcomes.

## Decision checkpoint

Do not start Phase 2 implementation until the founder approves:

1. this architecture decision,
2. the feature inventory,
3. the reuse matrix,
4. the implementation queue/order,
5. the first PR batch.

