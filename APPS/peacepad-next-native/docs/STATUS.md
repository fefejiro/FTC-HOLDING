# PeacePad Next Native Status

Last updated: 2026-07-23

## Current state

React Native / Expo lab scaffold created with a clickable mock flow:

- Home.
- Goal onboarding.
- Calm Compose.
- Parenting-time / child-call log concept.
- Evidence Vault concept.
- Source-linked timeline.
- Premium export preview.
- Binder health metrics and readiness prompts.
- Peace Calls proof-first screen copy.
- Case Binder setup screen.
- Evidence detail metadata/review screen.
- Neutral parenting outcome selector.
- Export checklist toggles.

## Verified checks

```text
npm --workspace=@ftc/peacepad-next-native run guardrails
-> PeacePad Next Native guardrails OK.

npm --workspace=@ftc/peacepad-next-native run typecheck
-> passed

npm --workspace=@ftc/peacepad-next-native exec expo -- --version
-> 54.0.26

npm --workspace=@ftc/peacepad-next-native exec expo -- config --type public
-> resolved SDK 54 public config with bundle/package ca.peacepad.nextnative.lab
```

## Important caveat

The lab app is scaffolded, typechecked, and Expo config resolves. A full device/simulator run is still pending.

## Next test steps

1. Run `npm install` from `C:\FTC HOLDING` if workspace dependencies are not installed.
2. Run `npm --workspace=@ftc/peacepad-next-native run start`.
3. Open in Expo/web/iOS simulator.
4. Capture screenshots for onboarding, modules, timeline, and guardrail copy.
5. Test each tab and note confusing copy or layout.
6. Compare Premium Dashboard, Evidence Vault, Timeline, and Export Preview against the old Premium Delta PRD.
