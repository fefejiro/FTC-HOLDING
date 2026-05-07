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
