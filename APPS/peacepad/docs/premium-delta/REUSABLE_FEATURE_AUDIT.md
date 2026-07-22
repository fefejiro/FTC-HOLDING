# PeacePad Premium Delta Reusable Feature Audit

Status: initial audit  
Created: 2026-07-22  
Scope: current `APPS/peacepad`, local `APPS/peacepad-extension`, and known GitHub repos visible to the owner account.

## Sources inspected

| Source | Status | Usefulness |
| --- | --- | --- |
| `APPS/peacepad` | Current active app | Primary source for current architecture, upload patterns, calls schema, audit trail, support/legal resources, Capacitor iOS release path. |
| `APPS/peacepad-extension` | Local browser extension | Useful for pre-send/local escalation rules and composer integration ideas. Not a document vault. |
| `fefejiro/fefejiro-PeacePadAI` | Private older repo; GitHub tree inspected | Rich call/WebRTC documentation and validation notes. Large tree; not cloned due network timeout. |
| `fefejiro/PeacePad-` | Private older repo; GitHub tree/content inspected | Strong reusable call UI/signaling files and uploaded-media precedent. |
| `fefejiro/PeacePad` | Public older repo; GitHub tree inspected | Minimal/stale public repo. Not useful for Premium feature code. |
| `fefejiro/peacepad-privacy` | Public policy repo; GitHub tree inspected | Useful for privacy/trust surface, not app functionality. |

The failed partial clone was created outside the monorepo under `C:\FTC HOLDING PRIVATE\peacepad-delta-repo-audit-2026-07-22`. No private audit clone was committed.

## Current app reusable foundations

### Upload and document foundations

Evidence:

- `shared/schema.ts`
  - `messages.messageType`, `fileUrl`, `fileName`, `fileSize`, `mimeType`, `duration`, `transcript`
  - `expenses.receiptUrl`, `fileName`, `fileSize`
- `server/routes.ts`
  - multer upload configuration for recordings, chat attachments, receipts, and profile photos
  - `POST /api/chat-attachments`
  - `POST /api/voice-notes`
  - receipt upload path under `/uploads/receipts`
- `server/index.ts`
  - static `/uploads` serving
- `client/src/components/ChatInterface.tsx`
  - chat attachment upload and voice-note upload flows
- `tests/e2e/p2-important/attachments.spec.ts`
  - existing test coverage hook for attachments

Reusable for Premium:

- Use the same file metadata shape as the first version of `case_documents`.
- Reuse upload UI patterns but move production evidence storage to private object storage.
- Reuse rate-limit patterns for uploads.

Do not reuse as-is:

- Local `/uploads` disk storage as the final production evidence vault.
- Public/static upload serving for sensitive case evidence.

### Audit/export foundations

Evidence:

- `shared/schema.ts`
  - `audit_logs`
  - `relationship_memories`
- `server/routes.ts`
  - `GET /api/audit-trail`
  - `GET /api/audit-logs`
- `client/src/pages/audit-trail.tsx`
  - PDF/CSV/JSON export concept
  - summaries for messages, events, calls, recordings

Reusable for Premium:

- Export UI concept.
- Audit-event storage pattern.
- Summary cards and export buttons.

Must change before Premium:

- Do not claim "court-admissible" or "immutable" unless a legal/technical review supports it.
- Route and verify the audit-trail page intentionally; it does not appear in current `App.tsx` routes.
- Add source links back to each evidence item.

### Calls and child-contact proof

Evidence:

- `shared/schema.ts`
  - `call_sessions`
  - `calls`
  - `scheduled_calls`
  - `call_followups`
  - `call_preferences`
  - `call_recordings`
- `client/src/pages/calls.tsx`
- `client/src/pages/call-preferences.tsx`
- `client/src/pages/join-call.tsx`
- `client/src/components/QuickCallButton.tsx`
- `client/src/components/ScheduleCallDialog.tsx`
- `client/src/components/PostMissedCallDialog.tsx`
- `client/src/components/VideoCallDialog.tsx`
- `server/webrtc-signaling.ts`
- `server/call-engine-v2/CallEngineV2.ts`
- `server/call-engine-v2/ReconnectionManager.ts`
- `client/src/hooks/useCallEngineV2.ts`
- `client/src/contexts/WebRTCContext.tsx`
- `server/routes.ts`
  - call mutation endpoints currently return `501` because the call feature was removed from MVP
  - scheduled calls and call preferences remain active

Reusable for Premium:

- Scheduled call data model.
- Call preference/DND boundary model.
- Missed/completed call proof concept.
- CallEngineV2/reconnection concepts.
- Weekly child-call product shape.

Must change before Premium:

- Decide one canonical call engine.
- Re-enable call mutation endpoints only behind a premium/labs flag.
- Add iOS real-device tests.
- Treat recording/transcription as consent-gated and jurisdiction-sensitive.

### Legal/support resources

Evidence:

- `shared/schema.ts`
  - `support_resources`
  - therapist/resource directory tables
- `client/src/pages/support.tsx`
- `client/src/pages/resources.tsx`
- `server/aiHelper.ts`
  - legal-escalation detection patterns

Reusable for Premium:

- Resource directory model.
- Legal-escalation/tone classification as a signal for court-prep notes.
- Support/resource bookmarking into a case binder.

Must change before Premium:

- Separate "resource navigation" from "legal advice".
- Add jurisdiction-aware resource metadata.
- Add freshness/verification status for resources.

## Local extension reusable foundations

Source: `APPS/peacepad-extension`.

Useful files:

- `src/localRules.ts`
- `tests/localRules.test.ts`
- `src/content.ts`
- `src/adapters.ts`

Reusable for Premium:

- Local preflight rules for legal escalation, profanity, child-directed attacks, and tone warnings.
- Composer replacement/copy-to-send behavior.
- External-channel assistant idea for WhatsApp or other messaging surfaces.

Not reusable for the first Premium vault:

- It is browser-extension workflow code, not secure evidence storage.

## Older repo findings

### `fefejiro/fefejiro-PeacePadAI`

Useful files seen in GitHub tree/API:

- `CALL_ENTRY_POINTS_ANALYSIS.md`
- `CALL_DEBUG_SUMMARY.md`
- `CALL_DIAGNOSTIC_GUIDE.md`
- `V2_CALL_ENGINE_VALIDATION_REPORT.md`
- `WEBRTC_AUDIO_ISSUE_HANDOFF.md`

Key lesson:

- The call stack has had real WebRTC instability. Premium should reuse the analysis and validation work, but not blindly re-enable every old call path.

Relevant call-specific findings:

- V2 Call Engine validation reported roughly 80% success in the old validation report.
- WebRTC signaling could work while audio still failed.
- Duplicate offer/race conditions were a known risk.
- Session-code wrappers and join-session side effects were fragile.

Recommendation:

- Treat this repo as a call-engine lessons archive.
- Reuse diagnostics, not old broken states.

### `fefejiro/PeacePad-`

Useful files seen in GitHub tree/API:

- `client/src/components/IncomingCallModal.tsx`
- `client/src/components/VideoCallDialog.tsx`
- `client/src/hooks/use-incoming-calls.ts`
- `client/src/pages/calls.tsx`
- `client/src/pages/join-call.tsx`
- `e2e/p1-call-joining.spec.ts`
- `server/webrtc-signaling.ts`
- `uploads/chat/...`
- `uploads/profiles/...`

Key lesson:

- This repo has concrete UI and signaling assets for incoming calls, video/audio dialog, call history, and join-code flows.

Recommendation:

- Use it as a UI/flow reference for Peace Calls.
- Do not import old uploaded media.
- Do not assume its signaling code is production-safe without current-device tests.

### `fefejiro/PeacePad`

GitHub tree had only:

- `.github/workflows/android-build.yml`
- `.github/workflows/build-android.yml`
- `README.md`

Recommendation:

- Treat as stale/public shell.
- No reusable Premium functionality found.

### `fefejiro/peacepad-privacy`

GitHub tree had:

- `Privacy Policy`
- `README.md`

Recommendation:

- Reuse as a trust/privacy reference.
- Update before Premium because evidence vault data is materially more sensitive than basic app communication data.

## Reuse recommendation summary

| Premium need | Reuse source | Reuse confidence |
| --- | --- | --- |
| Evidence upload metadata | Current `messages`/`expenses` upload patterns | High for shape; low for production storage |
| Evidence export | Current `audit-trail.tsx` and `/api/audit-trail` | Medium; copy/legal claims need cleanup |
| Weekly child call proof | Current scheduled calls + old `PeacePad-` call UI | Medium |
| Real-time calls | Current CallEngineV2 + old call docs | Low until real-device proof |
| Legal escalation detection | Current `server/aiHelper.ts` + extension `localRules.ts` | High as support signal |
| Resource navigator | Current `support_resources` | Medium |
| React Native premium app | None directly | Future architecture phase |

## Immediate product decision

Do not change the current iOS release to include Premium Delta.

The current app should ship first. Premium Delta should begin as a post-live product line using the current backend foundations, then move into a React Native premium app once the data model and evidence workflows are proven.

