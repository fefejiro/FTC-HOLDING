# PeacePad Native V2 full-core one-wave port

## Purpose and source boundary

This is the active implementation handover for the full-core Native V2 port.
It does not authorize a build, deployment, migration apply, TestFlight upload,
Play upload, App Review submission, or public rollout.

- Canonical implementation checkout: `C:\ppn`
- Branch: `peacepad-native-main`
- Starting consolidated commit: `09fea15310b5a44a3c76a09e636d86532d44bf06`
- Native application: `APPS/peacepad-next-native`
- V2 API and migrations: `APPS/peacepad-v2-platform`
- Existing store identities and production runtime remain untouched during this wave.

The Capacitor application is a source library only. Native V2 does not ship a
WebView or a legacy-island bridge.

## Implemented in this working wave

- Family-first solo entry and parent-facing coordination, without forcing a
  family name before private use.
- Children and updates, expenses and settlements, schedules, location-explicit
  support, a private communication-style preference, and personality guidance.
- Conversations, Message Check, Coach typing/voice input, voice notes, and
  private/shared attachment boundaries.
- Native audio/video call state, signaling/TURN contract handling, scheduled
  calls, and consent-gated Conch turns/reactions/timer.
- Incoming call push target selection and Expo delivery attempt after call
  creation. Locked-screen delivery remains a physical-device verification item.
- Receipts now have their own private object path and authorization model:
  owner-only before association, authorized family participants only after the
  receipt is attached to the shared expense. JPG, PNG, and PDF only.
- The approved family-first visual system is used across the added native
  screens: purple anchor with coral, sun, aqua, cream, warm copy and no emoji
  product icons.

## Deliberate safety boundaries

- No dummy data is used by production runtime paths. Synthetic API data is
  limited to local tests/lab screens and must never be presented as live data.
- Receipt bytes use private storage and short-lived signed URLs. The Edge
  function validates the region-scoped receipt object path and observed upload
  metadata before completion.
- No service-account JSON, provider secret, user content, identity token, or
  family identifier is logged by the V2 Edge function.
- No call recording or persistent transcript is created by Conch.

## Local evidence from this wave

The following passed from the canonical checkout after the receipt path was
added:

```text
npm run typecheck
npm test -- --runInBand            # full suite
npm run guardrails
npm run secret-scan
APPS/peacepad-v2-platform/scripts/validate-supabase-edge-function.ps1
git diff --check
```

The receipt contract has focused tests for intent, byte upload, completion,
expense association, and signed-download retrieval in the synthetic adapter.
These are local code checks, not provider/deployment proof.

## Still required before a candidate build

1. Apply and verify all reviewed V2 migrations in the intended non-production
   environment; there is no local PostgreSQL/Deno provider proof in this
   checkout.
2. Finish the remaining legacy-core UI/data parity work in this same checkout.
3. Run the full automated suite after the complete feature wave, then create
   Android APK/AAB and iOS candidate artifacts from one exact commit.
4. Execute the two-account, two-device matrix on Pixel and iPhone, including
   permissions, session restore, audio/video/Conch, offline retry, and
   lock-screen incoming-call delivery.
5. Treat build, upload, TestFlight, review submission, approval, and public
   availability as separate evidence gates.

## Non-goals retained from the agreed scope

Legacy admin panels, beta/test monitors, gamification, pets, shopping lists,
and storybook experiments are not part of the parent-facing full-core Native
V2 port.
