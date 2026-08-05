# PeacePad Native Foundation

This workspace is an isolated React Native and Expo foundation reconstructed from the published PeacePad Native draft history.

- iOS and Android identifier: `ca.peacepad.nextnative.lab`
- production API writes: disabled
- live Capacitor application: untouched
- data: synthetic or device-local only

The foundation contains the consent-first welcome flow, optional AI-consent boundary, device-only guest-session interface, typed API client, adaptive theme, accessibility baseline, error boundary, and safety guardrails. Coordination, records, staging services, and proof artifacts are added only by later stacked branches.

## Verify

```bash
npm run guardrails
npm run typecheck
npm run test:coverage
npx expo config --type public
```
