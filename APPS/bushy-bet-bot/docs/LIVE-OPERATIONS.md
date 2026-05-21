# Live Operations

## Daily Posting Workflow

1. Run `/syncfixtures` to refresh upcoming fixtures.
2. Add picks with `/addpick ... fixture_id="..."`.
3. Post approved picks with `/postpick id="..."`.
4. Verify channel post branding and footer.

## Result Settlement Workflow

1. Scheduler attempts settlement on interval.
2. Admin can manually trigger `/settle`.
3. Validate updates via `/results` and `/stats`.

## Failed API Sync Handling

1. Check `/health`.
2. Re-run `/syncfixtures`.
3. If API down, wait and retry.
4. Never fabricate stats.

## Responsible Betting Rules

- 18+ only
- Bet responsibly
- No guaranteed wins
- Do not chase losses
- Use licensed platforms only

## Affiliate Link Checks

- Verify affiliate destination is licensed in target jurisdiction.
- Ensure links are active before posting.

## Admin Checklist

- Confirm admin identity with `/whoami`
- Log all critical admin actions
- Keep secrets out of messages and logs
