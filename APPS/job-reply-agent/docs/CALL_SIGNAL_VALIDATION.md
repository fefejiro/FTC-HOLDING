# Call Signal Validation

Purpose: validate recruiter, mentor, and platform calls against the existing job hunt pipeline before spending time or travelling.

This is not a CRM. Keep the workflow local, manual-first, and tied to `hunt_jobs`, `hunt_contacts`, `hunt_followups`, and `application_attempts`.

## Existing Data Anchors

- `hunt_jobs`: source platform, company, role, URLs, score, tier, status, recruiter email, next action.
- `hunt_contacts`: recruiter/contact identity by email and company.
- `hunt_followups`: due dates and follow-up notes for existing applications or outreach.
- `application_attempts`: submitted or paused application evidence.
- `job-hunt/tracker.csv`: old lightweight CSV tracker with company, role, contact, follow-up date, and notes.

## Manual Call Log Shape

Use this shape for call notes in a local note, CSV, or future `hunt_call_signals` table:

```text
received_at
caller_name
phone_number
company
role
source_platform
matching_job_id
matching_application_status
call_notes
follow_up_date
confidence_score
confidence_reason
next_action
```

## Source Priority

1. Dice application or Dice recruiter response.
2. Direct recruiter call with company, role, and verifiable email/domain.
3. Mentor referral with named company or named hiring contact.
4. Indeed.
5. LinkedIn.
6. Unknown or vague platform.

## Confidence Scoring

Start at `50`, then adjust:

- `+20` if phone caller names the exact company and role already in `hunt_jobs`.
- `+15` if the source is Dice.
- `+15` if the caller gives an email from the recruiting/company domain.
- `+10` if there is a matching `application_attempts` row marked submitted, paused, or ready.
- `+10` if a mentor/referrer name is known and specific.
- `-20` if the caller asks for travel before sending written confirmation.
- `-20` if the role/company cannot be found in `hunt_jobs` or recent outputs.
- `-30` if the caller requests sensitive information, payment, ID documents, SIN/SSN, or account credentials.

Treat scores this way:

- `80-100`: likely valid. Ask for written confirmation and schedule.
- `60-79`: plausible. Verify by email before travel or document sharing.
- `40-59`: uncertain. Log it, ask for company email, and do not travel yet.
- `0-39`: low trust. Do not travel or share documents.

## Smallest Reliable Workflow

1. Capture caller name, phone number, company, role, platform, and notes immediately after the call.
2. Search `hunt_jobs` by company, role, source, and recruiter email.
3. If matched, record the `hunt_jobs.id`, current status, score, and any `application_attempts.status`.
4. If unmatched but credible, add a manual `hunt_jobs` row only after written confirmation.
5. Create or update a follow-up date in the existing follow-up workflow.
6. Require written confirmation before travel, especially for any confidence score below `80`.

## Application Proof Rule

Do not treat browser completion as travel-grade proof by itself.

For Dice and other job platforms, require at least one of:

- A platform confirmation screen captured in `application_attempts.screenshot_path`.
- `application_attempts.pause_reason` containing confirmation evidence.
- A recruiter or employer acknowledgment email tied to the same company and role.
- A visible platform application history entry showing the role as applied.

The agent can keep working after a submit click, but it must separate:

- `submitted` / `applied`: confirmation evidence was detected.
- `submitted_unverified` / `applied_unverified`: submit was clicked, but platform proof is still missing.
- `paused`: the system could not complete the application because of sign-in, captcha, missing required answers, or a missing submit button.

Calls or travel decisions should trust `applied` more than `applied_unverified`.

## Hybrid Runner Model

Use two lanes:

- `run:cloud-cycle`: GitHub Actions safe. Handles Gmail intake, recruiter drafting, and Gmail proof sync. It does not scrape/apply through browser sessions.
- `run:laptop-cycle`: local laptop only. Handles Dice discovery, Dice preflight, browser application attempts, screenshots, and proof sync.

The laptop cycle requires a signed-in Dice browser session. If Dice auth is missing, the cycle records `blocked_needs_auth` instead of counting the application as sent.

Verified success is represented by `applied_verified` / `submitted_verified`. Submit attempts without platform or email proof remain `applied_unverified` / `submitted_unverified`.

## Recruiter Email Drafting Policy

Recruiter emails should be draft-first, not skip-first.

- Create a Gmail draft for every non-blocked recruiter opportunity, even when score or parser confidence is low.
- Put low-score or uncertain emails in `JOB AGENT/Needs Review` with the reason recorded.
- Use `JOB AGENT/Skipped` mainly for self-sent loopback messages or messages already handled outside the candidate workflow.
- Keep `JOB AGENT/Blocked` for true risk items such as sensitive information requests, payment to apply, suspicious links, or representation/legal terms requiring caution.
- When the employer is not present in the message, use the sender email as the artifact/company fallback instead of `Unknown Company`; this avoids generated resumes named with `Unknown_Company`.

## Safe Next Command

```powershell
npm --prefix APPS/job-reply-agent run hunt:status
```

To audit existing `applied` rows that are missing strong proof:

```powershell
npm --prefix APPS/job-reply-agent run dev -- hunt:application-proof --limit 50
```

To reclassify historical rows that were marked applied without platform confirmation:

```powershell
npm --prefix APPS/job-reply-agent run dev -- hunt:reconcile-application-proof
```
