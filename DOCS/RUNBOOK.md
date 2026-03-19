# FTC HOLDING Runbook

Last updated: 2026-03-08
Canonical root: `C:\FTC HOLDING`

## 1. App Classification

### 1.1 Deployed app surfaces

1. PeacePad
- Frontend: Cloudflare Pages (`peacepad.ca`, `www.peacepad.ca`)
- API: Railway (`api.peacepad.ca`)

2. ftc-site
- Deployed as website shell (Cloudflare Pages flow via `APPS/ftc-site`)

3. SayWetin
- Deployed as split frontend/API surfaces
- Verify frontend output before cutover: `npm --prefix APPS/saywetin run verify:frontend-build`

### 1.2 Local-only / decision-pending surfaces

1. ATEAM (`APPS/ATEAM`)
- Active code and tests exist.
- Root git tracking/ownership decision is still pending.

2. Nested duplicate tree (`FTC-HOLDING/`)
- Contains its own `.git`.
- Not canonical for this root repo.

## 2. Daily Operator Checks

Run from `C:\FTC HOLDING`:

```powershell
git status -sb
npm run audit:secrets
```

### 2.1 PeacePad production checks

```powershell
npm --prefix APPS/peacepad run verify:deployment-ownership
npm run verify:peacepad:prod
npm --prefix APPS/peacepad run smoke:guest-auth
```

### 2.2 PeacePad critical E2E

```powershell
npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle
```

### 2.3 Build health checks

```powershell
npm --prefix APPS/peacepad run build
npm --prefix APPS/ftc-site run build
npm --prefix APPS/saywetin run verify:frontend-build
npm --prefix APPS/saywetin run check
npm --prefix APPS/ATEAM/Server run test:backend
```

### 2.4 Publish hygiene checks

Before production promotion for a frontend surface:

```powershell
git status -sb
git worktree list
```

Check for:
- unrelated in-progress work on current branch
- temp worktrees that indicate recent or active release handling
- whether the target deployment uses preview-by-branch or production-from-main behavior

## 3. Repo Ownership and Tracking Rules

1. Always operate from `C:\FTC HOLDING` unless explicitly switching.
2. Treat nested `FTC-HOLDING/` as non-canonical for this repo.
3. Do not assume `APPS/ATEAM` is part of root tracked history without checking `git ls-tree`.

Ownership reference:
- [REPO_OWNERSHIP_AND_TRACKING.md](REPO_OWNERSHIP_AND_TRACKING.md)

## 4. Known Risks

1. ATEAM root tracking ambiguity (manual decision required).
2. Duplicate nested tree can cause wrong-path commits if operators are not careful.
3. SayWetin typecheck may fail even when frontend build passes.
4. PeacePad E2E reliability should remain in release gate checks.

## 5. Operator Clarity Docs

For onboarding, prioritization, and safe publishing, read:

- [BUSINESS_ALIGNMENT_MAP.md](BUSINESS_ALIGNMENT_MAP.md)
- [PROJECT_CLASSIFICATION_MATRIX.md](PROJECT_CLASSIFICATION_MATRIX.md)
- [NEW_EMPLOYEE_OPERATOR_GUIDE.md](NEW_EMPLOYEE_OPERATOR_GUIDE.md)
- [GIT_AND_PUBLISH_PATH_GUIDE.md](GIT_AND_PUBLISH_PATH_GUIDE.md)

## 6. Escalation / Handover Artifacts

When handing over, include:

1. Current `git status -sb`
2. Results of command sets in sections 2.1 to 2.3
3. Production check failure details
4. Link to latest audit handover

Primary audit reference:
- [REPO_HANDOVER_AUDIT_2026-03-07.md](REPO_HANDOVER_AUDIT_2026-03-07.md)
