# PeacePad React Native Lab Handoff

Last updated: 2026-07-23

## What changed

A separate lab workspace now exists at:

```text
APPS/peacepad-next-native
```

It is a React Native / Expo prototype for testing PeacePad Premium flows without touching the submitted iOS release.

## Lab purpose

- Test Premium UX early.
- Validate whether React Native materially improves the product.
- Build QA confidence before any migration decision.
- Keep current App Store review protected.

## Safety status

- Production app remains `APPS/peacepad`.
- Submitted bundle ID remains `ca.peacepad.family`.
- Lab bundle ID is `ca.peacepad.nextnative.lab`.
- Lab uses mock data only.
- Lab guardrail script blocks production API references and production bundle reuse.

## First command

```powershell
npm --workspace=@ftc/peacepad-next-native run guardrails
```

