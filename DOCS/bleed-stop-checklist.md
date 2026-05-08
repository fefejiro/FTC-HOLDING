# Phase A — Bleed-Stop Checklist

Status: in progress (2026-04-30, updated 2026-05-07)

This doc captures the actions needed to stop infra bleeding. Items marked **MANUAL** require user approval before running (destructive). Items marked **DONE** are completed in this branch.

---

## A1. Delete dead Railway services — **DONE** (2026-05-07)

Confirmed deleted by user.

---

## A2. Cancel failing GH Actions runs — **DONE** (2026-05-07)

Active queue (queued + in_progress + waiting) verified empty after A3 disabled noisy workflows. The 200+ historical `failure` rows are cosmetic noise — `gh run cancel` is a no-op on completed runs. A3 prevents new failures from spawning.

### Original instructions (kept for reference)

\`\`\`powershell
gh run list --repo fefejiro/FTC-HOLDING --status failure --limit 200 --json databaseId | `
  ConvertFrom-Json | ForEach-Object { gh run cancel $_.databaseId --repo fefejiro/FTC-HOLDING }
\`\`\`

Run after merging this branch so newly-disabled workflows don't repopulate the queue.

---

## A3. Disable noisy workflows — **DONE** (in this branch)

Job-level \`if: false\` added to:

- [x] [.github/workflows/client-project-buNEEDS gh re-auth**

`gh auth status` reports the keyring token is invalid. Re-auth, then run:

\`\`\`powershell
gh auth login -h github.com
gh run list --repo fefejiro/FTC-HOLDING --status failure --limit 200 --json databaseId | `
  ConvertFrom-Json | ForEach-Object { gh run cancel $_.databaseId --repo fefejiro/FTC-HOLDING }
\`\`\`

Run after merging this branch so newly-disabled workflows don't repopulate the queue. Same gh re-auth unblocks `npm run ci:seed:phase-b`

To re-enable any of these later, remove the \`if: false\` line from the affected job.

---

## A4. Document `enchanting` Railway account — **MANUAL** (5 min)

Log in to Railway with the `enchanting` account (separate from `peacepad@peacepad.ca`):

1. List all projects, services, custom domains.
2. Mark which are still live, which are dead.
3. Append to `docs/infra-inventory.md` (create if missing).

Per memory: `sunny-acceptance` in `enchanting-caring` is paused and **NOT** SayWetin. The DNS for `api.saywetin.app` should be remapped from `sunny-acceptance` → `splendid-spirit/saywetin-api` in the Railway dashboard.
** (code scan)

Full scan output in [docs/auth-allowlist-audit.txt](auth-allowlist-audit.txt) (192 hits across APPS, PACKAGES, workers).

### Findings + actions taken

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Garden Cleaners admin email typo `mike.fejiro@mial.com` (missing `g`) blocked Mike's admin login in 2 files | **High** | ✅ **Fixed in this branch** — corrected to `mike.fejiro@gmail.com` in [APPS/ftc-site/app/api/garden-cleaners-admin-users/route.ts](../APPS/ftc-site/app/api/garden-cleaners-admin-users/route.ts) and [APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx](../APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx) |
| 2 | SayWetin admin password hardcoded in source — `Efiuvwere@1234!` appears in `APPS/saywetin/server/admin-auth.ts` and test files | **Critical** (OWASP A07) | ⚠️ **File `[Bug]` issue** — move to env var, rotate password, scrub git history |
| 3 | Una Labs admin allowlist matches plan: `mike.fejiro@gmail.com`, `fejiro.efiuvwere@gmail.com` (env-overridable via `NEXT_PUBLIC_UNALABS_ADMIN_EMAILS`) | OK | None |
| 4 | Garden Cleaners admin allowlist (after typo fix): `hello@unalabs.cloud`, `fejiro.efiuvwere@gmail.com`, `mike.fejiro@gmail.com`, `uby400@gmail.com` | OK | None |
| 5 | PeacePad uses DB `users.isAdmin` flag + `ADMIN_EMAIL` env (default `peacepad@peacepad.ca`) — no hardcoded list | OK | None |
| 6 | ATEAM telegram-gateway uses persisted `allowlist.json` (bootstrap claim via `/link`) | OK | None |
| 7 | Stripe worker uses `ADMIN_EMAIL` env var | OK | None |

### Recommended follow-up issues (file as `[Bug]`)

- **[Bug] SayWetin: move hardcoded admin credentials out of source** (rotate password, use env var, remove from `admin-auth.ts` and test fixtures)
\`\`\`

Confirm each match maps to the expected list. File any drift as \`[Bug]\` issues.

---

## PeacePad session restore hotfix - QA VERIFY (2026-05-07)

### Completed

- Client raw DB error copy sanitized and committed as `cd7f9ec6 fix(peacepad): sanitize session restore errors in client`.
- Supabase SQL Editor used to create session store tables from `APPS/peacepad/migrations/hotfix_sessions.sql`.
- `peacepad.sessions` verified in Supabase with row count `0`.
- Railway `DATABASE_URL` shape now points to the Supabase shared pooler host; `SESSION_SCHEMA` is missing, so `public.sessions` must also exist.
- `npm run check` and `npm run build` pass from `APPS/peacepad`.
- Windows scheduled task `PeacePad Railway Redeploy 2026-05-07` created for 2026-05-07 8:05 PM ET to run `railway redeploy --service '@ftc/peacepad' --yes`.

### Remaining

- Confirm both session tables in Supabase:
  ```sql
  select
    to_regclass('public.sessions') as public_sessions,
    to_regclass('peacepad.sessions') as peacepad_sessions;
  ```
- After scheduled redeploy, retest PeacePad and tap `Retry session check`.
- Mark GO only if no raw DB/session error appears and compose/no-login flow still works.

---

## Garden Cleaners portal auth - GO for deploy QA (2026-05-07)

### Completed

- Garden portal UI is now Google OAuth only.
- Magic-link, OTP, email secure-link, and password login UI were removed from the Garden portal.
- Garden admin allowlist is restricted to:
  - `uby400@gmail.com`
  - `mike.fejiro@gmail.com`
- Staff access still resolves for `@gardencleaners.ca` addresses.
- Unknown authenticated users resolve as client users.
- Portal loading fallback added so the user is not left on an indefinite loading state.
- Stripe API version references in ftc-site checkout/activation routes were aligned with the installed Stripe SDK type definitions.
- Validation passed:
  - `git diff --check`
  - `npm.cmd --workspace=@ftc/auth run build`
  - `npm.cmd --workspace=@ftc/ftc-site run build`

### Remaining

- Push and deploy the Garden ftc-site build to Cloudflare Pages.
- Confirm Supabase Google provider is enabled and redirect URLs include `https://gardencleaners.ca/garden-cleaners/portal`.
- Retest Google login on live Garden portal with:
  - `uby400@gmail.com`
  - `mike.fejiro@gmail.com`
- Mark final owner/client GO only after both admin dashboard sessions load live.
