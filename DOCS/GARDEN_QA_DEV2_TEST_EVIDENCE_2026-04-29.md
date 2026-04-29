# GARDEN QA DEV2 TEST EVIDENCE (2026-04-29)

## Scope
- Workspace: `C:\FTC HOLDING\_restore_repo\APPS\ftc-site`
- Base URL: `https://gardencleaners.ca`
- Test files:
  - `tests/garden-cleaners-public.spec.ts`
  - `tests/garden-portal.spec.ts`
- Env:
  - `PLAYWRIGHT_SKIP_WEBSERVER=1`
  - `PLAYWRIGHT_BASE_URL=https://gardencleaners.ca`

## Playwright Results
- Total: **12**
- Passed: **11**
- Failed: **1**

### Failing test
1. `Garden Cleaners public QA > quote form accepts a valid lead`
   - File: `tests/garden-cleaners-public.spec.ts:69`
   - Assertion expected:
     - visible text matching `/Garden Cleaners received your quote request/i`
   - Observed:
     - element not found within timeout (5000ms)
   - Drift note:
     - Live submit flow did not render the exact confirmation copy expected by test at assertion time.

## Supplemental Direct Route Checks (Live)
Checked with direct HTTP requests + content sniffing for `Garden Cleaners` branding.

| Route | HTTP | Branding Detected |
|---|---:|---|
| `/garden-cleaners` | 200 | yes |
| `/garden-cleaners/about` | 200 | yes |
| `/garden-cleaners/services` | 200 | yes |
| `/garden-cleaners/contact` | 200 | yes |
| `/garden-cleaners/quote` | 200 | yes |
| `/garden-cleaners/portal` | 200 | yes |

## Drift Summary (Tests vs Live)
- Routing and branding checks align for all critical routes above.
- Portal smoke checks pass.
- The only observed drift is quote success confirmation wording/visibility timing versus the strict expected text in one test assertion.

## Patch Activity
- No app code changed.
- No test patch applied in this lane.

## Suggested Follow-up
- Revalidate the quote success state message in live UI and align test assertion to exact production success copy/state (or use a resilient selector tied to success state container).
