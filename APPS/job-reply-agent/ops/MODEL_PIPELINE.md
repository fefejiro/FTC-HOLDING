# Model Pipeline Policy

## Goal

Use model specialization to reduce token cost while preserving quality and safety.

## Suggested Pipeline

1. Builder stage
- Model: cost-efficient coding model
- Responsibility: implement scoped ticket and tests
- Output: patch + assumptions + local test output

2. Validator stage
- Model: stronger reasoning model
- Responsibility: validate against acceptance checklist
- Output: pass/fail + required fixes

3. Approver stage
- Model: policy/release reviewer model
- Responsibility: verify safety, runbook impact, and deploy readiness
- Output: approve or block with reasons

## Mandatory Gates

1. Red-flag protections cannot regress.
2. Approval gating cannot regress.
3. Duplicate prevention cannot regress.
4. Daily report contract cannot regress.

## Cost Control Rules

1. Pass diffs and targeted files only.
2. Reuse shared assumptions doc.
3. Validate changed modules plus critical safety modules.
4. Use full-repo review only before production releases.
