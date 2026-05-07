# Phase A — Bleed-Stop Checklist

Status: in progress (2026-04-30)

This doc captures the actions needed to stop infra bleeding. Items marked **MANUAL** require user approval before running (destructive). Items marked **DONE** are completed in this branch.

---

## A1. Delete dead Railway services — **MANUAL**

The following services are confirmed dead and safe to delete:

- `@ftc/dispatch` (project: `splendid-spirit`)
- `@ftc/ftc-site` (project: `splendid-spirit`) — only if FTC marketing has fully moved to Cloudflare Pages

**Verify before deleting:**
\`\`\`powershell
railway link --project splendid-spirit
railway service list
\`\`\`

**Then in Railway dashboard** (do not script this — manual confirm):
- splendid-spirit → @ftc/dispatch → Settings → Danger → Delete service
- splendid-spirit → @ftc/ftc-site → Settings → Danger → Delete service (only after CF Pages confirmed serving ftc-holding.com)

**Do not** delete `saywetin-api`, `ateam-platform`, `@ftc/peacepad-extension` — those are live.

---

## A2. Cancel failing GH Actions runs — **MANUAL** (one command)

\`\`\`powershell
gh run list --repo fefejiro/FTC-HOLDING --status failure --limit 200 --json databaseId | `
  ConvertFrom-Json | ForEach-Object { gh run cancel $_.databaseId --repo fefejiro/FTC-HOLDING }
\`\`\`

Run after merging this branch so newly-disabled workflows don't repopulate the queue.

---

## A3. Disable noisy workflows — **DONE** (in this branch)

Job-level \`if: false\` added to:

- [x] [.github/workflows/client-project-build-trigger.yml](.github/workflows/client-project-build-trigger.yml) — scaffold job
- [x] [.github/workflows/portfolio-e2e-telemetry-sync.yml](.github/workflows/portfolio-e2e-telemetry-sync.yml) — sync-telemetry (was running every 15min)
- [x] [.github/workflows/cloud-offload-builds.yml](.github/workflows/cloud-offload-builds.yml) — build-suite
- [x] [.github/workflows/og-trades-deploy.yml](.github/workflows/og-trades-deploy.yml) — deploy

Also fixed invalid workflow-root \`if: false\` in saywetin-extension subrepo:
- [x] APPS/saywetin-extension/.github/workflows/chrome-webstore-publish.yml
- [x] APPS/saywetin-extension/.github/workflows/release.yml

To re-enable any of these later, remove the \`if: false\` line from the affected job.

---

## A4. Document `enchanting` Railway account — **MANUAL** (5 min)

Log in to Railway with the `enchanting` account (separate from `peacepad@peacepad.ca`):

1. List all projects, services, custom domains.
2. Mark which are still live, which are dead.
3. Append to `docs/infra-inventory.md` (create if missing).

Per memory: `sunny-acceptance` in `enchanting-caring` is paused and **NOT** SayWetin. The DNS for `api.saywetin.app` should be remapped from `sunny-acceptance` → `splendid-spirit/saywetin-api` in the Railway dashboard.

---

## A5. Auth allowlist audit — **DONE in code, MANUAL to verify**

Current admin allowlists (per memory):
- **Una Labs admin:** `mike.fejiro@gmail.com` + `fefejiro` (GitHub)
- **Garden Cleaners admin:** `<UB email>` + `mike.fejiro@gmail.com`

To audit:
\`\`\`powershell
# Find all allowlist references
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.mjs -Path APPS/,PACKAGES/,workers/ |
  Select-String -Pattern "allowlist|ADMIN_EMAIL|isAdmin\s*=" -SimpleMatch:$false |
  Select-Object Path, LineNumber, Line
\`\`\`

Confirm each match maps to the expected list. File any drift as \`[Bug]\` issues.
