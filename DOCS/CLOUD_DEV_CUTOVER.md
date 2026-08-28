# FTC Cloud Development Cutover

## Purpose

FTC stays GitHub-first. Cloud development removes repeatable dependency,
TypeScript, test, and web-build work from the constrained C: drive. Local
Windows remains the device lab for Android Studio, ADB/Logcat, physical Android
devices, TestFlight devices, and final acceptance.

This is a development and evidence change, not a production migration. It does
not change any customer runtime, database, store listing, provider credential,
or release state.

## Immediate model

| Work | Where it runs | Boundary |
| --- | --- | --- |
| Source of truth | GitHub `fefejiro/FTC-HOLDING` | Commit and remote checksum required |
| Targeted install, lint, test, and web/static build | Codespaces and manual Cloud Offload Builds | No deployment or production secrets |
| Android Studio, ADB, Logcat, physical Pixel | Local Windows with SDK/cache on `D:` | Device evidence remains local |
| iPhone/TestFlight acceptance | Physical iPhone and App Store Connect | No claim from Android-only test evidence |
| Signed release archives and handovers | PeacePad Google Drive profile after manifest review | Never upload source secrets or service-account keys |

## Codespaces / Codex cloud environment

Create one environment from the existing `.devcontainer/devcontainer.json`:

`FTC-HOLDING Cloud Dev`

The devcontainer uses Node 20, Git, and an existing `npm ci` post-create step.
Run the first preflight on the exact Git branch that will be worked on:

```bash
node --version
npm --version
npm ci
npm run doctor
npm run audit:secrets
```

Record missing tools instead of installing production tooling ad hoc. Android
emulators, Xcode, signing, database access, store uploads, and production
deployments do not belong in this shared baseline environment.

## Manual Cloud Offload Builds

`.github/workflows/cloud-offload-builds.yml` is manual-only and accepts one
selected workload. It has no deployment steps and receives no production
credentials. It replaces the old disabled Dispatch/SayWetin-only workflow;
the old broad automatic pull-request behavior remains intentionally absent.

Available lanes:

- `repo-preflight`: root dependency install, basic doctor, secret scan.
- `peacepad-native`: React Native dependency install, guardrails, secret scan,
  TypeScript, and optional Jest tests.
- `saywetin`, `dispatch`, `ftc-site`, `jobagent`: existing local checks/builds
  only.

Reports contain source SHA, ref, workload, Node/npm versions, and timestamps.
They are retained for three days and are not a durable release archive.

## Keep local tools on D:

Already verified as D:-backed:

- Android SDK: `D:\Android\Sdk`
- Gradle user home: `D:\.gradle-peacepad`

Move remaining caches one tool at a time only after closing the corresponding
tool. Use durable D: paths such as:

```text
D:\FTC-Caches\npm
D:\FTC-Caches\expo
D:\FTC-Caches\eas
D:\FTC-Caches\android-avd
D:\FTC-Caches\temp
```

Verify each tool can reinstall and build after its move before deleting its
former C: cache. Do not move the Windows recovery partition, user profile, Git
working trees, or database files as part of cache relief.

## Archive and deletion rules

1. Inventory a candidate release/export locally.
2. Exclude `.env*`, service-account JSON, signing keys, provisioning profiles,
   certificates, device logs with personal data, `node_modules`, and source
   trees.
3. Create a SHA-256 manifest containing each archived file, size, source commit,
   and purpose.
4. Upload only the reviewed archive and its manifest to the PeacePad Google
   Drive profile.
5. Read back the Drive metadata and compare the manifest locally.
6. Only then remove the exact duplicated local archive target. Never run a
   broad cleanup or delete a Git worktree by pattern.

## First safe sequence

1. Create `FTC-HOLDING Cloud Dev` from the existing devcontainer.
2. Dispatch `Cloud Offload Builds` with `repo-preflight` against the intended
   source branch.
3. Dispatch `peacepad-native` only when working on PeacePad Native.
4. Keep final Android/iOS device testing and signed submissions in their
   product-specific release workflows.
5. Build a reviewed archive inventory before any Drive upload or local delete.
