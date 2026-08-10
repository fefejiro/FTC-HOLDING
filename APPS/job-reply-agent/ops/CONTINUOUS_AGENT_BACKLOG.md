# Continuous Product Agent Backlog

This queue is only for bounded, unattended JobAgent product engineering. Each
scheduled run may complete at most one unchecked item, run focused verification,
record evidence below the item, and commit its own changes.

## Safe Autonomous Queue

- [x] Establish one shared-product iOS and Android foundation with exact-origin
  app links and system-browser OAuth return handling.
  - Evidence (2026-08-10): Capacitor 8 generated both native projects; focused
    mobile/PWA tests, full tests, build, lint, and sync passed. Android doctor
    passed, Android API 36 `assembleDebug` passed, and `apksigner` verified one
    v2 signer. The combined doctor reports missing Xcode on Windows; iOS source
    synchronized, while Xcode/device/store verification remains manual.
- [x] Add focused release-gate coverage proving scheduler and connector status
  surfaces distinguish `blocked_auth`, `manual_only`, `pilot_only`, and
  `certified_live` without exposing credentials or candidate message content.
  - Evidence (2026-08-06): added allow-listed connector and scheduler status
    projections plus focused coverage for all four gates; 11 relevant Vitest
    checks, targeted strict TypeScript checking, JavaScript syntax checking, and
    the static production release check passed in the isolated worktree. The
    dependency-complete release checkout independently passed the focused tests,
    full TypeScript build, and lint after integration review.
- [ ] Add responsive Playwright coverage for match explanations, ATS gap reports,
  application timelines, interview preparation, and approval flows at one mobile
  and one desktop viewport; keep unavailable live-service checks clearly separate.
- [ ] Audit queue idempotency, lease recovery, and dead-letter operator visibility;
  implement the smallest missing test-backed product increment without changing
  live worker schedules or production configuration.
- [ ] Reconcile the product architecture, runbook, and public-beta status from
  current test evidence, removing stale claims and listing external/manual release
  gates separately from implemented code.

## Manual Or Live Gates

The unattended agent must never select these. They require an operator session:

- Hosted Gmail OAuth reconnection and Google verification.
- Fejiro or Chukwuma live recruiter replies and job applications.
- Production deployment, DNS, secrets, provider, billing, or legal changes.
- CAPTCHA, authentication, MFA, consent, identity, or browser-profile gates.
- Public invitation expansion and the 14-day second-tenant pilot decision.

## Run Evidence

Runtime logs and the append-only run ledger live under
`<StateRoot>/.local/continuous-agent/` and are intentionally excluded from git.
