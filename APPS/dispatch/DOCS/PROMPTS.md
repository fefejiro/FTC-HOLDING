# Dispatch - Reusable Prompts

## Bug Fix Template

```
Context: Dispatch (Ottawa roadside assistance) - [FEATURE NAME]
Current behavior: [DESCRIBE BUG]
Expected behavior: [WHAT SHOULD HAPPEN]
Stack trace or error: [PASTE ERROR]
Files involved: [LIST FILES]
Constraints: Must work on Railway Hobby + Cloudflare Pages. No new paid services.

Fix this bug. Provide:
1. Root cause analysis
2. Proposed fix (code)
3. Test case to prevent regression
```

## New Feature Template

```
Feature: [NAME]
User story: As a [stranded driver / operator / admin], I want to [ACTION] so that [BENEFIT]
Acceptance criteria:
- [ ] [CRITERION 1]
- [ ] [CRITERION 2]

Stack: React + Vite frontend, Node.js + Express backend, Supabase, SSE for real-time.
Constraint: Zero new paid services. Must deploy via Railway + Cloudflare Pages.

Provide implementation plan, then code.
```

## Playwright Test Template

```
I need a Playwright E2E test for: [FEATURE / FLOW]
Base URL: https://dispatch.unalabs.cloud
Test should:
1. [STEP 1]
2. [STEP 2]
3. Assert: [EXPECTED OUTCOME]

Write the test in TypeScript, matching the style in playwright.config.ts.
```

## Operator UX Hardening Template

```
Context: Dispatch operator console at /operator.
The incident source [SOURCE NAME] is in [degraded / rate_limited / cooldown] state.
Current UX: [DESCRIBE WHAT OPERATOR SEES]
Expected UX: Clear visual indicator, no blank state, actionable message.

Files involved: client/src/ (operator components)
Constraint: No new dependencies.

Implement the UX fix.
```
