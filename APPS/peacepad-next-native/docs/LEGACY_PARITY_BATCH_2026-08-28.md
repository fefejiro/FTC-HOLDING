# PeacePad legacy-to-native parity batch - 2026-08-28

## Purpose

This note records the first larger end-to-end parity batch for the existing
Native V2 shell. The goal is to reuse the working legacy PeacePad experience
inside the native product without routing the native app through the legacy
server or weakening the V2 production boundary.

This is a real implementation batch, not a claim that every legacy screen has
already been ported.

## Source and scope

- Native worktree: `D:\PeacePadRelease\worktrees\peacepad-port-current\APPS\peacepad-next-native`
- Branch: `work/peacepad-port-current-20260828`
- Implementation commit: `6373611a7e506a72beeb37859df7424b0b84d1ae`
- Native baseline before this batch: `11fd91f63`
- Legacy source reviewed: `C:\FTC HOLDING\APPS\peacepad`
- Legacy files reviewed:
  - `client/src/pages/weather-activities.tsx`
  - `server/contentFallbacks.ts`
  - `server/seedWeatherActivities.ts`
  - the server weather-activities route

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
- `npm run secret-scan` (145 files checked)
- `git diff --check`

The local Jest and TypeScript launchers were attempted but are not reliable in
this checkout because `node_modules` is a junction to the older
`peacepad-2.0.1` worktree. The processes can remain alive without output, so
no local Jest or TypeScript pass is claimed for this batch. The previous hosted
baseline run `33229229484` (53 suites / 420 passed / 1 skipped) predates this
change and is not evidence for the new files. Run the normal hosted native
workflow against commit `6373611a7e506a72beeb37859df7424b0b84d1ae` before any
release artifact is considered.

## Next larger batches

1. **Solo Prep Chat / calm drafting** - first define a V2-backed session,
   message, and draft contract. Reuse the legacy journey and copy style, but
   do not call legacy `/api/prep-chat` routes from the native app.
2. **Settings and personality** - map the useful legacy preferences and
   personality test to the existing native More/profile/auth contracts. Only
   persist fields with an approved V2 API and deletion/export behavior.
3. **Coordination parity** - deepen the existing V2 messages, invitations,
   calendar, records, and support screens using their current contracts rather
   than creating parallel legacy state.
4. **Audio** - keep the Native V2 authenticated call/TURN/signaling contracts
   as authority. Port the legacy user journey and state presentation, not its
   incompatible WebRTC transport.
5. **Video and Conch** - separate production contracts, consent, cost limits,
   and physical-device gates are required. Neither should be enabled by this
   parity batch or by remote configuration alone.

Each batch should add a focused test, update this note or a successor handover,
run hosted gates on its exact source, and remain separate from store upload or
production cutover until the complete end-to-end journey is proven.
