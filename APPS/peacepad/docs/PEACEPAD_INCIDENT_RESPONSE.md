# PeacePad Incident Response

Last updated: 2026-07-23

## Severity

| Severity | Definition | Action |
| --- | --- | --- |
| SEV-0 | Data exposure, broken auth, unsafe public release | Stop release/change immediately |
| SEV-1 | App Review blocker or launch crash | Fix before resubmission |
| SEV-2 | Major feature unavailable | Document workaround and patch |
| SEV-3 | Non-critical UX/content issue | Backlog |

## Release-review incident flow

1. Capture exact Apple message or user report.
2. Verify in the submitted build if possible.
3. Decide whether issue is metadata-only or binary.
4. If metadata-only, correct narrowly.
5. If binary, get founder approval before removing from review or uploading a new build.
6. Record the fix and evidence.

## Communication rule

Use calm, factual language. Avoid blame, speculation, and broad promises.

