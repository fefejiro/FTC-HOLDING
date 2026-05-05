---
name: ftc-client-handoff
description: Use when preparing a client walkthrough, MVP acceptance, production handoff, signoff package, screenshot guide, client email, or post-delivery support plan for any FTC/Una Labs client project.
---

# FTC Client Handoff

Use this skill when a project is close to client review or delivery. The goal is to prevent "looks done" from pretending to be "ready to hand over."

## Inputs

- Project name and live URL
- Client/admin emails, without passwords
- Current GO/HOLD/NO-GO status
- QA evidence and known blockers
- Screenshot or screen-recording evidence if available
- Docs already created for the project

## Workflow

1. Confirm the current readiness gate:
   - `GO`: client can use it for the stated scope.
   - `HOLD`: walkthrough or internal testing only.
   - `NO-GO`: do not present as ready.
2. Create or update the handoff package:
   - executive summary
   - login/access instructions
   - admin quick start
   - FAQ and troubleshooting
   - support and escalation
   - known limitations
   - next phase items
   - acceptance/signoff section
3. Create a screenshot checklist:
   - public homepage or app entry
   - login/access screen
   - auth email or invite, if applicable
   - authenticated dashboard or core workflow
   - key success state
4. Check client-facing language:
   - Say "first operational MVP" when scope is MVP.
   - Say what is live, what is next, and what is blocked.
   - Do not claim "full final system" unless support, security, QA, and handoff are complete.
5. Commit only scoped handoff docs.

## Required Acceptance Checks

- No secrets, passwords, tokens, or private keys in docs.
- No QA/test account is presented as a production client account.
- Login/reset/invite process is described without sharing a password.
- Known limitations are written plainly.
- Final GO/NO-GO status is honest.

## Common Failure Modes

- Client email is sent before auth branding is ready.
- Screenshot proof is referenced but not captured.
- "Done" is claimed while security gate is still open.
- Docs exist in both app and root folders with conflicting status.
- The handoff package hides limitations instead of framing them.

## Output

- Files changed
- Screenshot checklist status
- Client walkthrough status
- Full handoff status
- Remaining blockers
- Recommended commit message
