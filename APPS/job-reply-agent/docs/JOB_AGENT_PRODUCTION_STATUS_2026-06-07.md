# Job Reply Agent Production Status - 2026-06-07

## Current State

The job agent is operating in proof-first mode. Dice, Indeed, and Monster discovery were run from the visible Fejiro Chrome profile. No job is counted as applied unless the platform proof boundary verifies it.

## Verified Today

- Visible Chrome profile selector now requires the Fejiro profile and rejects Mike/Michael profile windows.
- Dice auth preflight passes through the visible Fejiro browser.
- Gmail OAuth token is valid for `fejiro.efiuvwere@gmail.com`.
- Gmail cycle ran cleanly: processed `0`, drafted `0`, sent `0`, skipped `8` self-sent messages, errors `0`.
- Scheduled tasks are enabled and returning last result `0`.
- Build passes.
- Full test suite passes: `9 files / 70 tests`.

## Discovery And Packages

### Dice

- Fresh Dice visible scrape ran through Fejiro Chrome.
- Durable role-focused packages were generated for:
  - `917` - Robert Half - IT Director
  - `915` - Unknown - WMS Business Systems Analyst
  - `918` - Unknown - Business Systems Analyst & Automation Engineer
  - `903` - Unknown - ERP/CRM Consultant
- Job `917` became an apply candidate, then `hunt:apply-one` correctly paused because CDP is unavailable.
- No Dice submit was attempted from a wrong or automation-only profile.

### Indeed

- Fresh Indeed visible scrape ran through Fejiro Chrome.
- Indeed currently has two fresh missing-artifact rows, but artifact prep skipped them because no generated package row exists yet:
  - `924` - Premium Retail Services - Business Product Manager
  - `923` - Assumption Life - Project Manager
- Existing Indeed verified proof remains intact.
- No Indeed job was submitted in this run.

### Monster

- Added Monster visible scout as discover/rank/package only.
- Monster is not a submit adapter yet.
- Monster quality gates now:
  - hold noisy company parsing for manual review,
  - skip or suppress weak/non-target rows from artifact generation,
  - avoid treating tracking-param duplicates as clean evidence.
- Durable role-focused packages were generated for:
  - `1040` - Mindlance - IBP / Ariba / SAP Supply Chain Program Manager
  - `1052` - Tryfacta - Remote Tyler Munis Lead (ERP)
  - `1033` - Mindlance - IT Business Analyst
  - `1025` - Pyramid IT Consulting - Business Systems Analysts with Verisk
- All Monster rows remain paused/manual-review only until a Monster applied-history proof boundary is implemented.

## Current Blocker

Chrome CDP is unavailable on `127.0.0.1:9333`.

Because of that, Dice/Indeed submit automation must not launch another browser profile. The agent now pauses Dice apply attempts when auth is only available through the visible Fejiro fallback.

Safe next step to enable verified submissions:

1. Close all Chrome windows.
2. Start Fejiro Chrome with CDP:

```powershell
npm --prefix APPS/job-reply-agent run browser:attach-chrome
```

3. Confirm:

```powershell
npm --prefix APPS/job-reply-agent run auth:doctor
```

4. Only then retry:

```powershell
npm --prefix APPS/job-reply-agent run hunt:apply-one -- --job-id=917
```

## Latest Evidence Commands

```powershell
npm --prefix APPS/job-reply-agent run build
npm --prefix APPS/job-reply-agent test
npm --prefix APPS/job-reply-agent run gmail:status
npm --prefix APPS/job-reply-agent run run:gmail-cycle
npm --prefix APPS/job-reply-agent run auth:doctor
npm --prefix APPS/job-reply-agent run hunt:status
npm --prefix APPS/job-reply-agent run hunt:trust-report -- --limit=20
npm --prefix APPS/job-reply-agent run browser:fejiro-status
```

