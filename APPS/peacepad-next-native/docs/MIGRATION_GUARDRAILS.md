# PeacePad Next Native Migration Guardrails

Last updated: 2026-07-23

## Current decision

React Native work is allowed as a lab spike only. It is not approved as the new production app.

## Non-negotiables

- Do not use the submitted bundle ID `ca.peacepad.family`.
- Do not upload this app to App Store Connect.
- Do not write to the production API.
- Do not import private court or family records.
- Do not implement billing before pricing and App Store policy review.
- Do not claim legal advice, legal representation, or guaranteed admissibility.

## Promotion gate

Before this lab can become a migration candidate:

1. Submitted PeacePad iOS release is approved or review outcome is resolved.
2. Current Capacitor build is tested end to end on a real iPhone.
3. Lab app completes onboarding, calm compose, parenting log, evidence timeline, and offline/error-state QA.
4. Backend contract compatibility is documented.
5. A rollback plan exists.

