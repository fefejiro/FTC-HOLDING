# Anion Release Log

| Date | Version | Change | Validation |
|---|---|---|---|
| 2026-05-20 | 0.2.7 | Switch login to Google OAuth only, deploy live login update, and sync committed status/auth readiness artifacts with the current runtime and blocker model. | Verified — `https://anion.unalabs.cloud/login` shows Google-only sign-in and `/api/health` returns 200 |
| 2026-05-20 | 0.2.4 | Fix: Guard Supabase init in middleware when env vars are absent. `/api/health` now excluded from middleware matcher and middleware skips `createServerClient` gracefully when URL/anon key are not set. Cloudflare Worker version `61951451` deployed. | Verified — `https://anion.unalabs.cloud/api/health` → `{"ok":true}` |
| 2026-05-19 | 0.2.3 | Premium UX pass completed across core surfaces (`globals.css`, root layout, home, login, pricing, lesson room states). Follow-up fix applied for Supabase auth type imports to restore CI type-check compatibility. | Passed (`npm run ci:check` on 2026-05-19) |
| 2026-05-06 | 0.2.2 | Security hardening baseline: API CORS allow-list, CSRF checks for state-changing routes, security headers baseline, runtime-selectable rate limiter (Cloudflare KV path + memory fallback), and focused security tests/docs | In progress |
| 2026-05-06 | 0.2.1 | M1 auth flow execution: callback route, magic-link redirect fix, seeded role profile, local unattended sign-in smoke verified; RLS policy migration authored | Partial (policy rollout pending) |
| 2026-05-05 | 0.2.0 | M0 platform realignment: Next.js App Router migration, OpenNext setup, env contract cleanup, Supabase migration scaffold, CI baseline | In progress |
| 2026-04-23 | 0.1.0 | Initial foundation scaffold | Pending |
