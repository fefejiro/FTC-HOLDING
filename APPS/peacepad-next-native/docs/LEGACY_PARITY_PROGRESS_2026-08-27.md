# PeacePad legacy-to-native parity progress

Snapshot: 2026-08-27  
Native worktree: `D:\PeacePadRelease\worktrees\peacepad-2.0.1-main-integration`  
Legacy source: `C:\FTC HOLDING\APPS\peacepad`  
Scope: port the working Capacitor product experience into the existing React
Native application. This is an engineering handover, not a store-release
claim.

## What is already reused or present in Native V2

- Calm onboarding/introduction with replay from Settings.
- More/Settings surface with profile editing, linked email/Apple/Google
  providers, language selection (EN/FR/ES), notification controls, support,
  privacy/safety links, export, sign-out, leave-family, and account deletion.
- Family invitation and cross-account coordination.
- Messaging, delivery/read state, offline outbox/retry, Message Check boundary,
  shared calendar, tasks, activity suggestions/weather filters, private Case
  Binder records, metadata timeline, and attachment preparation.
- Protected push registration/revocation and content-free audit events.
- One-to-one audio call lifecycle, mute/duration/reconnect controls,
  authenticated private signalling, relay-only TURN policy, and media teardown
  on authorization/runtime changes.

## Ported in this pass

The legacy "personality test" was not a questionnaire. It was a manually
selected MBTI-style communication profile plus an explanatory page. Native V2
now provides an optional self-selected communication profile in More/Settings:

- all 16 type choices plus "Not sure yet";
- concise, family-safe copy in EN/FR/ES;
- no diagnosis, inference, co-parent guessing, or hidden personality scoring;
- private identity-scoped persistence with optimistic version checks;
- fail-closed region and deleted-identity checks;
- content-free `personality.updated` audit event.

Implementation surface:

- migration: `APPS/peacepad-v2-platform/supabase/migrations/202608270002_v2_personality_preferences.sql`;
- API contract and HTTP/Synthetic implementations:
  `APPS/peacepad-next-native/src/api/CoordinationApi.ts` and
  `SyntheticCoordinationApi.ts`;
- Edge GET/PUT routes:
  `APPS/peacepad-v2-platform/supabase/functions/peacepad-v2-api/index.ts`;
- runtime account action wiring:
  `APPS/peacepad-next-native/src/runtime/PeacePadStagingRuntime.tsx` and
  `src/session/StagingAccountActions.tsx`;
- Settings UI/tests:
  `APPS/peacepad-next-native/src/preferences/PersonalityProfilePanel.tsx`.

## Deliberate non-ports

- Legacy co-parent personality guesses were not copied. A parent cannot set or
  infer another parent's profile in Native V2.
- Legacy mock tone/MBTI AI helpers were not promoted into production.
- Video calling and Conch facilitator media are not enabled by this pass.
  The legacy WebRTC hook is web/Capacitor-specific; native video needs an
  explicit camera permission, `mediaType`, renderer, TURN/signalling, lifecycle,
  and physical-device gate. Conch additionally needs dual consent, a
  server-side short-lived facilitator session, no recording/transcript, budget
  enforcement, and a feature flag that stays off until proven.
- Web-only support-discovery/weather routes were not copied directly. Native
  already has the safe support panel and local activity/weather presentation;
  any richer provider should be added behind a typed production API contract.

## Verification evidence for this pass

- `npm run typecheck` - PASS.
- Focused API/UI tests - PASS, 3 suites / 57 tests.
- Full Jest suite - PASS, 58 suites / 437 passed / 1 skipped.
- `npm run guardrails` - PASS.
- `npm run secret-scan` - PASS, 154 files checked.
- `git diff --check` - PASS.
- Deno Edge-function check was not run because `deno` is not installed in the
  current Windows environment. Run it in CI or a Deno-enabled shell before
  deploying the new migration/function.

No production records, store artifacts, or live feature flags were changed by
this parity pass. The new SQL migration and Edge route still require reviewed
deployment to the intended environment before the Settings profile can persist
against managed production.

## Next bounded gates

1. Review and deploy migration `202608270002` plus the matching Edge function;
   verify GET/PUT, replay/conflict, deletion, and region isolation with
   fictional accounts only in a controlled environment.
2. Run the existing two-account audio journey on two physical devices across
   Wi-Fi/cellular, background/locked screen, denied microphone, reconnect, and
   TURN relay. Do not call audio "fully live" from simulator or lifecycle tests
   alone.
3. Add native video only after audio evidence passes: introduce `mediaType`,
   camera permission/revocation, local/remote rendering, camera-off/audio-only
   fallback, reconnect, and teardown tests without changing audio semantics.
4. Add Conch as a separate, disabled feature: per-call dual consent, transient
   server session, server-side OpenAI Realtime credentials, usage/budget cap,
   and explicit no-recording/no-transcript guarantees.
5. Re-run the release workflow from the exact merged source and produce new
   signed artifacts only after the relevant physical-device gates pass.

