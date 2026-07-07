# GitHub Actions Runner Incident - 2026-07-06

## Current Status

- Product uptime is green as of the latest FTC health audit.
- GitHub Actions are enabled for `fefejiro/FTC-HOLDING` and `fefejiro/fefejiro`.
- Scheduled and manual workflow runs still fail before any workflow step executes.

## Evidence

- Manual test run: `anion-scheduled-deploy`, workflow dispatch at `2026-07-07T02:30:14Z`.
- Run URL: `https://github.com/fefejiro/FTC-HOLDING/actions/runs/28837270200`.
- Job: `Deploy Anion to Cloudflare Workers`.
- Job result: `failure`.
- Job steps: empty.
- Runner fields: `runner_id=0`, `runner_name=""`, labels include `ubuntu-latest`.
- No failed-step logs are available because checkout/setup never started.

The same zero-step, `runner_id=0` pattern appears on:

- `fefejiro/FTC-HOLDING` `anion-scheduled-deploy`
- `fefejiro/FTC-HOLDING` `ftc-site Deploy`
- `fefejiro/FTC-HOLDING` `Una Labs Status Sync`
- `fefejiro/fefejiro` `Generate Contribution Snake`

## Likely Cause

This points to GitHub hosted runner allocation or account entitlement/billing, not repo YAML or application code. It also matches the inbox notice that the GitHub Enterprise trial ended.

## Operator Action

1. Open GitHub account/organization billing and Actions settings.
2. Restore hosted runner entitlement/minutes for the affected account or move the repos out of the ended Enterprise context.
3. Re-run `anion-scheduled-deploy` manually.
4. Confirm the job shows real steps beginning with checkout and a non-zero runner assignment.

## Product Bypass

Until GitHub hosted runners are restored, use direct local/CLI checks and deploys:

- `npm run health:audit -- --no-fail`
- `powershell -ExecutionPolicy Bypass -File scripts\verify-peacepad-prod.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts\verify-saywetin-prod.ps1`
- `npx wrangler whoami`
- Railway CLI checks from the relevant app folder.
