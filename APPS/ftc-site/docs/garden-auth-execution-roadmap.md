# Garden Auth Execution Roadmap

Last updated: 2026-05-20
Owner: ftc-site (Garden Cleaners surface)

## Goal
Restore full Garden portal sign-in and role routing with objective QA gates.

## Current State
- Callback crash fixed on live.
- Callback fallback CTAs now navigate correctly.
- Full login still blocked because auth env is missing in ftc-site build context.

## Gate 1 - Callback Stability (Done)
Pass criteria:
- No global error screen on callback URL.
- Fallback CTAs both navigate.

Validation command:
```powershell
cd "C:\FTC HOLDING\APPS\ftc-site"
node scripts/qa-garden-auth-callback.mjs
```
Expected result:
- Exit code 0
- `hasGlobalCrash: false`

## Gate 2 - Auth Env Wiring (Blocked)
Required variables for build/runtime:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Current blocker:
- No local env file in `APPS/ftc-site` and no shell vars for required keys.

Preflight command:
```powershell
cd "C:\FTC HOLDING\APPS\ftc-site"
node scripts/verify-garden-portal-env.mjs
```
Expected result:
- `[garden-portal-env] Required environment variables are set.`

## Gate 3 - Auth-Enabled Deploy
Build and package:
```powershell
cd "C:\FTC HOLDING\APPS\ftc-site"
echo y | npx -p node@22 node ..\..\node_modules\next\dist\bin\next build
node scripts/fix-vercel-monorepo-output.mjs
```

Deploy:
```powershell
cd "C:\FTC HOLDING\APPS\ftc-site"
npx wrangler pages deploy . --cwd .vercel/output/static --project-name ftc-site-pages --branch main --commit-dirty=true
```

## Gate 4 - End-to-End Login QA (After Gate 2)
Pass criteria:
- Sign-in button visible on portal/login entry.
- OAuth start reaches Google.
- Callback processes and lands to role destination.
- Customer and staff/admin routes render expected lane widgets.

Evidence required:
- Playwright output JSON
- Final URL per lane
- Screenshot for each lane landing

## Non-goals During Auth Recovery
- No unrelated portal refactors
- No styling-only changes
- No route rewrites outside auth path unless failing a gate
