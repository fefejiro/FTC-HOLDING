---
name: ftc-live-qa
description: Use when running live production QA, rerunning Playwright/manual E2E checks, validating public pages, portals, auth, quote forms, API health, mobile flows, or producing a pass/fail QA report for an FTC project.
---

# FTC Live QA

Use this skill to make QA evidence boring in the best way: repeatable, scoped, and hard to misunderstand.

## Inputs

- Project/app name
- Live base URL or local URL
- Test files or manual test script
- Required non-secret env var names
- User roles to test
- Known blockers or risky areas

## Workflow

1. Confirm environment:
   - current directory
   - git status
   - base URL
   - required env var presence, without printing values
2. Run the smallest relevant automated test first.
3. If automation is blocked, create or follow a manual QA script.
4. Capture exact evidence:
   - command
   - date/time
   - pass/fail count
   - failing test name
   - first error only
   - whether failure is app, test drift, env, or access
5. Update the canonical QA doc.
6. Classify readiness:
   - `GO`: core tested flows pass.
   - `HOLD`: known blocker prevents full verification.
   - `NO-GO`: core user flow fails or security is unsafe.

## Required QA Areas

- Public entry pages
- Primary conversion/action path
- Auth/login/session where applicable
- Role visibility and access control
- API/health endpoint where applicable
- Mobile viewport or real device where applicable
- Error/empty/loading states for core workflows

## Common Failure Modes

- Relative Playwright URLs run without a base URL.
- Tests pass locally but target the wrong deployment.
- "No tests found" is reported as success.
- 404 at `/` is mistaken for an offline API.
- Credentialed tests are marked passed without actual credentials.
- Screenshots are captured but not tied to test steps.

## Output

- QA status: GO/HOLD/NO-GO
- Tests or manual steps run
- Pass/fail count
- Exact blockers
- Files changed
- Commit recommendation
