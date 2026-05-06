# Anion — Production Readiness Commands

Use these commands before and after each production deploy.

## 1) Pre-deploy preflight

```bash
cd APPS/anion
npm run preflight:prod
```

Checks included:

- required env var presence
- TypeScript check
- Next.js build
- OpenNext/Worker build
- migration file sanity

## 2) Post-deploy verification

```bash
cd APPS/anion
ANION_BASE_URL=https://your-production-domain.com npm run verify:prod
```

Checks included:

- `GET /api/health`
- `GET /api/status`
- auth callback URL sanity (`/auth/callback`)
- optional Stripe webhook endpoint reachability
- optional Daily room endpoint contract smoke (non-destructive)

Optional flags:

```bash
CHECK_STRIPE_WEBHOOK=1 CHECK_DAILY_ROOM_SMOKE=1 ANION_BASE_URL=https://your-production-domain.com npm run verify:prod
```

Both scripts print a pass/fail summary and exit non-zero when any required check fails.
