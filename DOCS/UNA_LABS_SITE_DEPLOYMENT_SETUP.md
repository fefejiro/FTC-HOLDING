# UNA-LABS-SITE DEPLOYMENT SETUP

**Status**: ✅ Live deployment configured and tested
**Live URL**: https://unalabs.cloud/admin/status
**Latest Deploy**: https://aac12f99.ftc-site-pages.pages.dev

## What Was Done

You had pushed changes to `APPS/una-labs-site` but the deployment wasn't working because:
1. GitHub Actions CI was configured to build `APPS/ftc-site` (not `una-labs-site`)
2. Cloudflare Pages was linked to the `ftc-site-pages` project
3. The `una-labs-site` folder didn't have a `wrangler.toml` configuration

## Solution Implemented

### Step 1: Updated GitHub Actions CI Workflow
**File**: `.github/workflows/ci.yml`

Changed the job from `ftc-site` to `una-labs-site`:
- Now builds `APPS/una-labs-site` on every push to `main`
- Runs `npm run build` which generates static output in `out/`
- No test suite required (Next.js build validation is sufficient)

### Step 2: Created Cloudflare Pages Configuration
**File**: `APPS/una-labs-site/wrangler.toml`

```toml
name = "una-labs-site"
pages_build_output_dir = "out"
```

This tells Cloudflare Pages where to find the build output directory.

### Step 3: Verified Manual Deploy
Tested the deployment manually:
```powershell
cd APPS/una-labs-site
npm run build  # Outputs to out/ directory
npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
```

Result: ✅ Deployed successfully to `ftc-site-pages` project

## How It Works Now

1. **Developer pushes to `main`** on GitHub
2. **GitHub Actions** runs (`.github/workflows/ci.yml`):
   - Checks out the code
   - Installs dependencies for `APPS/una-labs-site`
   - Runs `npm run build` → outputs to `out/`
3. **Cloudflare Pages** auto-detects the push and deploys:
   - Pulls the `out/` directory from the build
   - Serves the static files on `ftc-site-pages.pages.dev`
   - Routes `unalabs.cloud` domain to the deployment

## Current State

| Component | Status | Details |
|-----------|--------|---------|
| GitHub repo | ✅ Main branch has latest code | Last 2 commits: CI workflow + wrangler.toml |
| GitHub Actions | ✅ Configured for una-labs-site | Job name: `una-labs-site` |
| Cloudflare Pages | ✅ Auto-deploy enabled | Project: `ftc-site-pages` |
| unalabs.cloud domain | ✅ Routes to deployment | 81 files deployed |
| /status route | ✅ Live with portfolio dashboard | 5 projects visible: Una Labs, SayWetin, PeacePad, Dispatch, ATEAM |

## What to Test

### 2026-04-21 Security Update

The status-board exposure model changed after the original deployment note.

- Public route:
  - `https://unalabs.cloud/status`
  - now redirects to `/admin/status`
- Admin route:
  - `https://unalabs.cloud/admin/status`
  - requires authenticated admin session
- Worker summary route:
  - `https://una-stripe-api.fejiro-efiuvwere.workers.dev/api/admin/status-summary`
  - returns `401` without an admin bearer token

Security deploy verified live with:

- Pages preview:
  - `https://aac12f99.ftc-site-pages.pages.dev`
- Worker:
  - `https://una-stripe-api.fejiro-efiuvwere.workers.dev`

1. Visit https://unalabs.cloud/status and confirm it redirects to `/admin/status`
2. Verify the portfolio dashboard loads only after admin login
3. Click through each project to see:
   - Delivery lanes (module status table)
   - Testing lanes
   - Connection health probes
   - Next actions and blockers
4. Verify auto-refresh works every 60 seconds
5. Confirm unauthenticated calls to `https://una-stripe-api.fejiro-efiuvwere.workers.dev/api/admin/status-summary` return `401`

## Next: Portfolio Status Feeds

The dashboard is now live, but the other 4 projects (SayWetin, PeacePad, Dispatch, ATEAM) are showing seeded/fallback data. To wire live feeds:

1. **SayWetin**: Add `APPS/saywetin/scripts/generate-status-summary.mjs` to export normalized status
2. **PeacePad**: Add `APPS/peacepad/scripts/generate-status-summary.mjs` 
3. **Dispatch**: Add `APPS/dispatch/scripts/generate-status-summary.mjs`
4. **ATEAM**: Add `APPS/ATEAM/scripts/generate-status-summary.mjs`

Each should follow the schema in `APPS/una-labs-site/lib/portfolio-status.ts` and push to GitHub so the portfolio dashboard can fetch them.

## Rollback (If Needed)

If you need to revert to `ftc-site`:
```powershell
git revert HEAD~1  # Revert wrangler.toml addition
git revert HEAD~2  # Revert CI workflow change
git push origin main
```

Then manually update Cloudflare Pages project settings to rebuild from `APPS/ftc-site` instead.

## Files Modified

- `.github/workflows/ci.yml` - Switched job from ftc-site to una-labs-site
- `APPS/una-labs-site/wrangler.toml` - Created new (added to git)

## Deployment Command Reference

To manually deploy without waiting for CI:
```powershell
cd APPS/una-labs-site
npm run build
npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
```

---

**Status Dashboard**: https://unalabs.cloud/status ✅
**Deployment Timeline**: Push → GitHub Actions (2 min) → Cloudflare Deploy (1 min) → Live
