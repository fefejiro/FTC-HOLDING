# Copilot Current Handover - FTC / Una Labs

Date: 2026-05-01  
Audience: GitHub Copilot / Agent Mode / implementation agents  
Owner/validator: Codex CTO lane

## Purpose

This document gives Copilot the current operating truth for the FTC/Una Labs workspace so it does not rediscover stale context, touch the wrong files, or confuse project states.

Use this before starting any Garden Cleaners, SayWetin, Dispatch, auth, deployment, telemetry, or handoff work.

## Authority Model: CTO Lane and Dev Lane

This workspace uses a CTO-led, bounded-dev workflow.

### CTO Lane

The CTO lane is the final integration and validation authority.

Responsibilities:

- decide what should be worked on next
- define scope
- issue bounded implementation prompts
- protect secrets and production systems
- validate repo state
- reconcile conflicting dev reports
- decide GO/HOLD/NO-GO
- approve commits
- approve client-facing claims
- approve production handoff

The CTO lane may say:

- "Do not commit yet"
- "This report is not accepted"
- "Run stricter validation"
- "Stage only these files"
- "This is GO/HOLD/NO-GO"

If Copilot/Agent Mode output conflicts with CTO lane status, the CTO lane status wins until revalidated.

### Dev Lane

Copilot/Agent Mode is a bounded implementation worker, not the final decision-maker.

Responsibilities:

- inspect exact files
- implement the requested bounded task
- keep changes scoped
- run requested checks
- report facts
- avoid guessing
- avoid unrelated edits
- avoid commits unless asked

Copilot/Agent Mode should not:

- broaden scope without approval
- silently refactor unrelated code
- mark production ready without QA proof
- commit without explicit instruction
- stage all changes
- expose secrets
- invent missing context
- overwrite telemetry/status files with stale assumptions

### Standard Dev Workflow

Every implementation task should follow this flow:

1. **Receive bounded prompt**
   - workdir
   - goal
   - allowed files/folders
   - forbidden files/folders
   - validation commands
   - report format

2. **Inspect first**
   - run `git status --short`
   - read exact files
   - confirm paths exist
   - state planned edits if task is broad

3. **Implement narrowly**
   - edit only relevant files
   - do not touch unrelated apps/docs
   - do not commit

4. **Validate**
   - run requested build/typecheck/test commands
   - run `git diff --check` on changed files
   - run `git status --short`

5. **Report**
   - files changed
   - commands run
   - pass/fail output summary
   - blockers
   - assumptions
   - unrelated dirty files left untouched
   - recommended next action

6. **Wait for CTO approval**
   - CTO decides whether to patch more, commit, revert only own changes, or stop.

### Standard Report Format

Use this final report format:

```text
Task:

Files changed:

Files inspected:

Commands run:

Results:
- build:
- typecheck:
- tests:
- diff check:

Project status:
- GO/HOLD/NO-GO:
- blockers:
- next action:

Unrelated changes left untouched:

Commit status:
- committed: yes/no
- commit hash: if applicable
```

### Multi-Agent Pattern

If multiple agents are used, split them by responsibility:

- Dev 1: backend/data/deploy
- Dev 2: frontend/mobile/product implementation
- Dev 3: QA/docs/status/telemetry
- CTO lane: final validation and commit decision

Agents should not edit the same files in parallel unless explicitly coordinated.

### Commit Rules

Only commit after CTO approval.

Commit one logical lane at a time:

- Garden UI polish commit
- SayWetin config/QA commit
- Dispatch audit commit
- telemetry/docs commit
- auth/skills commit

Never combine unrelated Garden + SayWetin + Dispatch + IDE/temp changes in one commit.

## Global Rules

- Do not expose secrets, tokens, passwords, SMTP credentials, API keys, or service account values.
- Do not print env values in logs or chat.
- Do not commit unless explicitly asked.
- Do not stage unrelated files.
- Do not touch IDE files, temp files, Supabase temp files, or unrelated app changes.
- Always inspect current repo state before editing.
- If a file is read successfully, do not later claim it does not exist.
- Run commands from repo root unless instructed otherwise:

```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
```

## Repo Root

Primary repo:

```text
C:\FTC HOLDING\_restore_repo
```

Important apps:

```text
APPS/ftc-site
APPS/saywetin
APPS/saywetin-native
APPS/dispatch
```

Important docs/ops:

```text
DOCS/
ops/project-status.json
ops/delivery-ledger.jsonl
skills/
```

## Operating Model

Use a bounded-agent workflow:

1. Inspect exact files.
2. List planned edits before broad changes.
3. Keep changes narrow.
4. Run relevant checks.
5. Report files changed, commands run, pass/fail, blockers, and unrelated dirty files.
6. Codex CTO lane validates before commit.

Do not use broad "fix everything" prompts.

## Metrics, Dashboards, and Ledgers

FTC delivery telemetry system is now committed.

Committed baseline:

```text
47435fb3 docs(ops): add FTC delivery telemetry system
```

Files:

```text
DOCS/FTC_DELIVERY_METRICS_STANDARD.md
DOCS/FTC_PROJECT_LEDGER.md
ops/delivery-ledger.jsonl
ops/project-status.json
skills/ftc-delivery-telemetry/SKILL.md
DOCS/INDEX.md
```

Use these files as the current project status source:

- `ops/project-status.json` - machine-readable project state.
- `ops/delivery-ledger.jsonl` - append-only work ledger.
- `DOCS/FTC_PROJECT_LEDGER.md` - human-readable ledger.
- `DOCS/FTC_DELIVERY_METRICS_STANDARD.md` - how to classify work, blockers, velocity, QA, and GO/HOLD/NO-GO.
- `skills/ftc-delivery-telemetry/SKILL.md` - reusable agent guidance.

Older automation/dashboard references:

- `DOCS/UNALABS_E2E_AUTOMATION_HANDOVER.md`
- `DOCS/UNALABS_E2E_REPEATABLE_TEST_PLAN.md`
- Intended dashboard artifact:
  - `APPS/una-labs-site/public/ops/portfolio-e2e-status.json`
- Intended scripts:
  - `scripts/run-portfolio-e2e.mjs`
  - `npm run qa:portfolio:e2e`
  - `npm run qa:portfolio:sync`

Those older dashboard docs are useful context, but current truth should be written into the new telemetry files above.

### Una Labs Admin Status Dashboard

The live Una Labs admin/status surface is part of the operating picture.

Known URL pattern:

```text
https://unalabs.cloud/admin/status/
https://unalabs.cloud/admin/status/?project=peacepad
```

Use this dashboard as a visual/operator reference for project health, delivery lanes, testing lanes, feed mode, and release/status cards.

Important:

- Treat this as an authenticated/admin operator surface.
- Do not assume the public `/status` route is the canonical dashboard.
- Older docs note that `/status` redirects to `/admin/status`.
- Do not expose bearer tokens or auth headers for admin status APIs.
- If dashboard data conflicts with `ops/project-status.json`, report the mismatch and ask CTO lane which source is current before overwriting.

Related docs:

```text
DOCS/UNALABS_SECURITY_HANDOVER_2026-04-21.md
DOCS/UNA_LABS_SITE_DEPLOYMENT_SETUP.md
DOCS/UNALABS_STATUS.md
DOCS/UNALABS_TEST_PLAN.md
DOCS/UNALABS_E2E_AUTOMATION_HANDOVER.md
DOCS/UNALABS_E2E_REPEATABLE_TEST_PLAN.md
```

Known caveat:

- Some status/dashboard feeds may be seeded, manual, or fallback data unless a project has been wired into the normalized telemetry pipeline.
- The FTC delivery telemetry files remain the current repo-side source of truth for ongoing agent work:
  - `ops/project-status.json`
  - `ops/delivery-ledger.jsonl`
  - `DOCS/FTC_PROJECT_LEDGER.md`

## Skills

Committed skills:

```text
b03e69c4 docs(skills): add FTC cross-agent operating skills
90670cd3 feat(auth): add FTC auth foundation standard and helpers
```

Canonical skill location:

```text
skills/
```

Key skills:

```text
skills/ftc-auth-foundation/SKILL.md
skills/ftc-client-handoff/SKILL.md
skills/ftc-live-qa/SKILL.md
skills/ftc-deployment-recovery/SKILL.md
skills/ftc-multi-agent-orchestration/SKILL.md
skills/ftc-delivery-telemetry/SKILL.md
```

Use these skills as operating standards for future work.

## Auth Foundation

Committed:

```text
90670cd3 feat(auth): add FTC auth foundation standard and helpers
```

Files:

```text
PACKAGES/auth/src/index.ts
PACKAGES/auth/README.md
DOCS/FTC_AUTH_STANDARD.md
DOCS/GARDEN_AUTH_ALIGNMENT_WITH_FTC_STANDARD.md
skills/ftc-auth-foundation/SKILL.md
DOCS/INDEX.md
```

New helpers include:

- `normalizeEmail`
- `authRedirectTo`
- `resetPasswordForEmail`
- `updatePassword`
- `getUser`
- `isAdminRole`

## Garden Cleaners

### Current Status

Garden Cleaners is handoff-ready pending final owner/client acceptance and security signoff.

Current truth:

- Controlled walkthrough: GO
- Full handoff: GO pending final owner/client acceptance/security signoff
- SMTP sender issue: resolved
- Remaining technical blockers: none known for current MVP handoff

### Live URLs

```text
https://gardencleaners.ca
https://gardencleaners.ca/garden-cleaners/portal
https://gardencleaners.ca/garden-cleaners/portal#portal-access
```

### Admin Accounts

Production admin accounts:

```text
fejiro.efiuvwere@gmail.com
uby400@gmail.com
```

Do not share passwords. Use invite/reset/login flow only.

### SMTP / Email Branding

Committed:

```text
e05855d1 docs(garden): mark custom SMTP verified and handoff ready
```

Current truth:

- Provider: Resend
- Sender display name: FTC Client Portal
- Sender email: no-reply@unalabs.cloud
- Resend domain: verified
- Supabase SMTP: enabled
- Gmail sender display name: verified as FTC Client Portal
- Magic link body/header: FTC Client Portal
- Portal link lands on `/garden-cleaners/portal#portal-access`
- Admin dashboard verified after login

Do not re-open the old "Una Labs sender display" issue unless a new email proves regression.

### Key Garden Commits

```text
2f0c8e42 fix(garden): redirect auth links to portal
316731c7 fix(garden): polish portal login and stabilize live QA tests
114dce1a docs(garden): add client handoff and Una Labs closeout package
a5956d09 docs(garden): update handoff gates and auth status
00bb262e docs: update Garden login status and SayWetin video QA
e05855d1 docs(garden): mark custom SMTP verified and handoff ready
```

### Garden Docs

Important docs:

```text
DOCS/GARDEN_CUSTOM_SMTP_IMPLEMENTATION_RESULT.md
DOCS/GARDEN_PRODUCTION_ACCOUNT_SETUP_RESULT.md
DOCS/GARDEN_PRODUCTION_HANDOFF_GATE.md
DOCS/GARDEN_48H_HANDOFF_SPRINT_BOARD.md
DOCS/GARDEN_CLIENT_WALKTHROUGH_PACK.md
DOCS/GARDEN_CLIENT_HANDOFF_PACKAGE.md
DOCS/GARDEN_ADMIN_QUICK_START_GUIDE.md
DOCS/GARDEN_CLIENT_ACCEPTANCE_SIGNOFF.md
DOCS/GARDEN_CLIENT_SCREENSHOT_WALKTHROUGH_GUIDE.md
DOCS/GARDEN_PRODUCTION_ADMIN_LOGIN_VERIFICATION.md
```

### Current Garden UI Follow-Up

There are uncommitted Garden UI changes in:

```text
APPS/ftc-site/app/components/Header.tsx
APPS/ftc-site/app/garden-cleaners/portal/page.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx
```

Purpose:

- Add clear "Portal Login" CTA in nav.
- Keep "Get a Quote" separate.
- Move portal sign-in into first viewport.
- Remove blank unauthenticated `Role:` card.
- Show "Sign in to view your dashboard." before login.
- Ensure mobile first viewport makes login easy to find.

Before committing these UI changes:

1. Run build/typecheck.
2. Visually verify desktop and mobile:
   - `/garden-cleaners`
   - `/garden-cleaners/portal`
   - `/garden-cleaners/portal#portal-access`
3. Confirm no blank role panel.
4. Confirm admin dashboard still appears after login.
5. Commit only the Garden UI files if approved.

## SayWetin

### Current Status

SayWetin is HOLD / not release-ready.

Current blockers:

1. Production API at `https://api.saywetin.app` returned 404 on tested endpoints.
2. Backend route/deploy truth is not fully proven from current repo.
3. Android/Expo API base URL config must be proven in the actual release build.
4. Bluetooth/private listening failure is documented but not fully implemented in UX/code.
5. Physical device E2E QA still required.

### Important Paths

```text
APPS/saywetin
APPS/saywetin/ops/FULL_E2E_QA_REPORT.md
APPS/saywetin/ops/SAYWETIN_ANDROID_E2E_QA_SCRIPT.md
APPS/saywetin-native
APPS/saywetin-native/app.json
APPS/saywetin-native/eas.json
APPS/saywetin-native/package.json
APPS/saywetin-native/src/api/listen.ts
APPS/saywetin-native/src/api/live-lyrics.ts
APPS/saywetin-native/src/api/cultural-analysis.ts
APPS/saywetin-native/src/screens/ListenScreen.tsx
APPS/saywetin-native/src/screens/ResultScreen.tsx
APPS/saywetin-native/src/screens/LiveLyricsScreen.tsx
```

### Recent SayWetin Commit

```text
45239cbc2960a6391c5871ad84e6e65503844423 fix(saywetin): improve lyric timing UX and Android QA script
```

This patch improved:

- lyric timing UX foundation
- hiding raw confidence
- mobile copy
- lyrics bottom padding
- selected-line meaning loading
- QA scripts/docs

### SayWetin Config Caution

Do not assume `app.json` `extra.EXPO_PUBLIC_API_BASE_URL` is enough if code reads:

```ts
process.env.EXPO_PUBLIC_API_BASE_URL
```

Expo `EXPO_PUBLIC_*` values must be provided through `.env`, shell env, or EAS env for `process.env` inlining. `app.json` `extra` values require reading from `Constants.expoConfig.extra`.

Safer fix options:

1. Add `EXPO_PUBLIC_API_BASE_URL=https://api.saywetin.app` to EAS build env and `.env.example`.
2. Or add a config helper that resolves:
   - `process.env.EXPO_PUBLIC_API_BASE_URL`
   - `Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL`
   - safe public fallback `https://api.saywetin.app`

### SayWetin Play Store / EAS Deployment

Recent issue:

- EAS detected the root monorepo and ran `npm ci` at repo root.
- Root `package-lock.json` was stale.
- `npm ci` failed before Gradle.

Fix applied by dev:

- Regenerated root `package-lock.json`.
- Committed/pushed lockfile.
- Manually dispatched workflow because path filters did not trigger from root lockfile-only change.
- New GitHub Actions run reported:

```text
25203407824
```

Follow-up:

- Monitor install phase.
- If install passes, monitor Gradle.
- If Gradle passes, monitor EAS submit.
- Capture first real failing block only.

Security note:

- An Expo token was exposed in terminal/chat logs.
- Rotate/revoke it and update GitHub Actions secret.
- Do not print token values again.

### Bluetooth / Private Listening

Observation:

- User tested SayWetin with Bluetooth headphones in a quiet/private setting.
- SayWetin returned: "No music found in audio. Try playing the song louder or singing more clearly."
- Shazam failed in the same condition.

Interpretation:

- This is likely an audio-route limitation: the phone mic cannot hear audio routed privately through headphones.
- It is also a product opportunity.

Recommended product path:

- Improve failure copy:
  - "We couldn't hear the song clearly. If you're using headphones, play the song out loud, sing or hum the line, or type a lyric."
- Add/document Private Listening Mode:
  - type a lyric
  - sing/hum line
  - describe the vibe
  - paste/share lyrics if available
  - explain headphone limitation clearly

### SayWetin Next Validation

Do not accept reports that say files are both read and missing.

Required next proof:

1. Confirm package paths from repo root.
2. Confirm API config resolution path.
3. Confirm backend route/deploy truth or state "not provable from repo."
4. Confirm EAS/Android env is in build.
5. Confirm EAS run status after lockfile fix.
6. Run real device QA only after backend/API is live.

## Dispatch / OG

### Current Status

Dispatch/OG is HOLD.

Current blocker:

- Runtime env/token-flow production verification.
- Local server failed because `DATABASE_URL` is required.
- 403 is expected for unauthenticated requests, but unexpected if valid token/env is present.

Important doc:

```text
DOCS/DISPATCH_403_ACCESS_AUDIT.md
```

This doc is currently untracked or pending commit.

Key findings:

- Operator login calls `/api/operators/auth`.
- Operator token stored in localStorage as `dispatch_operator_session`.
- `operatorFetch()` attaches `x-dispatch-operator-token`.
- Admin token stored in sessionStorage.
- Required env includes:
  - `DATABASE_URL`
  - `DISPATCH_OPERATOR_SESSION_SECRET`
  - `DISPATCH_ADMIN_PROXY_KEY`
  - `PORT` optional/default

Do not mark Dispatch GO until production env and token flow are verified.

## Known Dirty / Unrelated Files

There may be unrelated modified/untracked files. Inspect before staging.

Known examples from recent status:

```text
APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx
APPS/saywetin-native/app.json
APPS/saywetin/.idea/workspace.xml
APPS/saywetin/ops/FULL_E2E_QA_REPORT.md
APPS/saywetin/ops/SAYWETIN_ANDROID_E2E_QA_SCRIPT.md
DOCS/GARDEN_PRODUCTION_ADMIN_LOGIN_VERIFICATION.md
supabase/.temp/cli-latest
APPS/saywetin/.idea/*
DOCS/DISPATCH_403_ACCESS_AUDIT.md
```

Do not stage IDE/temp files.

## Commit Discipline

Use one commit per logical lane.

Examples:

- Garden UI polish:
  - only Garden UI files
- SayWetin config/QA:
  - only SayWetin native/config/docs files
- Dispatch audit:
  - only `DOCS/DISPATCH_403_ACCESS_AUDIT.md`
- Telemetry:
  - only ops/docs/skills telemetry files

Before commit:

```powershell
git status --short
git diff --check -- <files>
git add -- <exact files>
git commit -m "<scoped message>"
git status --short
```

## Current Strategic Order

1. Finish Garden UI visual QA and commit if approved.
2. Monitor SayWetin Play Store/EAS run after root lockfile fix.
3. Rotate exposed Expo token and update GitHub Actions secret.
4. Fix/prove SayWetin API config and backend route truth.
5. Commit Dispatch 403 audit if still desired.
6. Continue Garden full operations portal planning only after client walkthrough/signoff.

## Current Plans By Lane

### Plan A - Garden Cleaners Client Handoff

Goal:

- Complete client walkthrough/signoff for the current operational MVP.

Current state:

- Website live.
- Quote flow live.
- Portal login live.
- Admin access verified.
- SMTP sender branding fixed.
- Client handoff docs exist.

Next steps:

1. Finish visual QA for latest header/portal UX polish.
2. Commit Garden UI polish if QA passes.
3. Send/finalize client walkthrough email.
4. Run walkthrough with client.
5. Capture client acceptance/signoff.
6. Record final acceptance in Garden docs and telemetry ledger.

Do not claim:

- "Full final operations system"
- "No more technical setup needed"
- "Security handoff complete"

Use:

- "First operational MVP"
- "Quote intake, portal access, admin visibility, and email branding are live"
- "Advanced scheduling, route planning, reporting, and deeper automation are next"

### Plan B - Garden Cleaners Full Operations Portal V1

Goal:

- Convert Garden from walkthrough-ready MVP into a true operations portal for admins, customers, and staff.

User vision:

- Public header always includes clear login/portal access.
- Admin can see customers, quotes, jobs, schedules, staff assignments, notes, priorities, and route planning.
- Customer can see next cleaning, last cleaning, property info, notes, service requests, and service history.
- Staff/cleaner can see assigned jobs only and update status/notes.
- Signup uses normal account creation with email/password, verification, forgot password, and reset flow.
- Magic link can remain as fallback, not the only path.

Likely scope:

1. Auth/signup/password verification flow.
2. Customer onboarding profile:
   - first name
   - last name
   - email
   - phone
   - service address
   - city/region
   - property type
   - optional rooms/square feet/notes
3. Customer dashboard.
4. Admin operations dashboard.
5. Staff dashboard.
6. Job scheduling and assignment workflow.
7. Notes/comments/service history.
8. Route planning filters by city/region/day/priority.
9. Notifications.
10. Security/RLS QA.

Estimate:

- Focused three-lane build: 4-7 calendar days for production V1 if no major blockers.
- Solo/interrupted/client-review-heavy path: 7-12 days.
- 48 hours is only enough for a credible slice, not the full polished operations system.

Do not start this full V1 until the current client walkthrough/signoff is either completed or intentionally paused.

### Plan C - Garden UI Reimagination / Copilot Spark

Goal:

- Use Copilot Spark for visual exploration, not blind production rewrite.

Spark should explore:

- brighter Garden Cleaners visual identity
- stronger hero image
- clear Portal Login CTA
- public site polish
- portal login first viewport
- admin/customer/staff dashboard concepts
- service-business feel, not generic SaaS

Production integration rule:

- Spark output must come back to Codex/CTO lane for design selection and repo-safe implementation.
- Do not let Spark overwrite production app code directly without review.

### Plan D - SayWetin Play Store / EAS Deployment

Goal:

- Get SayWetin native Android build/install/submit path working again.

Current state:

- EAS build failed earlier because root monorepo lockfile was stale and `npm ci` failed.
- Root `package-lock.json` was regenerated and pushed by dev.
- Manual workflow dispatch started:
  - GitHub Actions run `25203407824`

Next steps:

1. Monitor GitHub Actions run.
2. Confirm EAS install phase passes.
3. If install passes, monitor Gradle build.
4. If Gradle passes, monitor submit to Play Store.
5. If submit fails, capture exact Play Console/EAS submit error.
6. Rotate exposed Expo token and update GitHub Actions secret.

Do not paste Expo tokens or EAS credentials into logs/chat.

### Plan E - SayWetin Backend/API Recovery

Goal:

- Prove or fix the production API route/deploy path.

Current problem:

- `https://api.saywetin.app` returned 404 on tested routes.
- Backend route truth is not fully proven from current repo.

Next steps:

1. Search full repo for backend/deploy references.
2. Identify whether backend code exists in this repo or is external/private.
3. Confirm correct Railway service and custom domain mapping.
4. Confirm actual endpoint prefixes.
5. Update native API helper paths if route prefix differs.
6. Only mark API live after a real endpoint succeeds.

Do not assume:

- API is paused just because docs say paused.
- API route prefix is `/api/*` without proof.
- Backend is absent until full repo search is done.

### Plan F - SayWetin Android API Config

Goal:

- Ensure Android release builds actually know the production API base URL.

Risk:

- Code reads `process.env.EXPO_PUBLIC_API_BASE_URL`.
- `app.json extra` alone does not prove `process.env` inlining.

Next steps:

1. Add/verify `EXPO_PUBLIC_API_BASE_URL` in EAS build env and `.env.example`.
2. Optionally add shared config helper that checks:
   - `process.env.EXPO_PUBLIC_API_BASE_URL`
   - `Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL`
   - safe fallback `https://api.saywetin.app`
3. Verify built bundle includes the host.
4. Run physical device QA after backend is live.

### Plan G - SayWetin Private Listening Mode

Goal:

- Turn Bluetooth/private-listening recognition failure into a premium fallback flow.

Observed:

- SayWetin failed to detect song through Bluetooth headphones.
- Shazam also failed in same condition.
- Likely because phone mic cannot hear audio routed privately through headphones.

MVP fallback:

- Better failure copy:
  - "We couldn't hear the song clearly. If you're using headphones, play the song out loud, sing or hum the line, or type a lyric."
- Clear actions:
  - Type a lyric
  - Sing/hum line
  - Describe the vibe

Future mode:

- Private Listening Mode with typed lyric, hum/sing, vibe search, and explain-why UX.

Docs:

- `APPS/saywetin/ops/FULL_E2E_QA_REPORT.md`
- `APPS/saywetin/ops/SAYWETIN_ANDROID_E2E_QA_SCRIPT.md`
- proposed `APPS/saywetin/ops/SAYWETIN_PRIVATE_LISTENING_PLAN.md`

### Plan H - SayWetin Lyric Timing / Meaning UX

Goal:

- Ensure recognition result opens near the actual heard lyric, not the beginning of the song.

Committed foundation:

- `45239cbc2960a6391c5871ad84e6e65503844423`

Acceptance:

- No flash from lyric index 0.
- If synced timing exists, highlighted lyric should be within roughly +/- 3 seconds of calculated song position.
- If timing unavailable, show honest fallback.
- Meaning loading appears under selected lyric.
- Buttons do not cover lyrics.

Still required:

- Real device QA after backend/API is live.

### Plan I - Dispatch / OG Runtime Verification

Goal:

- Verify Dispatch access and 403 behavior in production.

Current state:

- Dispatch is HOLD.
- `DOCS/DISPATCH_403_ACCESS_AUDIT.md` exists/pending commit.
- Local server failed because `DATABASE_URL` is required.

Next steps:

1. Verify production env:
   - `DATABASE_URL`
   - `DISPATCH_OPERATOR_SESSION_SECRET`
   - `DISPATCH_ADMIN_PROXY_KEY`
2. Verify operator login issues token.
3. Verify protected requests include `x-dispatch-operator-token`.
4. Verify admin token/proxy flow.
5. Confirm 403 only happens when unauthenticated/invalid token.
6. Commit audit doc separately if approved.

### Plan J - FTC Delivery Telemetry

Goal:

- Keep project state, human follow-up effort, commits, blockers, QA, and handoff status captured.

Committed:

- `47435fb3 docs(ops): add FTC delivery telemetry system`

Every meaningful work session should update:

- `ops/delivery-ledger.jsonl`
- `ops/project-status.json`
- relevant project ledger/doc

Telemetry should capture:

- project
- lane
- task
- files changed
- tests run
- commit hash
- blockers
- manual review required
- human follow-ups
- handoff impact
- next action

Do not let project status live only in chat.

### Plan K - FTC Auth Standard

Goal:

- Use one reusable auth approach across client projects.

Committed:

- `90670cd3 feat(auth): add FTC auth foundation standard and helpers`

Standard includes:

- normalized email
- redirect helpers
- password reset/update
- current user
- admin-role helper
- RLS and server-side service role separation
- email/password as primary for production portals
- magic link optional/fallback

Use this standard for future Garden full portal work and other client portals.

### Plan L - Copilot / Agent Mode Workflow

Goal:

- Use premium agents without letting them drift.

Pattern:

1. Codex/CTO lane defines bounded task.
2. Copilot/agent executes only that task.
3. Agent reports:
   - files changed
   - commands run
   - pass/fail
   - blockers
4. Codex/CTO validates.
5. Commit only after validation.

Do not ask agent mode to "fix SayWetin" or "finish Garden."

Give it:

- exact workdir
- exact files/folders
- exact goal
- no-secret rule
- no-commit rule
- validation commands
- report format

## Do Not Do

- Do not reopen Garden SMTP unless a new email proves regression.
- Do not claim SayWetin production readiness before device QA.
- Do not assume `app.json extra` proves Expo `process.env` behavior.
- Do not run destructive git commands.
- Do not broad-stage all changes.
- Do not commit `.env`, `.idea`, `supabase/.temp`, or generated secrets.
- Do not paste tokens into terminal output or chat.

## If Unsure

Stop and report:

- what you inspected
- what you found
- what is uncertain
- exact next safe action

Do not fill gaps with guesses.
