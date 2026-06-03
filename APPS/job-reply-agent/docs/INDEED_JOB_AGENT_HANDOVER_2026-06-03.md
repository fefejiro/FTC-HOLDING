# Indeed Job Agent Handover - 2026-06-03

## Current Status

The job agent is operational for Gmail intake/replies, trusted artifact generation, and proof-backed Indeed Easy Apply workflows. The remaining live limitation is human-gated final submit on Indeed SmartApply. The system must not bypass reCAPTCHA, hCAPTCHA, Authenticator, or other human checks.

Verified applications today:

| Company | Role | Status | Submit Type |
| --- | --- | --- | --- |
| Entergrade Solutions | Project Manager | submitted_verified | agent verified |
| Moveware | Business Analyst | submitted_verified | agent verified |
| PACE - Partners in Achieving Change Excellence | Operations Director | submitted_verified | human-assisted final gate/submit |
| Recutify Inc. | Integration Program Manager | submitted_verified | agent verified |

Current live paused application:

| Company | Role | Status | Reason |
| --- | --- | --- | --- |
| Dacaro Software Services Inc | Program Manager ServiceNow | manual_open_pause / paused | Tailored resume and cover letter are verified on final Indeed review, but Google reCAPTCHA human gate is required before submit. |

## Proof Boundary

Do not count a job as applied unless the platform history proves it.

For Indeed:

- Verify at `https://myjobs.indeed.com/applied`.
- Count as `submitted_verified` only when the Applied tab contains the role/company.
- If the user solves a human gate or clicks final submit, record it as human-assisted.
- If submit is clicked but Applied history does not prove it, keep `submitted_unverified` or `paused`.

For Dice:

- Verify at `https://www.dice.com/my-jobs?type=applied`.
- Use the existing Dice verification skill and command.

## Dacaro Recovery Steps

The visible Indeed window is at the final Dacaro SmartApply review gate.

1. User completes `I'm not a robot`.
2. Submit the application if Indeed enables `Submit your application`.
3. Run:

```powershell
$env:JOB_AGENT_CDP_URL="http://127.0.0.1:9333"
$env:JOB_AGENT_REQUIRE_CDP="true"
npm run hunt:verify-indeed-applied -- --job-id=579
```

4. Confirm with:

```powershell
npm run hunt:trust-report -- --limit=10
```

Expected result after proof:

- Dacaro becomes `submitted_verified`.
- Screenshot is written under `.local/indeed-proof`.
- Trust report shows Dacaro as verified with trusted resume and cover artifacts.

If the verifier says the role is not found, do not count Dacaro as applied.

## No-Babysitting Operating Model

The automated cycle should keep moving without blind submissions:

1. Gmail:
   - Run scheduled Gmail cycle every 30 minutes.
   - Only send approved/safe drafts.
   - Keep self-sent messages skipped.

2. Job sourcing/scoring:
   - Keep scheduled lightweight runs active.
   - Prioritize tier 1 and tier 2 roles aligned to IT Manager, Service Delivery, Program Manager, ERP, WMS, POS, QA, Retail Systems, Business Systems, Enterprise Systems, ServiceNow, and integration/platform delivery.

3. Indeed Easy Apply:
   - Use prepare-only first.
   - Verify resume and cover are job-specific before submit.
   - Pause at human gates.
   - Verify from My Jobs Applied after submit.

4. External apply:
   - Do not submit blindly on external ATS.
   - Record as blocked or review_external_high_fit unless a verified flow exists.

## Commands

Health:

```powershell
npm run gmail:status
npm run schedule:status
npm run hunt:trust-report -- --limit=20
```

Manual Gmail cycle:

```powershell
npm run run:gmail-cycle
```

Indeed queue:

```powershell
npm run hunt:premium-queue -- --source=indeed --limit=25
```

Prepare a single Indeed package without browser navigation:

```powershell
npm run hunt:indeed-visible-assist -- --job-id=<job_id> --prepare-only
```

Verify Indeed Applied history:

```powershell
npm run hunt:verify-indeed-applied -- --job-id=<job_id>
```

Verify Dice Applied history:

```powershell
npm run hunt:verify-dice-applied -- --job-id=<job_id>
```

Build/test:

```powershell
npm run build
npm test
```

## Artifacts and Skill

New local Codex skill:

```text
C:\Users\mikef\.codex\skills\indeed-application-verification\SKILL.md
```

Use it for future Indeed Easy Apply, SmartApply, human-gate, resume/cover upload, and Applied-history proof work.

Key Dacaro artifacts:

```text
C:\FTC HOLDING\DOCS\Fejiro_Job_Reply_Agent_Resume_Bank\resumes\Fejiro_Efiuvwere_Program_Manager_Servicenow_Dacaro_Software_Services_Inc_Resume.docx
C:\FTC HOLDING\DOCS\Fejiro_Job_Reply_Agent_Resume_Bank\resumes\Fejiro_Efiuvwere_Program_Manager_Servicenow_Dacaro_Software_Services_Inc_Resume_Cover_Letter.docx
C:\FTC HOLDING\APPS\job-reply-agent\.local\visible-indeed-assist\dacaro-submit-gate.png
```

## Current Validation Evidence

Last verified local checks:

- `npm run build` passed.
- `npm test` passed: 9 files / 53 tests.
- `npm run hunt:verify-indeed-applied -- --job-id=579` safely refused to verify without `JOB_AGENT_CDP_URL`, proving it will not silently open/use the wrong browser profile.
- `npm run gmail:status` passed for `fejiro.efiuvwere@gmail.com`.
- `npm run run:gmail-cycle` completed with 0 errors and no new sends.
- `npm run schedule:status` showed all three scheduled tasks with last result `0`.

## Important Lessons Learned

- Indeed can keep stale resume/cover state from the previous application. Always inspect final review before submit.
- File picker state may be inside the Chrome window, not a separate `Open` dialog.
- `prepare-only` is safer than DOM-dump navigation on live application pages.
- The agent must not claim an application went through until Applied history proves it.
- Human-assisted application is acceptable, but the ledger must say human-assisted.
