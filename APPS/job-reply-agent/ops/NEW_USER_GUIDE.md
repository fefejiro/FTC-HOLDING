# Una Labs JobAgent New User Guide

## User Journey

1. Una Labs creates an isolated account or pilot instance.
2. The user opens their private onboarding link.
3. The user enters contact details, target roles, location preferences,
   compensation floor, eligibility answers, and job-platform preferences.
4. The user uploads one to three source resumes and selects a default.
5. JobAgent extracts a draft Career Truth Bank with source provenance.
6. The user reviews the truth record and corrects unsupported or unclear facts.
7. The user chooses separate permissions for:
   - Recruiter email drafts
   - Recruiter email sends
   - Assisted job applications
   - Controlled submissions
8. The user connects Gmail and enabled job platforms to their own account.
9. Una Labs runs the acceptance gate and activates only the permissions the
   user approved.
10. The user receives a daily queue containing recommendations,
    approval-needed items, verified submissions, replies, and manual gates.

## Daily Use

The user opens JobAgent on desktop or mobile to:

- Review recommended roles and fit reasons
- Preview the selected or generated resume
- Approve or reject sensitive answers
- Approve recruiter replies and controlled submissions
- Complete CAPTCHA, identity, or platform authentication gates
- Track verified application evidence
- Pause automation or revoke a connection

No application is reported as verified without confirmation-page,
confirmation-email, or platform-history evidence.

## Pilot Access

The current pilot runs as a responsive web application on an operator-managed
machine. The private access code is provided separately and must not be placed
in email attachments, source control, screenshots, or handover documents.

The production product will replace the private pilot code and filesystem
instance selector with user authentication, tenant authorization, PostgreSQL,
private object storage, encrypted credentials, and cloud workers.

## Activation Boundary

New users cannot activate themselves merely by checking consent boxes. Una
Labs verifies:

- Identity and mailbox match
- Source resume ownership
- Career Truth Bank provenance
- DOCX template structure and visual rendering
- Browser/job-platform identity
- Consent choices and date
- Cross-tenant isolation
- Scheduler and proof-ledger isolation

Only then is the account activated.
