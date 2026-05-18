# FTC Project Ledger

A human-readable, cross-project delivery ledger for FTC/Una Labs. Use this template to track project status, commits, blockers, QA, human follow-up, and next actions for every major project.

Last refreshed: 2026-05-18

---

## Job Hunt OS / Job Reply Agent
- **Current status:** Active (Phase 2.5/4A intake PR open)
- **Last known commits:** 0bbdbfae on PR #124 (`feat(job-agent): normalize hunt job intake`)
- **Blockers:**
  - PR #124 is unstable because of external Cloudflare deployment checks, not local job-agent build/test failures
  - Apply Assist remains intentionally gated and not started
- **Tests/QA:** `npm run build` and `npm test` passed locally in `APPS/job-reply-agent`
- **Human follow-up notes:** Decide whether Cloudflare external checks should block a job-agent-only PR
- **Next action:** Merge PR #124 after reviewing Cloudflare deployment noise or rerun/bypass external checks by repo policy
- **Estimated remaining effort:** ~0.25d for merge/CI policy cleanup, then new Apply Assist scope

## Garden Cleaners
- **Current status:** GO (pending final owner/client acceptance and security signoff)
- **Last known commits:** 2f0c8e42, 316731c7, 114dce1a, a5956d09, 00bb262e, e05855d1
- **Blockers:**
  - Final owner/client acceptance pending
  - Security signoff pending (if required by handoff policy)
- **Tests/QA:** Portfolio E2E passing (Garden checks 4/4 on latest run), credentialed QA passed, admin login/dashboard verified, sender branding verified (FTC Client Portal)
- **Human follow-up notes:** Owner/client acceptance checkpoint and closeout confirmation
- **Next action:** Complete acceptance walk-through, record signoff, finalize handoff packet
- **Estimated remaining effort:** ~0.25d

## Una Labs
- **Current status:** GO (live health checks passing)
- **Last known commits:** (see repo)
- **Blockers:** None currently detected in public uptime checks
- **Tests/QA:** Portfolio E2E passing (Una Labs checks 5/5 on latest run)
- **Human follow-up notes:** Continue scheduled monitoring and keep status artifact current
- **Next action:** Keep automated portfolio checks on schedule and refresh dashboard artifacts
- **Estimated remaining effort:** 0d (ops monitoring only)

## SayWetin
- **Current status:** HOLD (API endpoints returning 404, Android/API env/device QA pending)
- **Last known commits:** 45239cbc2960a6391c5871ad84e6e65503844423
- **Blockers:**
  - API endpoints returning 404
  - Android/API env/device QA pending
- **Tests/QA:** Lyric timing UX patch verified, full E2E pending
- **Human follow-up notes:** Owner must resolve API/env issues
- **Next action:** Unblock API/env, run full E2E QA
- **Estimated remaining effort:** 1-2d (API/env unblock + E2E)

## Dispatch
- **Current status:** HOLD (DATABASE_URL/runtime env and token-flow production verification)
- **Last known commits:** (see repo)
- **Blockers:**
  - DATABASE_URL/runtime env and token-flow production verification
- **Tests/QA:** Partial QA, access issues remain
- **Human follow-up notes:** Owner must review access audit results
- **Next action:** Resolve env/token issues, complete QA
- **Estimated remaining effort:** 1d (access unblock + QA)

## OG Trades Academy
- **Current status:** HOLD (canonical URL unconfirmed, webhook delivery not configured, E2E coverage added)
- **Last known commits:** (see repo)
- **Blockers:**
  - `ogtradesacademy.com` live status unconfirmed — no HTTP probe run yet
  - `OG_TRADES_LEADS_WEBHOOK_URL` not set — leads return 200 but are not delivered
  - `OG_TRADES_CONFIRMATION_WEBHOOK_URL` not set — no user confirmation sent
  - Community URL destination (`tinyurl.com/ogtradesacademy`) unverified
- **Tests/QA:** E2E spec created (`tests/og-trades-public.spec.ts`); not run against live URL yet
- **Human follow-up notes:** CTO to confirm domain is live and provide webhook URLs before GO
- **Next action:** CTO confirms `ogtradesacademy.com` HTTP 200 + provides webhook URLs; then run `npm run smoke:prod` and enable in telemetry
- **Estimated remaining effort:** ~0.5d after CTO unblocks domain + webhooks

## FTC/Auth/Skills
- **Current status:** GO (foundation skill committed)
- **Last known commits:** 90670cd3, b03e69c4
- **Blockers:** None
- **Tests/QA:** Skill and helpers committed, typecheck/build passed
- **Human follow-up notes:** None
- **Next action:** None
- **Estimated remaining effort:** 0d
