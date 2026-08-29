# PeacePad legacy-to-native parity batch - 2026-08-28

## Purpose

This note records the larger end-to-end parity batches for the existing
Native V2 shell. The goal is to reuse the working legacy PeacePad experience
inside the native product without routing the native app through the legacy
server or weakening the V2 production boundary.

This is a real implementation batch, not a claim that every legacy screen has
already been ported.

## Source and scope

- Native worktree: `D:\PeacePadRelease\worktrees\peacepad-port-current\APPS\peacepad-next-native`
- Branch: `work/peacepad-port-current-20260828`
- Weather implementation commit: `6373611a7e506a72beeb37859df7424b0b84d1ae`
- Prep Chat implementation commit: `cd87cd580d07e3cac27e7698d280172f07dcf58d`
- Native baseline before these batches: `11fd91f63`
- Legacy source reviewed: `C:\FTC HOLDING\APPS\peacepad`
- Legacy files reviewed:
  - `client/src/pages/weather-activities.tsx`
  - `server/contentFallbacks.ts`
  - `server/seedWeatherActivities.ts`
  - the server weather-activities route
  - `client/src/pages/prep-chat.tsx`

## Delivered vertical slice

The native Calendar screen now includes the reusable legacy activity-planning
catalogue:

- 20 seeded family activity ideas from the legacy experience.
- Inclusive child-age filtering using the legacy month ranges.
- Explicit weather filtering for sunny, rainy, snowy, cloudy, windy, hot, and
  cold conditions.
- Accessible age and weather controls and localized EN/FR/ES labels.
- Read-only cards showing activity type, category, duration, description, and
  materials.
- Unit coverage for catalogue integrity and filtering behavior in
  `src/legacy/weatherActivities.test.ts`.

The batch is deliberately deterministic. It does not request location access,
invent live weather, or mutate a calendar event. A later weather adapter must
use an approved V2 endpoint or an explicitly reviewed native weather provider;
the legacy `/api/weather-activities` endpoint must not be called by Native V2.

## Second delivered vertical slice: solo Prep Chat

The native Messages screen now includes the useful solo-entry part of the
legacy Prep Chat journey:

- A concise, optional "Prepare a calm message" card that can be opened without
  a family or invitation.
- Topic and feeling inputs with accessible radio semantics and EN/FR/ES copy.
- Deterministic calm-draft generation using the existing native composer as
  the review/send boundary.
- Start-over and local-only disclosure so a draft is never sent implicitly.

This intentionally ports the legacy user journey and writing guidance without
copying legacy cookies, sessions, or the `/api/prep-chat` routes. The current
V2 backend has no approved Prep Chat session contract, so no server or AI call
is made by this slice. A future V2-backed assistant can replace the pure draft
helper behind the same review boundary without changing the user flow.

Focused helper coverage is in `src/legacy/prepChat.test.ts`.

## Safety boundary

- Native V2 contracts remain the only production API authority.
- No legacy session, cookie, database, or endpoint was copied into the native
  runtime.
- No production records were read or changed.
- No staging labels or infrastructure explanations were added to ordinary
  customer screens.
- Existing messaging, calendar, records, invitations, account controls, and
  audio-call contracts remain unchanged by this batch.

## Verification

Passed on the implementation worktree:

- `npm run guardrails`
- `npm run secret-scan` (150 files checked)
- `npm run typecheck`
- `git diff --check`

The focused Jest launcher was attempted but remains unreliable in this
checkout because `node_modules` is a junction to the older `peacepad-2.0.1`
worktree; it stayed silent beyond three bounded waits and was stopped. No Jest
pass is claimed locally. TypeScript, guardrails, secret scan, and diff checks
passed locally. The previous hosted baseline run `33229229484` (53 suites /
420 passed / 1 skipped) predates both parity batches and is not evidence for
the new files. Run the normal hosted native workflow against the exact
implementation commit before any release artifact is considered.

## Next larger batches

1. **Settings and personality** - map the useful legacy preferences and
   personality test to the existing native More/profile/auth contracts. Only
   persist fields with an approved V2 API and deletion/export behavior.
2. **Coordination parity** - deepen the existing V2 messages, invitations,
   calendar, records, and support screens using their current contracts rather
   than creating parallel legacy state.
3. **Audio** - keep the Native V2 authenticated call/TURN/signaling contracts
   as authority. Port the legacy user journey and state presentation, not its
   incompatible WebRTC transport.
4. **Video and Conch** - separate production contracts, consent, cost limits,
   and physical-device gates are required. Neither should be enabled by this
   parity batch or by remote configuration alone.

Each batch should add a focused test, update this note or a successor handover,
run hosted gates on its exact source, and remain separate from store upload or
production cutover until the complete end-to-end journey is proven.
