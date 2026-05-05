---
name: ftc-deployment-recovery
description: Use when a Cloudflare Pages, Railway, Supabase, Expo/EAS, API domain, build output, env var, routing, or production deployment is failing and needs disciplined recovery without touching unrelated apps.
---

# FTC Deployment Recovery

Use this skill when production is sulking. The first job is to find the real failure boundary, not to throw config at the wall like pasta.

## Inputs

- Project/app name
- Hosting provider and dashboard target, if known
- Failing URL and observed error
- Latest commit/deployment ID, if available
- Build command and output directory, if known
- Required env var names

## Workflow

1. Identify the deployment surface:
   - app folder
   - package scripts
   - build output directory
   - hosting provider
   - custom domain mapping
2. Separate failure type:
   - build failure
   - output directory mismatch
   - runtime env missing
   - auth/permission failure
   - domain/DNS/routing issue
   - stale or wrong service deployed
3. Verify locally where possible:
   - build/typecheck
   - generated output exists
   - server starts with required env names
   - health/public endpoint behavior
4. Verify production where possible:
   - live URL status code
   - deployment logs
   - health endpoint
   - expected auth guard behavior
5. Patch only low-risk code/config if evidence is clear.
6. Document dashboard-only owner actions exactly.

## Provider Notes

- Cloudflare Pages needs a correct output directory and build command.
- Railway runtime failures often reduce to missing env vars, wrong start command, or wrong service/domain mapping.
- Supabase Auth template changes do not fix SMTP sender display name on the default mailer.
- Expo/EAS public env vars must be available at build time.

## Common Failure Modes

- Treating API root 404 as proof the API is down.
- Running git commands outside the repo root.
- Fixing the wrong app in a monorepo.
- Printing secret values while verifying env.
- Broad-staging unrelated generated files.

## Output

- Failure type
- Root cause or strongest evidence-backed hypothesis
- Files/config changed
- Dashboard actions needed
- Verification result
- GO/HOLD/NO-GO
