# Anion CI — Trigger Map & Required Checks

## What runs on an Anion PR

When a pull-request touches only `APPS/anion/**`, `PACKAGES/anion-types/**`, or
`PACKAGES/anion-shared/**`, the following GitHub Actions jobs run:

| Job | Workflow | What it checks | Required for merge? |
|-----|----------|---------------|---------------------|
| `anion-web-ci / Typecheck & Build` | `anion-web-ci.yml` | `tsc --noEmit` + `next build` | ✅ Yes |
| `anion-web-ci / E2E Smoke` | `anion-web-ci.yml` | Playwright smoke against public routes | ✅ Yes |
| `anion-web-ci / Worker Build (Cloudflare)` | `anion-web-ci.yml` | `opennextjs-cloudflare build` | ℹ️ Informational |

## What does NOT run on an Anion-only PR

| Workflow | Why it is skipped |
|----------|-------------------|
| `ci.yml` (una-labs-site build) | Path-filtered to `APPS/una-labs-site/**` only |
| `cloud-offload-builds.yml` | Path-filtered to `APPS/dispatch/**`, `APPS/saywetin/**`, `APPS/ftc-site/**` |
| `worker-build-validate.yml` | Path-filtered to `workers/peacepadai/**` |
| `og-trades-deploy.yml` | Push-to-main only, path-filtered to `APPS/ftc-site/**` |
| `peacepad-production-gates.yml` | Push-to-main + `workflow_dispatch` only |
| `saywetin-native-qa-playstore-prod.yml` | Push-to-main only, path-filtered to `APPS/saywetin-native/**` |
| `peacepad-weekly-metrics-sync.yml` | Schedule + `workflow_dispatch` only |
| `unalabs-status-sync.yml` | Schedule + `workflow_dispatch` only |
| `portfolio-e2e-telemetry-sync.yml` | Schedule + push-to-main only |
| `client-project-build-trigger.yml` | `repository_dispatch` only |

> **Cloudflare Pages preview deployments**: Cloudflare Pages projects
> configured with the GitHub integration (garden-cleaners, og-trades, etc.)
> may still post deployment status checks on every PR regardless of changed
> paths. This is controlled in the Cloudflare dashboard per project —
> enable "Branch deploy controls" and limit deployments to the `main` branch
> if you want to stop preview deployments triggering on Anion PRs.

---

## Recommended branch protection rules for `main`

Add the following as **required status checks** for the `main` branch under
_Settings → Branches → Branch protection rules_:

```
anion-web-ci / Typecheck & Build
anion-web-ci / E2E Smoke
```

These checks run automatically whenever `APPS/anion/**` or the related
packages change. Because they are path-filtered, they will **not** run (and
therefore will not block) PRs that touch only other apps.

If you use [required status checks with "branches that match this pattern"](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging),
GitHub skips the required-check enforcement on PRs where the workflow never
runs (i.e., non-Anion PRs), so you get isolation for free once the path
filters are in place.

---

## E2E smoke tests locally

```bash
# From the repo root — build first, then run smoke
cd APPS/anion
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
npm run build

# Playwright starts `next start` automatically via webServer config
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
npx playwright test
```

### What the smoke tests cover

| Test | Route | Assertion |
|------|-------|-----------|
| Home page | `/` | `<h1>` contains "Class scheduling" |
| Login page | `/login` | `<h1>` contains "Sign in", email input visible |
| Pricing page | `/pricing` | `<h1>` contains "Invest in your child" |
| Tutors page | `/tutors` | `<h1>` contains "Tutor directory" |

Auth-gated routes (`/parent`, `/student`, `/tutor`, `/admin`, `/dashboard`,
`/lesson/*`) are **not** exercised in smoke — they require real Supabase
credentials and session state.

---

## Adding a new Anion check

1. Add steps inside the `validate` or `smoke` job in `.github/workflows/anion-web-ci.yml`.
2. To make it a required check, add its job name to the branch protection rules.
3. Do **not** add Anion steps to `ci.yml` or `cloud-offload-builds.yml` — keep each app's checks in its own workflow.
