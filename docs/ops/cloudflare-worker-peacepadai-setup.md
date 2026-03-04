# Cloudflare Worker Setup: `peacepadai`

This repository keeps a single canonical worker definition at:

- `workers/peacepadai/wrangler.toml`
- `workers/peacepadai/src/index.ts`

Use this checklist to configure Cloudflare Workers Builds for the `peacepadai` project.

## 1) Confirm Git integration source

In Cloudflare Dashboard:

1. Open **Workers and Pages**.
2. Open worker project **peacepadai**.
3. Check Git integration settings:
   - Repository: `fefejiro/FTC-HOLDING`
   - Branch: your default branch (typically `main`)
   - Root directory: `workers/peacepadai`

## 2) Confirm entrypoint

Ensure the worker entrypoint resolves to:

- `src/index.ts`

Because root is `workers/peacepadai`, this matches:

- `workers/peacepadai/wrangler.toml` with `main = "src/index.ts"`

## 3) Build/deploy settings

If Cloudflare prompts for commands:

- Install command: `npm install` (or your standard package manager)
- Build command: leave empty unless your worker needs a build step
- Deploy: Cloudflare handles deploy via Git integration

## 4) Pull request preview behavior

Check whether preview deployments for pull requests are enabled for this worker.

- If previews are disabled, PR checks may fail immediately.
- If previews are intentionally disabled, do not keep this external check required for all PRs.

## 5) Environment variables and secrets

Verify required configuration exists in Cloudflare for both environments:

- preview
- production

Missing required variables can cause immediate build/deploy failure.

## 6) Required checks policy

If `Workers Builds: peacepadai` is not a universal merge gate for this monorepo:

1. Remove it from required checks on `main`.
2. Use the internal path-scoped CI workflow instead:
   - `.github/workflows/worker-build-validate.yml`
