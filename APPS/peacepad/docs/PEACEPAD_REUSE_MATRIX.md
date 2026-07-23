# PeacePad Reuse Matrix

Status: Phase 1 audit only  
Date: 2026-07-23  
Rule: do not merge old code during audit. Every item below is a recommendation, not an implementation.

## Recommendation labels

- Reuse directly: compatible with current architecture and low conceptual risk.
- Refactor: useful but needs cleanup, routing, tests, security, or copy changes.
- Redesign using lessons only: product idea is useful; current code is too risky/stale/not production-suitable.
- Archive: keep for historical context.
- Discard: not useful or too risky.

## Matrix

| Capability | Source | Evidence label | Completeness | Risk | Recommendation | Proof required before implementation |
| --- | --- | --- | --- | --- | --- | --- |
| Guest calm compose | `client/src/pages/compose.tsx`; `/api/messages/preview`; `guestSession.ts` | VERIFIED | High | Low/medium privacy | Reuse directly | Existing Playwright smoke; verify no-auth path and mobile layout. |
| Tone preview/pre-send intervention | `server/routes.ts`; `server/toneClassifier.ts`; `server/v2/modules/rewriteMessage.ts` | VERIFIED | Medium/high | AI wording risk | Reuse directly with safety copy | Unit tests for prohibited outputs and escalation boundaries. |
| Extension local risk rules | `APPS/peacepad-extension/src/localRules.ts` | VERIFIED | Medium | External composer side effects | Refactor | Port rules into shared package or server-safe module with tests. |
| WhatsApp/Gmail/Slack composer adapters | `APPS/peacepad-extension/src/adapters.ts`, `src/content.ts` | VERIFIED | Medium | Browser UI fragility | Redesign using lessons only | Manual/visible browser QA per target site; do not include in v1 mobile. |
| Onboarding route | `client/src/pages/onboarding.tsx`; `/api/onboarding/*`; carousel UI | VERIFIED | Medium | Activation can become vanity flow | Refactor | Mobile E2E for skip, resume, goal selection, first-value path. |
| Calendar/event scheduling | `events`, `schedule_templates`, `/api/events`, `/api/events/export/ical` | VERIFIED | Medium | Generic event model may not capture parenting-proof semantics | Refactor | Add parenting-time domain model and migration tests. |
| Scheduling dashboard | `client/src/components/SchedulingDashboard.tsx` | VERIFIED | Medium | UX may overfit old MVP | Refactor | Device QA and data contract check. |
| Expense receipt upload | `expenses`, `/api/receipt-upload`, receipt metadata | VERIFIED | Medium | Local/static storage unsuitable for evidence vault | Refactor | Private-storage abstraction; access-control tests. |
| Chat attachments | `/api/chat-attachments`, `messages.fileUrl/fileName/fileSize/mimeType` | VERIFIED | Medium | Sensitive files in chat are not case evidence | Refactor | Separate chat attachment from evidence item; no public/static leakage. |
| Voice notes/transcription | `/api/voice-notes`, `/api/openai/transcribe` | VERIFIED | Medium | Consent and sensitive-content risk | Redesign using lessons only | Consent, retention, deletion, and transcript review flow. |
| Audit trail export | `/api/audit-trail`; `client/src/pages/audit-trail.tsx` | VERIFIED but route unclear | Medium | Overclaiming legal/court-ready status | Refactor | Route intentionally; soften claims; source-link exports. |
| Account export | `/api/user/export` | VERIFIED | Medium | Premium data increases scope | Refactor | Include/exclude matrix for documents, AI summaries, logs, exports. |
| Account deletion | `/delete-account`; `DELETE /api/user/account`; soft-delete fields | VERIFIED | Medium | Retention/legal holds need policy | Refactor | Deletion policy for evidence, audit, export packages. |
| Scheduled calls | `scheduled_calls`; `/api/scheduled-calls`; `ScheduleCallDialog.tsx` | VERIFIED | Medium | Needs child-contact terminology and statuses | Reuse/refactor | E2E schedule/missed/completed call proof flow. |
| Call preferences/DND | `call_preferences`; `/api/call-preferences` | VERIFIED | Medium | Emergency override can be abused | Refactor | Boundary and abuse-case tests; child-safety copy. |
| Direct audio/video calls | `VideoCallDialog`, `WebRTCContext`, `server/webrtc-signaling.ts`, CallEngineV2 | VERIFIED code; STALE operation | Low/medium | WebRTC reliability, App Store permissions, consent | Redesign using lessons only | Real iOS device tests, two-user tests, reconnect tests, media permission tests. |
| Direct call API mutation endpoints | `/api/calls`, accept/decline/missed/end/followup | VERIFIED disabled | Low live | Broken UX if surfaced | Archive until labs flag | Must return non-501 and pass two-user call tests. |
| Call recording | `call_recordings`, `/api/call-recordings` | VERIFIED code | Low/medium | Consent/jurisdiction risk | Redesign using lessons only | Legal/privacy review; explicit consent; per-call disclosure. |
| Call diagnostics docs | `CALL_DEBUG_SUMMARY.md`, `CALL_DIAGNOSTIC_GUIDE.md`, `WEBRTC_AUDIO_ISSUE_HANDOFF.md` | VERIFIED local docs | Medium as knowledge | Could be stale | Archive/reuse lessons | Revalidate against current code before fixing calls. |
| Support resources | `support_resources`, `/support`, `/resources`, seed support resources | VERIFIED | Medium | Resource freshness/legal-advice risk | Refactor | Add region, freshness, source, crisis-boundary fields. |
| Safety plan | `safety_plans`; encrypted storage service; `/api/safety-plan` | VERIFIED | Medium | Highly sensitive; not same as court evidence | Reuse/refactor separately | Encryption and access-control tests; no analytics payloads. |
| Prep Chat | `prep_chat_sessions`, `/api/prep-chat/*`, `/prep-chat` | VERIFIED | Medium/high | AI hallucination/legal boundary | Reuse/refactor | Source/legal-boundary tests; user-review step. |
| Court-log summaries | `/api/summaries/court-log` | VERIFIED | Unknown | Legal overclaim and hallucination risk | Redesign using lessons only | Must cite user-confirmed events/evidence; no legal conclusions. |
| V2 module engine | `server/v2/*`, `pp_v2_*` tables | VERIFIED | Medium | Product surface unclear | Refactor | Contract tests; route purpose docs. |
| Usage metrics/user stats | `usage_metrics`, `user_stats`, analytics lib | VERIFIED | Medium | Vanity/gamification risk | Refactor | Privacy-safe event spec and retention rules. |
| Gamification/streaks/achievements | `streaks`, `achievements`, `/api/gamification/*` | VERIFIED | Medium | May reward conflict volume or compulsive use | Redesign using lessons only | Metrics must reward organized actions, not app addiction. |
| Subscription fields | `users.subscriptionTier`, `/api/usage/status` | VERIFIED partial | Low | Incomplete billing/entitlement | Refactor later | Explicit billing authorization; App Store IAP decision. |
| Stripe billing historical commit | Git commit `feat(m3-m5): stripe billing...` | STALE | Unknown | May be removed/incomplete | Archive until re-audited | Locate active Stripe code and tests before reuse. |
| Android native wrapper | `android/`, `MainActivity.java`, Android docs | VERIFIED | Medium/high | Play Store release separate from iOS | Reuse after iOS | Android QA and signing verification. |
| iOS native wrapper | `ios/App`, `ios-prep`, Capacitor config | VERIFIED | High for v1 release | Do not disturb review | Reuse only after review | Apple status and real iPhone smoke after approval/live. |
| React Native/Expo PeacePad | none found locally | UNKNOWN | None | Migration distraction | Research only | Locate or create synthetic spike outside production bundle. |
| Portfolio PeacePad copy | `APPS/fefejiro/README.md` | VERIFIED | N/A | Misrepresents stack | Refactor later | Align stack wording with current app evidence. |

## Reuse principles

PROPOSED:

1. Preserve the current release train.
2. Prefer current app contracts over old repo code.
3. Reuse schemas and UI patterns only after checking routes, tests, and mobile behavior.
4. Never reuse historical uploads/media.
5. Never import owner court documents into source control or fixtures.
6. Treat calls as proof/logging first, real-time WebRTC second.
7. Treat evidence storage as a new security architecture, not as an extension of `/uploads`.
8. Treat AI as a drafting/organization assistant, never as a legal decision-maker.

## Immediate next backlog

PROPOSED:

| Priority | Item | Why |
| --- | --- | --- |
| P0 | App Review monitoring and release freeze docs | Protect submitted v1. |
| P1 | Source-of-truth docs and analytics standard | Prevent conflicting "current" docs and proof inflation. |
| P1 | Onboarding + activation flow | Convert installs into first value. |
| P1 | Privacy-safe analytics events | Measure real product proof without sensitive payloads. |
| P2 | Parenting-time and child-call event models | Strong founder/user value; lower risk than WebRTC. |
| P2 | Evidence upload model with private storage abstraction | Foundation for premium. |
| P2 | Manual timeline | Court-prep value without risky AI automation. |
| P3 | AI summaries/OCR/date extraction | Useful after evidence model exists. |
| P4 | Professional/lawyer handoff package | Requires access-control maturity. |
| P5 | React Native spike | Only after current product model is proven. |

