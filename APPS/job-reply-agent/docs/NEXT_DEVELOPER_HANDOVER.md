# JobAgent Next Developer Handover

## Start Here

- Repository: `fefejiro/FTC-HOLDING`
- Branch: `agent/job-agent-continuous`
- Draft PR: `https://github.com/fefejiro/FTC-HOLDING/pull/192`
- Clean worktree: `D:\FTC-HOLDING-worktrees\job-agent-continuous`
- Product root: `D:\FTC-HOLDING-worktrees\job-agent-continuous\APPS\job-reply-agent`
- Operational state root: `C:\FTC HOLDING\APPS\job-reply-agent`
- Hosted product: `https://jobagent.unalabs.cloud`
- Native application ID: `cloud.unalabs.jobagent`

Do not develop from the shared `C:\FTC HOLDING` checkout. It contains other
active product work. Do not copy OAuth tokens, browser profiles, generated
resumes, databases, or candidate evidence into this engineering worktree.

## First Ten Minutes

```powershell
Set-Location "D:\FTC-HOLDING-worktrees\job-agent-continuous"
git status -sb
git pull --ff-only
Set-Location "APPS\job-reply-agent"
npm ci --workspaces=false
npm test --workspaces=false
npm run build
npm run lint
npm run production:check
```

Expected application test baseline at handover: `28` files passed, `1` skipped;
`210` tests passed and `8` skipped. The static production check passes with the
expected warning that deployment-only checks were not run locally.

Because the C drive is nearly full, use D for Android caches and temporary files:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME = "D:\.gradle-jobagent"
$env:TEMP = "D:\.tmp-jobagent"
$env:TMP = "D:\.tmp-jobagent"
Set-Location "android"
.\gradlew.bat --no-daemon assembleDebug
```

## What Is Implemented

- Multi-tenant web SaaS and installable responsive PWA.
- Auth, invitations, consent, Career Truth Bank, resume vault, preferences,
  recommendations, approvals, application history, proof, account controls,
  queues, private storage, and trusted-runner contracts.
- AIApply-inspired explainable matching, ATS-gap, timeline, interview-prep, and
  outcome surfaces, with truthful provenance and manual gates preserved.
- Capacitor 8 Android and iOS source projects using the same hosted product.
- System-browser OAuth handoff and exact-origin Android/iOS return links.
- Four project Codex agents under `.codex/agents`.

The Android debug APK builds and verifies. iOS source generation and sync pass
on Windows, but no iOS build, simulator, device, TestFlight, or App Store proof
exists yet.

## Codex Agents

Reload the FTC workspace or start a new Codex session after checking out the
branch. The project-scoped agents are:

- `jobagent_product_builder`
- `jobagent_mobile_publisher`
- `jobagent_connector_operator`
- `jobagent_trust_release_auditor`

Select one owner per increment. Do not run product-builder and mobile-publisher
edits against the same files concurrently. The release auditor is read-only.

## Current CI And PR State

PR #192 is draft and was mergeable at the last check. The immutable-image job
passes. The first standalone-and-security run failed because unquoted Bash globs
expanded into `node_modules` paths. After quoting them, clean install, audit,
static checks, compile/lint, and all tests passed. The strict configuration step
then exposed a stale CI fixture missing the required backup URL and encryption
key; the handover update supplies synthetic values. The final secret scan also
identified a false
positive where a historical Cloudflare deployment UUID followed `API routes.
Version:`. The evidence wording now identifies it as a deployment UUID without
removing the proof. Run `31434235006` passed the complete JobAgent
standalone-and-security and immutable-image jobs after these corrections.

Unrelated Garden Portal workflows also ran on the monorepo PR and failed. Keep
their status separate from JobAgent release evidence unless a repository-level
required check makes them an actual merge blocker.

## Open Release Gates

1. Add responsive Playwright coverage at mobile and desktop viewports.
2. Publish Android Digital Asset Links and Apple App Site Association files,
   then prove OAuth return on physical Android and iOS devices.
3. Replace generated native icons and splash artwork.
4. Configure signing outside git and complete Play internal testing/TestFlight.
5. Complete store privacy declarations, screenshots, accessibility review, and
   review submissions.
6. Complete fresh Fejiro connector proof runs and the 14-day isolated Chukwuma
   pilot before broader invitations.
7. Audit queue lease recovery and dead-letter operator visibility.

## Safety Boundaries

- Never answer unknown application questions affirmatively to continue.
- CAPTCHA, authentication, MFA, identity, legal, demographic, sensitive, and
  contradictory questions are manual gates.
- Count recruiter email as sent only with Gmail Sent evidence.
- Count an application as verified only with confirmation or applied-history
  evidence.
- Mobile clients never contain Gmail secrets, job-board cookies, signing keys,
  or autonomous browser workers.
- Do not claim production, device, TestFlight, Play, or store readiness from a
  successful local build alone.

## Required End Of Run

Update `ops/CONTINUOUS_AGENT_HANDOVER.md`, run checks proportional to the change,
commit only scoped files, push the branch, and update PR #192. Record completed,
deployed, verified, paused, and blocked states separately.
