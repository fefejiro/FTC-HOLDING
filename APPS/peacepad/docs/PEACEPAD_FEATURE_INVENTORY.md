# PeacePad Feature Inventory

Status: Phase 1 audit only  
Date: 2026-07-23  
Scope: features discovered in local repo state; no production code changes; no private court documents inspected.

## Inventory summary

| Feature area | Current evidence | Status | Recommendation |
| --- | --- | --- | --- |
| Guest-first calm compose | `client/src/pages/compose.tsx`, `server/routes.ts` `/api/messages/preview`, `client/src/lib/guestSession.ts` | VERIFIED current core surface | Reuse directly; keep intervention-first. |
| Authenticated chat/messaging | `client/src/pages/chat.tsx`, `messages` table, `/api/messages`, `/api/conversations` | VERIFIED | Reuse/refactor selectively. |
| Tone/preflight rewrite | `/api/messages/preview`, `/api/actions/preview-tone`, v2 rewrite module, extension local rules | VERIFIED | Reuse; add stricter AI safety and source labels. |
| Onboarding | `/onboarding`, `client/src/pages/onboarding.tsx`, `SingleSlideWelcome`, carousel UI component | VERIFIED but needs UX modernization | Refactor into goal-based onboarding. |
| Calendar/scheduling | `events`, `schedule_templates`, `/api/events`, `/api/events/export/ical`, `/scheduling` | VERIFIED | Reuse as parenting-time foundation. |
| Expenses/receipts | `expenses`, receipt upload endpoint, `client/src/pages/expenses.tsx` | VERIFIED | Reuse upload + metadata lessons; harden storage. |
| Call scheduling/preferences | `scheduled_calls`, `call_preferences`, `ScheduleCallDialog`, `/api/scheduled-calls`, `/api/call-preferences` | VERIFIED | Reuse for child-call proof. |
| Real-time audio/video calls | WebRTC contexts, `VideoCallDialog`, `server/webrtc-signaling.ts`, CallEngineV2 | STALE/PARTIAL | Lessons only until real-device proof. |
| Direct call mutation endpoints | `/api/calls` and related endpoints | VERIFIED disabled | Keep hidden; re-enable only behind flag after tests. |
| Call recordings/transcripts | `call_recordings`, `/api/call-recordings`, transcription endpoints | VERIFIED code exists | Redesign with explicit consent/legal review. |
| Audit trail/export | `audit_logs`, `/api/audit-trail`, `client/src/pages/audit-trail.tsx` | VERIFIED code exists, route not verified | Refactor language + route intentionally. |
| Evidence/document vault | uploads for messages/receipts/profile/recordings | INFERRED foundation only | Build new case-document model; do not reuse local disk as final vault. |
| Account deletion/export | `/delete-account`, `/api/user/export`, `/api/user/account` | VERIFIED | Reuse; expand for evidence vault retention/export. |
| Support/resource directory | `/support`, `/resources`, `support_resources`, therapist routes | VERIFIED | Reuse with jurisdiction/freshness metadata. |
| Safety plan | `safety_plans`, encrypted safety plan storage, `/api/safety-plan` | VERIFIED | Reuse carefully; keep separate from legal/case evidence. |
| Analytics/instrumentation | `client/src/lib/analytics.ts`, `usageMetrics`, `userStats`, web update telemetry | VERIFIED foundation | Redesign privacy-conscious event taxonomy. |
| Subscriptions/monetization | `users.subscriptionTier`, `/api/usage/status`, old Git commit mentions Stripe | PARTIAL/STALE | Define tiers; do not implement billing yet. |
| Chrome extension external composer guard | `APPS/peacepad-extension` | VERIFIED sibling product | Reuse local rules/UX, not as core mobile feature. |
| React Native/Expo PeacePad | no local source found | UNKNOWN | Research lane only. |

## Detailed feature notes

### 1. Communication and calm rewrite

VERIFIED:

- `client/src/pages/compose.tsx` exists as the no-login/guest-first compose surface.
- `server/routes.ts` exposes `POST /api/messages/preview`.
- `server/routes.ts` exposes `POST /api/actions/preview-tone`.
- `server/v2/modules/rewriteMessage.ts` provides v2 rewrite-module infrastructure.
- `APPS/peacepad-extension/src/localRules.ts` provides local message-risk rules.

Completeness: high for current v1 value proposition; medium for premium-grade external channel support.

Test coverage: VERIFIED by memory and repo files: Playwright compose tests exist under `tests/e2e/p1-critical/compose-intervention.spec.ts`; extension rule tests exist under `APPS/peacepad-extension/tests`.

Recommendation: reuse directly. Keep "calm mediator, not referee"; do not generate threats, diagnoses, allegations, or legal conclusions.

### 2. Onboarding and activation

VERIFIED:

- `client/src/App.tsx` routes `/onboarding`.
- `client/src/pages/onboarding.tsx` exists.
- `client/src/components/SingleSlideWelcome.tsx` exists.
- `client/src/components/ui/carousel.tsx` wraps `embla-carousel-react`.
- `server/routes.ts` includes `/api/onboarding/step` and `/api/onboarding/status`.

Completeness: medium. There is an onboarding foundation, but the founder brief requires a more intentional modern sequence and first-value flow.

Recommendation: refactor after Apple review is complete into:

1. goal selection,
2. calm rewrite,
3. parenting arrangement/event,
4. child-call log,
5. evidence upload,
6. timeline preview.

### 3. Parenting time, calendar, and schedules

VERIFIED:

- `shared/schema.ts` contains `events` and `schedule_templates`.
- `server/routes.ts` exposes event CRUD and iCal export.
- `client/src/pages/scheduling.tsx` and `client/src/components/SchedulingDashboard.tsx` exist.

Completeness: medium for general calendar/scheduling; not yet a premium parenting-time evidence model.

Recommendation: reuse date/time UI, event CRUD patterns, and iCal export. Add new explicit parenting-time entities rather than overloading generic events.

### 4. Child calls and call/contact proof

VERIFIED:

- `shared/schema.ts` contains `calls`, `scheduled_calls`, `call_followups`, `call_preferences`, and `call_recordings`.
- `server/routes.ts` keeps scheduled-call and call-preference endpoints active.
- `server/routes.ts` marks direct call mutation endpoints as disabled/removed from MVP.
- `client/src/components/ScheduleCallDialog.tsx`, `PostMissedCallDialog.tsx`, `QuickCallButton.tsx`, `VideoCallDialog.tsx`, `client/src/pages/calls.tsx`, and `client/src/pages/call-preferences.tsx` exist.

Completeness: high for model/UX ideas; low for live calls because direct call endpoints are disabled and route exposure is unclear.

Recommendation: for PeacePad Next, prioritize call schedule/attempt/completion logs before real WebRTC calling. Re-enable direct calls only after a flag, route, real-device QA, consent review, and failure-mode handling.

### 5. Documents, evidence, and uploads

VERIFIED:

- `server/routes.ts` configures multer for chat attachments, voice notes, call recordings, receipts, and profile photos.
- `server/index.ts` statically serves `/uploads`.
- `shared/schema.ts` includes attachment metadata on `messages`, receipt metadata on `expenses`, and recording metadata on `call_recordings`.

UNKNOWN:

- No dedicated `case_documents`, `evidence_items`, immutable hash model, OCR job model, export manifest model, or private object-storage integration found in current schema.

Recommendation: redesign as a new Case Binder/Evidence Vault module. Reuse upload UI and file metadata ideas, but not local static upload storage as the final sensitive-evidence architecture.

### 6. Legal/court-prep workflows

VERIFIED:

- `server/routes.ts` exposes `/api/summaries/court-log` and other summary endpoints.
- `client/src/pages/audit-trail.tsx` has export logic for PDF/CSV/JSON and legal-documentation copy.
- `server/aiHelper.ts` and extension local rules include legal-escalation signals.
- Support/resource routes include legal-support resources.

Risk:

- "court-ready" or "legal documentation" language can overclaim. PeacePad must say "court-preparation draft", "chronological summary", "disclosure index", "lawyer-review package", or similar.

Recommendation: build Court Prep Workspace as a guarded drafting/export module with source citations, user confirmation, and legal-advice boundaries.

### 7. Account deletion, export, and privacy controls

VERIFIED:

- `client/src/pages/delete-account.tsx` exists and is routed.
- `server/routes.ts` includes `GET /api/user/export` and `DELETE /api/user/account`.
- `shared/schema.ts` includes `isDeactivated`, `deletedAt`, and `deletionScheduledFor`.
- `shared/schema.ts` includes AI consent fields `aiMessageConsent` and `aiCallConsent`.

Recommendation: reuse and expand for Premium data. Evidence vault must define export/delete behavior per original file, derived summary, timeline entry, audit record, and export package.

### 8. Analytics, usage, and retention

VERIFIED:

- `client/src/lib/analytics.ts` exists.
- `shared/schema.ts` includes `usage_metrics`, `user_stats`, `streaks`, `achievements`, `feedback`.
- `server/routes.ts` includes web-update telemetry and usage status.

Recommendation: replace broad/gamified success measures with privacy-conscious activation and retained-action metrics. Never send message bodies, file contents, child names, legal allegations, medical details, phone numbers, addresses, card data, or tokens to analytics.

### 9. Monetization/subscriptions

VERIFIED:

- `shared/schema.ts` includes `subscriptionTier`, `subscriptionStatus`, and `subscriptionActiveUntil`.
- `server/routes.ts` includes `/api/usage/status`.

STALE:

- Git history includes `feat(m3-m5): stripe billing...`, but this audit did not confirm a current Stripe checkout/entitlement flow.

Recommendation: document free/plus/premium/pro tiers now; do not implement billing until explicitly authorized.

### 10. Mobile/iOS/Android compatibility

VERIFIED:

- Capacitor config defaults production native shells to `https://peacepad.ca`.
- iOS workspace and App Store release docs exist.
- Android project and Play Store docs exist.
- Android `MainActivity.java` handles safe areas and WebRTC media permissions.

Recommendation: keep current Capacitor architecture through the submitted release. React Native is research-only until the product model is proven.

## Features to keep hidden from v1

PROPOSED:

- Evidence Vault.
- Court Prep Workspace.
- OCR and AI extraction.
- Lawyer/professional accounts.
- Paid subscription enforcement.
- Real WebRTC call resurrection.
- Call recording/transcription.
- React Native app.
- Jurisdiction-specific form generation.

## First implementation batch after approval

PROPOSED:

1. Documentation/source-of-truth alignment.
2. Privacy-safe analytics event schema.
3. Modern onboarding and goal selection.
4. Activation checklist.
5. Parenting-time event model.
6. Child-call schedule/log model.
7. Basic evidence-upload model with private-storage abstraction.
8. Manual timeline foundation.
9. Mobile safe-area and keyboard QA fixes.
10. Feature flags for unfinished premium surfaces.

