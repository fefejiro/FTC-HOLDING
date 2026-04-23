# Una Labs Status

Auto-generated operational snapshot for Una Labs. This file is refreshed by `scripts/update-unalabs-status.mjs` and can be committed by GitHub Actions.

## Latest Snapshot

<!-- AUTO:UNALABS_SNAPSHOT:START -->
- Generated at: 2026-04-23T14:11:44.468Z
- Site origin: https://unalabs.cloud
- Worker origin: https://una-stripe-api.fejiro-efiuvwere.workers.dev
- Smoke status: 14/14 checks passed
- Admin smoke mode: unauthenticated admin guard smoke only
- Phase 9 focus: AutoCollect automation and health observability are live; scheduled run verification and paid-invoice reconciliation are the close-out steps.
- Sprint source: FTC_MASTER.md
<!-- AUTO:UNALABS_SNAPSHOT:END -->

## Live Smoke Checks

<!-- AUTO:UNALABS_SMOKE:START -->
| Check | Result | Detail |
|-------|--------|--------|
| Homepage | PASS | 200 |
| Start flow | PASS | 308 \| /start/ |
| Summary page | PASS | 308 \| /start/summary/ |
| Confirmation page | PASS | 308 \| /confirmation/ |
| Status page (protected) | PASS | 308 \| /status/ |
| Realtor route | PASS | 308 \| /realtor/ |
| Portal page | PASS | 308 \| /portal/ |
| Proposal page | PASS | 308 \| /dashboard/proposal/ |
| Report page | PASS | 308 \| /dashboard/report/ |
| Admin page | PASS | 308 \| /admin/ |
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
