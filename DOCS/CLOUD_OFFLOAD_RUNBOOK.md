# Cloud Offload Runbook ($0-first)

This runbook moves heavy local workload to cloud execution while keeping costs near zero.

## Goals

- Keep laptop focused on editing and quick checks.
- Run heavy builds/tests in GitHub Actions.
- Store build outputs as short-lived cloud artifacts.
- Keep local disk clean with scripted cleanup.

## What Is Included

1. Codespaces-ready dev environment in `.devcontainer/devcontainer.json`
2. Cloud build workflow in `.github/workflows/cloud-offload-builds.yml`
3. Local cleanup script in `scripts/cleanup-local-build-artifacts.ps1`

## Daily Flow

1. Local: edit, run targeted checks.
2. Push branch to GitHub.
3. Cloud: run `Cloud Offload Builds` workflow.
4. Download artifacts only when needed.
5. Periodically run local cleanup script.

## Workflow Lanes

Workflow: `Cloud Offload Builds`

Runs on:
- Pull requests touching Dispatch, SayWetin, ftc-site, packages, or lockfiles.
- Manual dispatch with toggles for heavier checks.

Main lanes:
- Dispatch build (always)
- Dispatch typecheck (PR by default, optional on manual)
- SayWetin typecheck + tests (PR by default, optional on manual)
- SayWetin web verification build (always)
- Dispatch Playwright smoke (manual and optional)
- Optional ftc-site build (manual toggle)

Artifacts (manual runs):
- `dispatch-dist`
- `saywetin-web-dist`
- `saywetin-server-dist`
- `dispatch-playwright-results` when E2E is enabled
- `ftc-site-next-build` when ftc-site build is enabled

Retention:
- 3 days for all uploaded artifacts

## Manual Trigger Profile (Recommended)

For normal offload:
- `run_dispatch_typecheck = true`
- `run_dispatch_e2e = false`
- `run_saywetin_typecheck = true`
- `run_saywetin_tests = true`
- `upload_artifacts = true`
- `run_ftc_site_build = false`

For release hardening:
- Enable `run_dispatch_e2e`
- Enable `run_ftc_site_build` only when needed

## Codespaces Notes

Use Codespaces for:
- npm install
- typecheck
- unit tests
- web builds
- Playwright checks

Android emulator and Play submission remain better on dedicated Android-capable runners or local Android Studio.

## Local Cleanup Commands

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup-local-build-artifacts.ps1
```

Apply cleanup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup-local-build-artifacts.ps1 -Apply
```

Include stale node_modules (older than 14 days by default):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup-local-build-artifacts.ps1 -IncludeNodeModules
```

Apply including stale node_modules older than 21 days:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup-local-build-artifacts.ps1 -IncludeNodeModules -NodeModulesMaxAgeDays 21 -Apply
```

## Optional Paid Upgrade Path

If needed later:
- Add larger Codespaces machine for burst builds.
- Add self-hosted Android runner for native builds in CI.
- Add artifact promotion to Releases for long-lived binaries.
