# JobAgent Mobile Release Foundation

## Current State

JobAgent uses one responsive product and API across the web, installable PWA,
iOS, and Android. The native applications are a Capacitor shell for candidate
onboarding, job review, approvals, application proof, alerts, and account
controls. Resume tailoring, Gmail processing, job-board sessions, and browser
automation remain on the hosted services and enrolled trusted runner.

- Product name: `Una Labs JobAgent`
- Application ID: `cloud.unalabs.jobagent`
- Hosted origin: `https://jobagent.unalabs.cloud`
- Minimum Android API: Capacitor 8 default (API 24 or newer)
- Minimum iOS version: Capacitor 8 default (iOS 15 or newer)

The shell opens OAuth authorization in the system browser and only accepts app
links returning to the exact JobAgent HTTPS origin. It does not embed OAuth
secrets, job-board cookies, or candidate credentials.

## Local Commands

```powershell
npm ci --workspaces=false
npm run mobile:sync
npm run mobile:doctor
npm run mobile:open:android
```

`npm run mobile:open:ios` must run on a supported macOS/Xcode host. Windows can
generate and synchronize the iOS source project but cannot produce or validate
an App Store archive.

## Release Gates

Source generation is not store readiness. Before beta distribution:

1. Replace generated development icons and splash assets with approved JobAgent
   artwork at all required sizes.
2. Publish and verify Android Digital Asset Links and the Apple App Site
   Association file for `jobagent.unalabs.cloud`.
3. Complete Android emulator and physical-device tests, including browser OAuth
   return, upload, pause, revoke, export, deletion, and offline behavior.
4. Complete the equivalent iOS simulator and physical-device tests on macOS.
5. Configure signing without committing keystores, certificates, provisioning
   profiles, service credentials, or store API keys.
6. Add store privacy declarations and screenshots that match observed runtime
   behavior and the published privacy/retention policies.
7. Complete TestFlight and Play internal-testing review before any public store
   claim.

Push notifications, biometrics, camera access, and native secure token storage
are intentionally absent until a product workflow requires them. New native
permissions must be justified and tested before addition.
