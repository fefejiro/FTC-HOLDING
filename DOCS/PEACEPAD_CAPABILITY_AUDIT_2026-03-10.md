# PeacePad Capability Audit (2026-03-10)

## Current architecture summary
- Core app lives in `APPS/peacepad` (React client + Express API + shared AI helpers).
- Existing chat intervention is already pre-send in `client/src/components/ChatInterface.tsx`: analysis is triggered on Send, then user chooses suggested version, edit, or send original.
- AI behavior is split across:
  - `server/routes.ts` for route orchestration
  - `server/aiHelper.ts` for CES scoring + de-escalation rewrites
  - `server/services/prepChatService.ts` for prep-chat rewrite analysis
  - `server/emotionAnalyzer.ts` for broader emotion/conflict coaching routes.

## Existing PeacePad capability inventory
- **Primary in-app pre-send**: `POST /api/messages/preview`
  - Returns tone + CES + de-escalation suggestion.
- **GPT action route**: `POST /api/actions/preview-tone`
  - API-key protected, tone-focused.
- **Prep chat rewrite**: `POST /api/prep-chat/analyze-draft`
  - Draft coaching and rewritten phrasing.
- **Comprehensive analyzer path**:
  - `POST /api/analyze-message`
  - `POST /api/detect-conflict`
  - `POST /api/suggest-response`
- **CES engine**: `server/aiHelper.ts`
  - Signal weighting, escalation score, intervention levels, rewrite generation.

## Current API surface
- Existing app-optimized preview route: `/api/messages/preview`.
- New canonical wrapper route added: `/api/v1/message/preflight`.
- Canonical route is cookie-session auth (v1), built as wrapper over existing preview analysis path.
- Canonical response fields:
  - `conflict_score`
  - `risk_level`
  - `signals[]`
  - `moderation_flags[]`
  - `recommendation`
  - `calm_version`
  - `send_policy`
  - `model_or_ruleset_version`

## Best candidate for canonical preflight endpoint
- `/api/v1/message/preflight` is now the recommended stable contract.
- It reuses existing tone + CES behavior and normalizes output for external surfaces.

## Gaps to ship extension MVP
- No browser extension existed in repo before this work.
- Added new extension workspace: `APPS/peacepad-extension`.
- Remaining operational gap: CI/release pipeline for extension packaging and Chrome Web Store publication.

## Gaps to extract SDK
- No pre-existing shared PeacePad integration SDK package.
- Added new workspace package: `PACKAGES/peacepad-sdk`.
- Remaining operational gap: versioning/publishing strategy (internal npm registry vs public package).

## Recommended implementation sequence
1. Lock canonical API behavior and tests (`/api/v1/message/preflight`).
2. Ship extension MVP manual trigger on WhatsApp Web, Gmail, Slack.
3. Enable optional per-site auto mode after first manual use.
4. Use SDK as contract layer for future integrations.
5. Expand to official platform integrations with policy-compliant channels.

## Risks / blockers
- Cookie-auth-only integration requires active PeacePad session for extension users.
- Cross-site cookie behavior varies by browser privacy policies.
- DOM-level automation on third-party messaging surfaces is fragile to UI changes.
- Official platform integrations require product/app review and policy scope approval.

## Exact files and folders involved
- API + contract:
  - `APPS/peacepad/server/routes.ts`
  - `APPS/peacepad/server/services/preflightContract.ts`
- API tests:
  - `APPS/peacepad/tests/unit/preflightContract.test.ts`
  - `APPS/peacepad/tests/unit/cesEscalation.test.ts`
- SDK:
  - `PACKAGES/peacepad-sdk/*`
- Extension:
  - `APPS/peacepad-extension/*`
