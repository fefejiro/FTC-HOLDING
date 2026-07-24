# PeacePad Next Native Status

Last updated: 2026-07-24

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
- Native-stack navigation.
- Binder setup validation.
- Evidence Vault metadata validation.
- MacInCloud iOS Simulator render path with Watchman disabled for Metro.

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

MacInCloud simulator:
-> pulled commit `72fa077a`
-> expo-doctor passed 18/18 checks
-> Metro started from `.sim/peacepad-next-native-ios` without Watchman stall
-> Premium dashboard rendered on iPhone 17 simulator
-> Evidence Vault metadata form rendered on iPhone 17 simulator
```

## Important caveat

The lab app is scaffolded, typechecked, Expo config resolves, Expo package versions are aligned, standalone Expo Doctor passes, and the app has rendered on MacInCloud iOS Simulator.

This is still not a production React Native migration. The app remains mock-data only and must not replace the submitted App Store build.

## Next test steps

1. Run `npm install` from `C:\FTC HOLDING` if workspace dependencies are not installed.
2. Run `npm --workspace=@ftc/peacepad-next-native run start`.
3. Open in Expo/web/iOS simulator.
4. Capture screenshots for onboarding, modules, timeline, and guardrail copy.
5. Test each tab and note confusing copy or layout.
6. Compare Premium Dashboard, Evidence Vault, Timeline, and Export Preview against the old Premium Delta PRD.
7. Run the QA matrix in `docs/QA_MATRIX.md`.

## Simulator readiness note

`expo-doctor` passes through the generated standalone simulator workdir with `npm --workspace=@ftc/peacepad-next-native run sim:doctor`.

The standalone workdir exists to avoid monorepo dependency noise and to keep simulator testing isolated from the submitted Capacitor app.
