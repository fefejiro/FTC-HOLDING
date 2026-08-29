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
- Current parity extension commit: `79337f8972d0c022b1a6b5e72675ea31b1e1a54f`
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

- A concise, optional "Prepare a calm message" card in the authenticated
  composer; the same journey is also exposed in the device-only foundation
  flow, so drafting does not require an invitation.
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

## Third delivered vertical slice: guest-first Prep Chat entry

The same Prep Chat journey is now available from the device-only foundation
compose flow, before a family connection or account sign-in:

- Guest users can open Prep Chat after the existing required-consent step.
- The generated draft is handed back to the existing guest message composer;
  it is never sent automatically.
- The composer remains the only boundary that can call the existing preview
  API, so this batch adds no production write or legacy endpoint dependency.
- `FoundationScreen.test.tsx` covers creating and applying a calm draft while
  proving that no preview request occurs as a side effect.

This closes the most important legacy solo-entry gap without changing the
current session, consent, or production routing contracts.

## Fourth delivered vertical slice: message-context Prep Chat entry (2026-08-29)

The guest and authenticated Prep Chat cards now preserve the legacy choice of
starting from an incoming message or composing a new one:

- Accessible entry-mode radios distinguish "I received a message" from
  "I need to send something".
- Four concise starter prompts cover schedule changes, boundaries, upsetting
  messages, and calm pickups; selecting one fills the topic for review.
- Received-message drafts use the context-preserving opening "I received a
  message about ..." while sending drafts retain the existing "I would like to
  talk about ..." wording.
- EN/FR/ES labels are included, and Start over clears the selected context as
  well as the draft.

The feature remains deterministic and local-only. It does not contact the
legacy Prep Chat route, create an AI session, or send a message without the
existing composer review action. Focused coverage verifies the received
context helper and the guest UI controls.

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

Passed on the implementation worktree at current source `79337f897`:

- `npm run guardrails`
- `npm run secret-scan` (150 files checked)
- `npm run typecheck`
- `npm run expo:config` (lab bundle, full-bleed icon, and writes-disabled
  configuration resolved)
- `npm run verify:audio-config` (microphone-only native audio configuration)
- `git diff --check`
- `npm test -- --no-watchman --forceExit` (55 suites / 428 passed / 1 skipped)
- `npm run test:coverage -- --no-watchman --forceExit` (80.62% statements /
  75.52% branches overall; `src/legacy` 85.07% statements / 88.23% branches)

The worktree's original `node_modules` junction was preserved and restored
after a bounded clean-install attempt. An independent `npm ci` from this
worktree's lockfile was not completed because large Expo/WebRTC registry
downloads stalled; the local suite therefore ran against the restored shared
dependency tree. The hosted native workflow must still run against this exact
source with a clean dependency install before any release artifact is
considered.

This batch produced no EAS artifact, TestFlight upload, Play upload, or
production write. Physical-device audio, notification delivery, and
authenticated cross-account journeys remain release gates; the local checks
above are not a substitute for those hosted/device proofs.

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
