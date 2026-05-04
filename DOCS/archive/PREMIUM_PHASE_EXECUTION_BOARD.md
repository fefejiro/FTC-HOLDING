# Premium Phase Execution Board

_Last updated: 2026-04-29_

## Task Map
- [ ] Finalize premium feature QA (Garden, SayWetin, PeacePad)
- [ ] Complete nav route contract fix for Garden
- [ ] Confirm all production env vars and secrets for premium features
- [ ] Update user-facing docs and support flows
- [ ] Run Playwright and manual smoke tests for all premium endpoints
- [ ] Prepare release notes and user comms
- [ ] Tag and archive pre-premium baseline
- [ ] Stage premium commits by group (see below)
- [ ] Deploy premium features to production (Cloudflare Pages, Supabase)
- [ ] Monitor post-release metrics and error logs

## Risk Map
- **Nav route contract mismatch:**
  - Impact: Broken navigation or user flows
  - Mitigation: Fix in progress, QA before release
- **Supabase migration drift:**
  - Impact: Data loss or failed persistence
  - Mitigation: Migration applied, QA checklist complete, rollback plan in place
- **Cloudflare Email Routing Rules (403):**
  - Impact: Missed admin/support emails
  - Mitigation: Manual dashboard setup or escalate for API permission
- **Uncommitted worktree changes:**
  - Impact: Accidental broad staging or merge conflicts
  - Mitigation: Use commit grouping plan, review each group before push
- **User-facing regression:**
  - Impact: Broken premium or legacy flows
  - Mitigation: Full Playwright/manual test pass, staged rollout, rollback checks

## Rollout Order
1. Merge and deploy nav route contract fix (Garden)
2. Deploy premium feature commits (Garden, SayWetin, PeacePad) in grouped order
3. Run post-deploy QA and smoke tests
4. Monitor metrics, error logs, and user feedback
5. If all clear, announce premium release

## Rollback Checks
- Confirm pre-premium baseline is tagged and archived
- Rollback plan for each premium feature (API, worker, env vars)
- Supabase: revert migration if needed, restore from backup
- Cloudflare Pages: redeploy previous commit if needed
- Email: revert to previous routing if new rule fails
- Document all rollback actions in release log

## Commit Grouping Plan (Premium Work)
- Group 1: Nav route contract fix (Garden)
- Group 2: Garden premium feature commits (API, worker, UI, docs)
- Group 3: SayWetin premium feature commits (API, UI, docs)
- Group 4: PeacePad premium feature commits (API, UI, docs)
- Group 5: Shared infra/config changes (Supabase, env vars, worker)
- Group 6: Docs, release notes, and support updates

> Do not stage or commit broad changes. Review each group for scope and intent before pushing.

## Final Premium Completion Checklist
- [x] Garden premium deployed, Supabase-persistent, QA proven
- [x] SayWetin premium deployed, QA proven
- [x] PeacePad premium deployed, QA proven
- [x] Nav route contract fix merged and verified (Garden)
- [x] All production env vars and secrets confirmed
- [x] User-facing docs and support flows updated
- [x] Playwright/manual smoke tests passed for all premium endpoints
- [x] Release notes and user comms prepared
- [x] Pre-premium baseline tagged and archived
- [x] Premium commits staged and merged by group
- [x] Post-release metrics and error logs monitored

## Release Notes
**What Changed:**
- Garden, SayWetin, and PeacePad premium features deployed to production
- Durable quote persistence for Garden via Supabase
- Navigation contract fix for Garden
- All user-facing docs and support flows updated

**What Was Verified:**
- All migrations applied and QA checklists completed
- Playwright/manual tests passed for all premium endpoints
- Production env vars and secrets confirmed
- Post-release monitoring and smoke tests completed

**What Remains Blocked:**
- Cloudflare Email Routing Rules API (403) for unalabs.cloud — forwarding rule for hello@unalabs.cloud must be set up manually or after permissions are granted

## Final Commit Grouping List (Keep/Undo Safe Merge)
- Group 1: Nav route contract fix (Garden)
- Group 2: Garden premium feature commits (API, worker, UI, docs)
- Group 3: SayWetin premium feature commits (API, UI, docs)
- Group 4: PeacePad premium feature commits (API, UI, docs)
- Group 5: Shared infra/config changes (Supabase, env vars, worker)
- Group 6: Docs, release notes, and support updates
- Group 7: Any unrelated or user/app changes (review and stage separately)

> Only stage/merge groups 1–6 for premium release. Group 7 should be kept out of the premium merge unless explicitly reviewed. Undo/rollback by group if needed.
