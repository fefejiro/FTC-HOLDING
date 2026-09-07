# Job Reply Agent Handover - 2026-07-13

## Purpose

This handover is for the next developer/operator continuing Fejiro's job-application workflow, especially LinkedIn Easy Apply, recruiter email replies, resume tailoring, proof capture, and scheduler health.

Work in:

```text
C:\FTC HOLDING\APPS\job-reply-agent
```

Do not mix this with Una Labs social posting work. Una Labs is a separate product/workflow.

## Current Verified State

Checked on 2026-07-13 around 2:08 PM Eastern:

```powershell
npm run build
npm test
npm run hunt:status
npm run schedule:status
npm run browser:fejiro-status
npm run gmail:status
```

Results:

- Build: passes.
- Tests: pass, `9 files / 88 tests`.
- Visible Chrome profile: Fejiro.
- Current visible browser title during check: `Feed | LinkedIn - Google Chrome`.
- Gmail status: currently blocked, OAuth token invalid/revoked for `fejiro.efiuvwere@gmail.com`.
- Scheduler: tasks exist, but `JobReplyAgent-Gmail` last result was `1` because Gmail auth is invalid.
- Latest hunt status:
  - `applied_verified`: 74
  - `submitted_verified`: 8
  - `submitted_unverified`: 0
  - `needs_review`: 20
  - `auto_apply_ready`: 38
  - `auto_apply_paused`: 448
  - `outreach_drafts_waiting`: 1744

Latest LinkedIn rows in status were `applied_verified`, including:

- `1642` - Senior Business Analyst - Quantum World Technologies Inc. - score 86
- `1641` - Business System Analyst - Amazon Connect - Areti Group | B Corp - score 82
- `1640` - Senior Business System Analyst - Hays - score 94
- `1638` - Technical Business Analyst - Raise - score 90
- `1637` - Business System Analyst - Insight Global - score 92

## Immediate Next Agenda

The user wants to continue applying on LinkedIn.

Recommended next mode:

```text
LinkedIn Easy Apply, Business Analyst / Business Systems Analyst first.
Then IT Manager / IT Business Systems Manager roles when the IT Manager resume is the better fit.
```

Focus first on:

- Business Analyst
- Business Systems Analyst
- Senior Business Analyst
- Technical Business Analyst
- Functional Analyst
- UAT / QA-heavy Business Analyst
- ERP / WMS / POS / retail systems analyst
- IT Manager
- IT Business Systems Manager
- Information Technology Lead
- Enterprise Applications Manager
- Retail Systems Manager
- Service Delivery Manager

Prefer:

- Canada remote
- Toronto/GTA/Ontario hybrid
- Easy Apply
- posted recently
- strong fit, likely interview chance

## Non-Negotiable Proof Rules

No proof, no count.

An application is not `applied_verified` until there is visible proof:

- LinkedIn confirmation page or visible submitted state.
- Correct role/company visible.
- Correct resume selected or uploaded.
- Required questions answered.
- No CAPTCHA/human-verification bypass.
- Screenshot/proof stored or ledger/status updated.

Keep status language honest:

```text
applied_verified
submitted_verified
submitted_unverified
manual_open_pause
paused
blocked
review_missing_artifact
```

Do not call a saved draft or opened form an application.

## LinkedIn Easy Apply Answer Rules

Use Fejiro's confirmed answer profile.

Core answers:

| Topic | Answer |
| --- | --- |
| Legally authorized to work in Canada | Yes |
| Canadian citizen / citizen status | Canadian citizen |
| Require sponsorship | No |
| Bachelor's degree completed | Yes |
| Comfortable hybrid for Toronto/GTA roles | Yes |
| SQL / database / business analysis years | 15 |
| Jira / Azure DevOps years | 8 |
| SAP ERP years | 9 |
| Insurance years | 4 |
| PMP certification | No |
| Maximo years | 8-15 when EWMS / asset / work-order / business-systems aligned |

Important user rule:

```text
If in doubt on years, do not put 0.
Use 15 for broad strong skills, 12 for solid adjacent skills, and 8 for narrower adjacent exposure.
Use No only for unsupported certifications or clearly unrelated specialist credentials.
```

Do not leave LinkedIn applications in draft when a reasonable numeric answer can complete the form.

Pause instead of submitting if LinkedIn requires:

- full street address
- postal code
- CAPTCHA / authenticator / human verification
- a required answer that cannot be truthfully inferred

## Resume Defaults

Use human-readable filenames. Do not use underscore-heavy filenames.

Good examples:

```text
Business Systems Analyst - Fejiro Efiuvwere.docx
Senior Business Analyst - Fejiro Efiuvwere - Company Resume.docx
IT Business Systems Manager Fejiro Efiuvwere.docx
Information Technology Lead - Fejiro Efiuvwere - Company Resume.docx
```

Bad examples:

```text
Fejiro_Efiuvwere_Business_Analyst_Generic_Resume.docx
Fejiro_Efiuvwere_Automation_Business_Consultant_Rpa_Ai_Projects_Resume.docx
```

### Business Analyst Gold Standard

Default BA / BSA resume:

```text
C:\FTC HOLDING\DOCS\Fejiro_Job_Reply_Agent_Resume_Bank\resumes\Business Systems Analyst - Fejiro Efiuvwere Golden Template.docx
```

This is the internal gold visual and content standard:

- two-column orange-format family
- left column has section labels only
- right column has content only
- clean alignment
- no abstract tailoring notes
- no generated/process language
- generated candidate-facing filenames must stay human-readable and must not include "Golden Template"

### IT Manager Standard

Use:

```text
C:\FTC HOLDING\DOCS\Fejiro_Job_Reply_Agent_Resume_Bank\resumes\IT Business Systems Manager Fejiro Efiuvwere.docx
```

or the current IT Manager master in the same resume bank.

Important:

- The IT Manager resume should follow the BA orange-format visual style.
- Do not put `Orange Standard` in the filename or visible document title.
- Use normal role naming: IT Manager, IT Business Systems Manager, Information Technology Lead, Enterprise Applications Manager, etc.

## Resume Content Rules

Visible candidate documents must not expose automation or tailoring.

Do not include:

- tailored
- target role alignment
- strong fit for
- based on the job description
- job agent
- application package
- RQ numbers in the document body/footer
- sections that explain why the resume was generated for a posting

Tailor only through professional resume language:

- summary emphasis
- skill ordering
- tools/platform selection
- role-relevant wording
- truthful keyword alignment
- verified experience bullet prioritization

For Maximo / EWMS roles, emphasize confirmed experience from The Brick through Talize around:

- asset/work management
- work orders
- preventative maintenance
- service requests
- facilities
- warehouse operations
- reporting checks
- integrations
- data handoffs
- QA/UAT
- BRD inputs
- process mapping
- stakeholder signoffs
- implementation support

Do not claim unsupported Maximo administration, configuration, development, certification, or version-specific ownership.

## Gmail / Recruiter Email Status

Current blocker:

```text
Gmail OAuth token is invalid/revoked.
Account: fejiro.efiuvwere@gmail.com
Token path: C:\FTC HOLDING\APPS\job-reply-agent\data\gmail_tokens.json
Redirect URI: http://127.0.0.1:3007
```

Re-auth steps from `gmail:status`:

```powershell
npm run serve
npm run gmail:status
```

Then complete the Google consent flow using the URL printed by the app, or use:

```powershell
npm run gmail:auth:save -- --code=<PASTE_CODE>
```

After reauth:

```powershell
npm run gmail:status
npm run run:gmail-cycle
```

Until Gmail is fixed, do not rely on automated recruiter replies. Visible manual Gmail replies can still be drafted by the operator if the user asks.

## Scheduler State

Current scheduler check showed:

```text
JobReplyAgent-Periodic   Ready, last result 0
JobReplyAgent-Gmail      Ready, last result 1
JobReplyAgent-Discovery  Ready, last result 0
JobReplyAgentDailyReport Ready, last result 2147946720
```

The Gmail task failure is expected while Gmail OAuth is invalid.

Useful commands:

```powershell
npm run schedule:status
npm run schedule:gmail:register
npm run schedule:discovery:register
npm run schedule:register
```

## Browser / Profile Rules

Use Fejiro's Chrome profile only.

Do not submit from Mike/Michael or an unknown Chrome profile.

Check:

```powershell
npm run browser:fejiro-status
```

Current browser check:

```text
Visible Chrome title: Feed | LinkedIn - Google Chrome
Visible Chrome profile: Fejiro
```

If CDP is needed:

```powershell
npm run browser:attach-chrome
```

Known CDP caution:

- The real visible Fejiro Chrome profile may be signed in but not expose CDP reliably.
- A cloned `.local` profile may expose CDP but may not carry auth and may show Chrome profile as paused.
- Do not submit from an unauthenticated clone.

## Core Commands For Next Dev

Health:

```powershell
cd "C:\FTC HOLDING\APPS\job-reply-agent"
npm run build
npm test
npm run schedule:status
npm run browser:fejiro-status
npm run hunt:status
```

LinkedIn discovery:

```powershell
npm run hunt:scrape-linkedin
npm run hunt:premium-queue -- --source=linkedin --limit=20
npm run hunt:prepare-artifacts -- --source=linkedin --limit=5
```

Visible apply / proof:

```powershell
npm run hunt:apply-one -- --job-id=<id>
npm run hunt:trust-report -- --limit=20
```

If operating directly in the browser, keep proof manually:

- screenshot before submit
- screenshot after confirmation
- selected resume visible
- role/company visible
- record status honestly

## Recommended Next Run

Start a clean thread for job applications, then:

1. Confirm Fejiro Chrome is open on LinkedIn and signed in.
2. Search LinkedIn for:

```text
Business Analyst remote Easy Apply Canada
Business Systems Analyst remote Easy Apply Canada
Senior Business Analyst hybrid Toronto Easy Apply
IT Business Systems Manager remote Easy Apply Canada
IT Manager remote Easy Apply Canada
```

3. Apply to high-fit BA roles first using:

```text
Business Systems Analyst - Fejiro Efiuvwere Golden Template.docx as the internal source template
```

4. Use the IT Manager resume only for IT Manager / IT Lead / Business Systems Manager roles.
5. Do not leave drafts.
6. Use the confirmed answer profile.
7. Capture proof.

## Open Risks

- Gmail OAuth currently invalid.
- LinkedIn browser automation may still need visible-browser assistance depending on modal layout.
- Some old resume files on LinkedIn still have underscore-heavy names; avoid selecting them.
- Do not duplicate applications already marked `applied_verified`.
- Do not over-apply to weak-fit roles just to hit volume.

## Definition Of Done For Next Job Session

A good job-application session should end with:

- count of applications submitted
- list of titles/companies
- resume used for each
- proof status for each
- any blocked/draft/needs-review applications clearly named
- no unverified submits counted as verified
