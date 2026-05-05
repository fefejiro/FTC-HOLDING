# FTC HOLDING Full Audit Handover (2026-03-07)

This document is a repo-level handover for `C:\FTC HOLDING` so a new engineer can understand current state, risks, and next steps without prior context.

## 1. Scope and Baseline

- Audit root: `C:\FTC HOLDING`
- Audit date: 2026-03-07
- Git remote: `origin https://github.com/fefejiro/FTC-HOLDING.git`
- Baseline commit (HEAD at audit start): `799935ebc35a62ea0c6a70552d46dd342268a129`
- Deployment actions performed: none
- Destructive actions performed: none

## 2. Monorepo Topology (Observed)

Top-level directories:

- `APPS/`
  - `ftc-site` (Next.js public site)
  - `peacepad` (Vite client + Node API + Capacitor)
  - `saywetin` (Vite client + Node API + Capacitor)
  - `ATEAM` (local-first AI app, currently not tracked by root git)
- `PACKAGES/`
  - `auth`, `config`, `logger`, `supabase`, `types`
- `DOCS/` (cross-repo docs, currently heavily PeacePad/deploy focused)
- `workers/peacepadai` (Cloudflare Worker)

Other notable top-level paths:

- `FTC-HOLDING/` exists as a nested repository-like duplicate tree (contains its own `.git`)
- `client/public` exists but is empty at audit time
- `test-results/` exists at root

## 3. Git and Workspace State

### 3.1 Branch and status

- Branch: `main` tracking `origin/main`
- Root worktree is dirty, primarily due `APPS/ftc-site` changes.
- `APPS/ATEAM/` appears as fully untracked in the root repo state.

### 3.2 Key working tree findings

- Modified tracked files are concentrated in `APPS/ftc-site/*`.
- Untracked paths include:
  - `APPS/ATEAM/`
  - multiple new `APPS/ftc-site/*` files
  - `FTC-HOLDING/` nested tree

### 3.3 Workspace definitions

Root `package.json` declares workspaces:

- `APPS/*`
- `PACKAGES/*`

Observation:

- `APPS/ATEAM` currently has no root `package.json` (backend package is under `APPS/ATEAM/Server/package.json`), so it is not a normal root workspace package in current shape.

## 4. Documentation and Source-of-Truth Drift

### 4.1 Root docs drift

`README.md` and parts of runbook content are stale/inconsistent with current structure:

- Root README still says `PACKAGES` “currently contains ateam” (current observed layout has `ATEAM` under `APPS/` and untracked by root git).
- Several docs still contain older migration notes and encoding artifacts.

### 4.2 Operational docs (current signal)

- Root `START_HERE.md` is PeacePad-centric and up-to-date with split ownership model:
  - Frontend: Cloudflare Pages (`peacepad.ca`)
  - API: Railway (`api.peacepad.ca`)
- Phase docs exist in `DOCS/` for PeacePad hardening/baselines.

## 5. CI / Workflow Inventory

Workflows found:

- `.github/workflows/ci.yml`
  - `ftc-site` build + Playwright E2E on push/PR to `main`
- `.github/workflows/peacepad-production-gates.yml`
  - push to `main` + manual dispatch
  - runs PeacePad ownership verify + prod verify + guest-auth smoke
  - soft/hard gate mode logic based on date window
- `.github/workflows/worker-build-validate.yml`
  - validates `workers/peacepadai` with `wrangler deploy --dry-run`

## 6. App-by-App Audit Snapshot

## 6.1 PeacePad (`APPS/peacepad`)

Status summary:

- Production ownership checks: PASS
- Production endpoint verification: PASS
- Guest auth smoke: PASS
- Update lifecycle E2E smoke: FAIL (specific UI interaction issue)
- Local `npm run build` on Windows: FAIL due Unix `rm` command in `clean` script

Executed checks and outcomes:

1. `npm --prefix APPS/peacepad run verify:deployment-ownership`
   - PASS
   - confirms web/api ownership split and API domain references

2. `npm run verify:peacepad:prod`
   - PASS
   - checks:
     - `https://peacepad.ca`
     - `https://www.peacepad.ca`
     - `https://api.peacepad.ca/health`
     - `https://api.peacepad.ca/api/health`
     - auth callback routes
     - `/_peacepad/build-meta.json` + cache-control expectations
     - onboarding bundle references `api.peacepad.ca`

3. `npm --prefix APPS/peacepad run smoke:guest-auth`
   - PASS
   - `/onboarding`, `/api/health`, guest auth/session endpoints passed

4. `npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle`
   - FAIL
   - failing test path:
     - `tests/e2e/p1-critical/update-lifecycle.spec.ts`
   - observed failure:
     - click on `[data-testid="button-update-later"]` blocked by overlay interception
     - traces show modal/backdrop intercepting pointer events
   - result summary:
     - 1 failed, 1 flaky, 3 passed

5. `npm --prefix APPS/peacepad run build`
   - FAIL on Windows
   - reason:
     - `clean` script uses `rm -rf ...`, not available in Windows cmd context

Additional note:

- PeacePad has extensive docs and artifacts in-app root; operational docs are spread between root `DOCS/` and app-local markdowns.

## 6.2 ftc-site (`APPS/ftc-site`)

Status summary:

- Build passes in unrestricted execution context.
- This app currently has active local modifications and additions.

Executed check:

- `npm --prefix APPS/ftc-site run build`
  - PASS when run outside sandbox restrictions
  - generated static pages and dynamic work routes

Note:

- Initial sandbox run returned `spawn EPERM`; unrestricted rerun passed.

## 6.3 SayWetin (`APPS/saywetin`)

Status summary:

- Frontend build gate passes.
- Typecheck currently fails with multiple TS issues.

Executed checks:

1. `npm --prefix APPS/saywetin run verify:frontend-build`
   - PASS when run outside sandbox restrictions
   - output validated under `dist/public`
   - warning: large chunks >500 kB

2. `npm --prefix APPS/saywetin run check`
   - FAIL
   - issues include:
     - TS type mismatches (client + server)
     - schema enum type compatibility in storage layer
     - Vite plugin type incompatibility between root and app-local vite types

## 6.4 ATEAM (`APPS/ATEAM`)

Status summary:

- Root git currently sees `APPS/ATEAM` as untracked.
- ATEAM has its own internal structure and docs.
- Backend tests pass in unrestricted execution context.

Observed structure:

- `Public/`, `Server/`, `Docs/`, `memory/`
- backend package file at `APPS/ATEAM/Server/package.json`
- no root app `package.json`
- many temporary files in app root (`tmpclaude-*`), plus unusual zero-length files

Executed check:

- `npm --prefix APPS/ATEAM/Server run test:backend`
  - PASS (7 suites passed, 1 skipped)
  - includes capability contract, scope middleware, speech clarity integration tests

## 7. Shared Package Layer (`PACKAGES/*`)

Packages present and build scripts available:

- `@ftc/auth`
- `@ftc/config`
- `@ftc/logger`
- `@ftc/supabase`
- `@ftc/types`

These built successfully as part of `ftc-site` prebuild in this audit run.

## 8. Security and Verification Signals

- Root secret scan executed:
  - `npm run audit:secrets`
  - Result: PASS (“no non-placeholder secrets detected in tracked files”)

- Production verification tooling exists and is usable:
  - root scripts under `scripts/*.ps1`
  - PeacePad production checks align with current architecture

## 9. High-Risk Findings (Actionable)

1. `APPS/ATEAM` not tracked in root git state.
   - Risk: loss of continuity; accidental omission from CI/review history.

2. Nested duplicate repository tree `FTC-HOLDING/` at root.
   - Risk: operator confusion, wrong working directory commits, accidental duplicate edits.

3. PeacePad update lifecycle E2E smoke failing.
   - Risk: regression in update prompt interactions (overlay intercepts CTA).

4. PeacePad Windows build script portability issue (`rm -rf`).
   - Risk: local Windows build breaks despite CI/prod expectations.

5. SayWetin typecheck fails (`npm run check`).
   - Risk: drift between compile-time and runtime expectations; release confidence reduced.

6. Root docs drift.
   - Risk: onboarding confusion for new operators; wrong assumptions about repo/package layout.

## 10. Medium-Risk Findings

- Mixed dependency resolution context in SayWetin (root vs app-local `vite` type mismatch signals).
- Documentation sprawl across root + app-local markdowns without single canonical index.
- ATEAM root contains non-essential temp artifacts that should be cleaned and policy-managed.

## 11. Recommended Next Steps (Before Any Deployment)

1. Decide canonical repo boundary now:
   - either integrate `APPS/ATEAM` into root tracking intentionally,
   - or relocate/archive it explicitly out of this repo.

2. Resolve root duplication risk:
   - document purpose of nested `FTC-HOLDING/` or remove it if accidental.

3. Fix PeacePad E2E update-lifecycle blocker:
   - stabilize modal layering so `button-update-later` is clickable under test conditions.

4. Make PeacePad build script cross-platform:
   - replace Unix `rm -rf` with cross-platform equivalent (`rimraf` or Node-based clean script).

5. Triage SayWetin typecheck errors:
   - establish whether `check` is currently a release gate; if yes, make it green before release.

6. Refresh root docs:
   - update `README.md` and runbook to match actual layout and current ownership model.

7. Add a single canonical operator handover index:
   - point to active docs for PeacePad, ftc-site, SayWetin, ATEAM, workers.

## 12. Command Evidence Ledger

Commands run during this audit (key subset):

- `git status -sb`
- `npm run audit:secrets`
- `npm --prefix APPS/peacepad run verify:deployment-ownership`
- `npm run verify:peacepad:prod`
- `npm --prefix APPS/peacepad run smoke:guest-auth`
- `npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle`
- `npm --prefix APPS/peacepad run build`
- `npm --prefix APPS/ftc-site run build`
- `npm --prefix APPS/saywetin run verify:frontend-build`
- `npm --prefix APPS/saywetin run check`
- `npm --prefix APPS/ATEAM/Server run test:backend`

## 13. Handover Bottom Line

- PeacePad production verification stack is mostly healthy, but update-lifecycle E2E currently has a real interaction failure.
- ftc-site build is healthy.
- SayWetin frontend build is healthy, but typecheck is not.
- ATEAM backend tests are healthy, but repo integration/state management around ATEAM is not yet clean at monorepo level.
- Repo governance/documentation needs alignment before treating this tree as operationally stable for broad team handoff.
