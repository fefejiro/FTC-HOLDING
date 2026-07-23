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

npm --workspace=@ftc/peacepad-next-native exec expo -- install --check
-> Dependencies are up to date

npm --workspace=@ftc/peacepad-next-native run sim:doctor
-> standalone simulator workdir created
-> npm install completed inside `.sim/peacepad-next-native-ios`
-> expo-doctor passed 18/18 checks
```

## Important caveat

The lab app is scaffolded, typechecked, Expo config resolves, Expo package versions are aligned, and standalone Expo Doctor passes. A full iOS Simulator launch is still pending because this Windows machine cannot launch Apple's iOS Simulator. Use `docs/IOS_SIMULATOR_RUNBOOK.md` on MacInCloud.

## Next test steps

1. Run `npm install` from `C:\FTC HOLDING` if workspace dependencies are not installed.
2. Run `npm --workspace=@ftc/peacepad-next-native run start`.
3. Open in Expo/web/iOS simulator.
4. Capture screenshots for onboarding, modules, timeline, and guardrail copy.
5. Test each tab and note confusing copy or layout.
6. Compare Premium Dashboard, Evidence Vault, Timeline, and Export Preview against the old Premium Delta PRD.

## Simulator readiness note

`expo-doctor` passes 17/18 checks inside the FTC monorepo. The remaining monorepo check is duplicate React from the root, not a PeacePad lab version mismatch. The generated standalone simulator workdir passes 18/18 checks with `npm --workspace=@ftc/peacepad-next-native run sim:doctor`.
