# ATEAM - Reusable Prompts

## Bug Fix Template

```
Context: ATEAM - AI agent OS - [FEATURE NAME]
Current behavior: [DESCRIBE BUG]
Expected behavior: [WHAT SHOULD HAPPEN]
Stack trace or error: [PASTE ERROR]
Files involved: [LIST FILES]
Constraints: Zero monthly burn. Must work on Cloudflare Pages free tier. Railway backend is paused.

Fix this bug. Provide:
1. Root cause analysis
2. Proposed fix (code)
3. Test case to prevent regression
```

## New Feature Template

```
Feature: [NAME]
User story: As [Manchi / an operator], I want to [ACTION] so that [BENEFIT]
Acceptance criteria:
- [ ] [CRITERION 1]
- [ ] [CRITERION 2]

Stack: Static HTML/CSS/JS frontend (Cloudflare Pages), Node.js backend (Railway, paused).
Constraint: Must work in browser-local demo mode when Railway is offline.

Provide plan, then implementation.
```

## Capability Extraction Template

```
I am extracting [CAPABILITY NAME] from the ATEAM monolith.
Current location: [FILE/MODULE]
Target: Standalone capability module under the contract envelope pattern.
Reference: Docs/CAPABILITY_CONTRACTS.md

Steps needed:
1. Define capability contract interface
2. Implement adapter
3. Write parity test
4. 24-hour soak gate before promotion

Proceed with step [N].
```

## Demo Fallback UX Template

```
Context: ATEAM public surface running in browser-local demo fallback mode (Railway backend paused).
Current UX: [DESCRIBE WHAT USER SEES]
Expected UX: Clear, polished demo experience. No error states. Optional "go live" prompt.
Files: Public/app.js, Public/index.html

Implement the UX improvement. No new dependencies.
```
