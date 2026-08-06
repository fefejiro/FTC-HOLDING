# PeacePad Native V2

This workspace is the isolated React Native and Expo successor to the live
PeacePad Capacitor application. It currently contains the native foundation,
synthetic coordination flows, metadata-only records preparation, and a
staging-only HTTP/session rail.

- iOS and Android identifier: `ca.peacepad.nextnative.lab`
- production API writes: disabled
- live Capacitor application: untouched
- data: synthetic or device-local only

The live release remains the rollback product. Native V2 must not use production
identity, data, services, or the App Store bundle until every mandatory release
gate is evidenced.

Current release truth, feature status, blockers, and verification evidence are
maintained in [docs/STATUS.md](docs/STATUS.md). Historical scope documents record
what individual stacked changes proved; they are not current release claims.

## Verify

```bash
npm run guardrails
npm run typecheck
npm run test:coverage
npm run expo:config
npx --yes expo-doctor@1.20.1 .
npm run export:ios -- --output-dir ./dist/ios
```
