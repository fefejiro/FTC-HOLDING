# Una Labs Status

Auto-generated operational snapshot for Una Labs. This file is refreshed by `scripts/update-unalabs-status.mjs` and can be committed by GitHub Actions.

## Latest Snapshot

<!-- AUTO:UNALABS_SNAPSHOT:START -->
- Generated at: 2026-05-20T09:54:31.563Z
- Site origin: https://unalabs.cloud
- Worker origin: https://una-stripe-api.fejiro-efiuvwere.workers.dev
- Smoke status: 4/14 checks passed
- Admin smoke mode: unauthenticated admin guard smoke only
- Phase 9 focus: AutoCollect automation and health observability are live; scheduled run verification and paid-invoice reconciliation are the close-out steps.
- Sprint source: FTC_MASTER.md
<!-- AUTO:UNALABS_SNAPSHOT:END -->

## Live Smoke Checks

<!-- AUTO:UNALABS_SMOKE:START -->
| Check | Result | Detail |
|-------|--------|--------|
| Homepage | FAIL | expected 200 got 404 |
| Start flow | FAIL | expected 200/308 got 404 |
| Summary page | FAIL | expected 200/308 got 404 |
| Confirmation page | FAIL | expected 200/308 got 404 |
| Status page (protected) | FAIL | expected 308 got 404 |
| Login route | FAIL | expected 200/308 got 200 |
| Portal page | FAIL | expected 200/308 got 200 |
| Proposal page | FAIL | expected 200/308 got 404 |
| Report page | FAIL | expected 200/308 got 404 |
| Admin page | FAIL | expected 200/308 got 404 |
| AutoCollect list auth guard | PASS | 401 |
| AutoCollect health auth guard | PASS | 401 |
| AutoCollect sync auth guard | PASS | 401 |
| AutoCollect invite auth guard | PASS | 401 |
<!-- AUTO:UNALABS_SMOKE:END -->

## Notes

- Manual note on 2026-04-21:
  - The live status-board security model changed after this auto snapshot.
  - `/status` now redirects to `/admin/status`.
  - `/api/public/status-summary` should no longer be treated as the live source of truth.
  - The protected worker summary path is `/api/admin/status-summary`.
- Public route smoke checks always run.
- Admin AutoCollect API checks run in unauthenticated mode by default and verify auth boundaries.
- If `UNALABS_SMOKE_BEARER_TOKEN` is set, the script also performs authenticated admin endpoint checks.
