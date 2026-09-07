# JobAgent SaaS Architecture Reset

Date: 2026-07-25

## Scope and evidence

This audit covers `APPS/job-reply-agent` as it exists in the FTC-HOLDING
repository. It is based on the checked-in TypeScript, SQL migrations,
configuration, scripts, tests, and operator documentation. Local instance data,
OAuth tokens, resumes, screenshots, and proof files are intentionally excluded.

## Current architecture

JobAgent currently has two architectures running side by side:

1. The legacy operator application uses TypeScript, SQLite, YAML configuration,
   Gmail OAuth, Playwright/visible Chrome assistance, local DOCX generation, and
   Windows scheduled tasks. `src/main.ts` is the CLI entrypoint and
   `src/server.ts` is the operator dashboard.
2. The hosted beta uses Node's HTTP server and PostgreSQL. `src/product_server.ts`
   owns registration, login, onboarding, resume upload, Career Truth Bank,
   connection requests, dashboard reads, approval decisions, export, pause, and
   deletion. `src/product_auth.ts`, `src/product_db.ts`, and
   `src/product_repository.ts` provide authentication, tenant transactions, and
   persistence.

User instances in `src/instance.ts` isolate legacy databases, Gmail tokens,
browser profiles, resumes, logs, proof, and onboarding records under
`instances/<instance-id>`. This is useful pilot isolation, but it is not the
long-term SaaS data model.

## Current database schemas

### Legacy SQLite

`src/db.ts` creates:

- `messages`
- `opportunities`
- `drafts`
- `decisions`
- `application_proofs`

`src/hunt/db.ts` creates:

- `hunt_jobs`
- `hunt_packages`
- `hunt_outreach_drafts`
- `hunt_contacts`
- `hunt_followups`
- `hunt_apply_sessions`
- `hunt_interview_prep`
- `application_runs`
- `application_attempts`
- `application_submit_results`
- `email_auto_response_attempts`

Ownership is implicit because every instance has a separate SQLite file. Most
legacy tables do not carry a user identifier, so they cannot safely be combined
into one shared database without migration.

### Hosted PostgreSQL before this reset

Migrations `001_product.sql` through `003_job_operations.sql` create:

- `product_users`, `product_sessions`, and `product_onboarding`
- `product_connections` and `product_audit_logs`
- `product_resumes` and `product_career_truth_banks`
- `product_job_matches`, `product_approval_requests`, and
  `product_applications`

Private tables have `user_id`, forced row-level security, and policies based on
the transaction-local `app.user_id` setting. Repository methods also include
`user_id` in reads and mutations.

The current schema is a secure beta slice, not the requested normalized product
model. Career facts are stored as one JSON array, resumes include file bytes in
PostgreSQL, jobs are user-specific match records rather than normalized postings,
and there are no organizations, campaigns, interviews, follow-ups, or immutable
state transitions.

## Module responsibilities

| Area | Modules | Current responsibility |
| --- | --- | --- |
| Instance isolation | `src/instance.ts`, `src/config.ts`, `src/onboarding.ts` | Resolves pilot identity, private paths, mailbox, browser profile, configuration, and activation gates |
| Recruiter processing | `src/processor.ts`, `src/job_parser.ts`, `src/match_scorer.ts`, `src/red_flags.ts`, `src/reply_generator.ts` | Parses recruiter email, scores fit, evaluates risk, selects a resume, and creates a reply decision |
| Gmail | `src/gmail.ts`, `src/email_sender.ts`, `src/message_store.ts` | OAuth, mailbox identity check, recruiter scanning, drafts, sends, labels, and local storage |
| Opportunity hunt | `src/hunt.ts`, `src/hunt/*`, `src/automation.ts` | Ingestion, normalization, scoring, packages, follow-ups, browser assistance, and proof reconciliation |
| Resumes | `src/resume_selector.ts`, `src/resume_style.ts`, `src/resume_tailor.ts`, `src/cover_letter.ts`, `src/product_resume.ts` | Resume family selection, truth-bank-based wording, DOCX mutation, audit checks, cover letters, and upload validation |
| Proof | `src/application_proof.ts`, `src/call_signals.ts` | Validated application states and evidence-backed verification |
| Operator UI | `src/server.ts`, `src/reporter.ts` | Single-instance operational dashboard and daily reports |
| SaaS beta | `src/product_server.ts`, `src/product_auth.ts`, `src/product_db.ts`, `src/product_repository.ts` | Hosted account, session, onboarding, resume, truth, connection, approval, export, pause, and dashboard APIs |
| Schedulers | `scripts/*-run.ps1`, `scripts/register-*-task.ps1` | Instance-named Gmail, discovery, application, and digest runs |

## Reusable components

- Instance fail-closed checks and mailbox/browser identity verification.
- Gmail OAuth, draft, send, thread, and label primitives.
- Job parsing, source normalization, and alert detection.
- Truth-aware resume generation and DOCX structural cleanup.
- Resume-family selection and golden-template preservation.
- Sensitive-field detection and manual gates.
- Evidence-backed application proof and verified/unverified distinctions.
- PostgreSQL tenant transactions, secure sessions, password hashing, secure
  cookies, RLS, audit logs, export, deletion, pause, and connection revocation.
- Existing tests for instance isolation, resume truth, application proof,
  onboarding, and product security.

## Fejiro-specific shared logic

Fejiro remains correctly present in pilot configuration and fixtures, but shared
runtime logic still contains pilot assumptions:

- `src/resume_style.ts` defines Fejiro-named approved templates, detects a legacy
  Fejiro truth bank, and falls back to Fejiro's name and email.
- `src/cover_letter.ts` falls back to Fejiro's name, Toronto location, email, and
  phone.
- `src/hunt.ts` emits Fejiro's name and phone in outreach text and uses
  Canada/GTA-specific scoring.
- `src/reply_generator.ts` contains a Canadian-citizen/TN sentence.
- `src/resume_tailor.ts` strips Fejiro and a fixed Canadian location list from
  recruiter subject lines.
- `src/match_scorer.ts` and `src/hunt.ts` contain shared Canada/US geography
  weights.
- `scripts/indeed-visible-assist.ts`, `scripts/fejiro_chrome_status.py`,
  `scripts/visible_chrome_dom_dump.py`, and `scripts/start-chrome-cdp.ps1`
  contain Fejiro profile, phone, filename, and Chrome-profile assumptions.
- `config/*.yaml` and checked-in `resumes/` are Fejiro pilot seed data. They must
  not be loaded as global SaaS defaults.
- `scripts/create_chukwuma_golden_template.py` is a one-user generation script
  and should become a generic template service or private fixture.

Historical handovers and tests may name Fejiro as a fixture. That is acceptable
when they are explicitly marked as pilot or test data.

## Hardcoded paths and identities

`config/rules.yaml` points to
`C:/FTC HOLDING/DOCS/Fejiro_Job_Reply_Agent_Resume_Bank`. Legacy resume maps use
Fejiro filenames. Browser scripts assume Chrome `Profile 5`. Operator docs include
local proof paths and account-specific operating instructions. These paths are
valid only inside Fejiro's private pilot configuration and must not be used by
hosted product code.

## Missing or broken imports

The current TypeScript import graph compiles. The initial file inventory can
appear incomplete if ignored files are omitted: `src/automation.ts` and
`src/hunt/*` exist and are imported by the CLI. No missing runtime import was
identified in the audit. Build and tests remain the authority after each phase.

## Existing job and application states

The legacy hunt uses operational states including `discovered`, scored tiers,
package/draft states, manual pauses, attempts, and proof statuses. The proof model
distinguishes:

- `discovered`
- `rejected_by_policy`
- `package_ready`
- `needs_approval`
- `manual_gate`
- `submission_attempted`
- `submitted_unverified`
- `submitted_verified`
- `failed`
- `withdrawn`

The hosted beta currently stores a subset in `product_job_matches` and the proof
states in `product_applications`. It does not yet keep an immutable transition
history or the full customer lifecycle. The target lifecycle is:

`discovered`, `recommended`, `saved`, `package_generating`, `package_ready`,
`approval_required`, `approved`, `submission_in_progress`, `applied`,
`submission_failed`, `recruiter_response`, `screening`, `interview`, `offer`,
`rejected`, `withdrawn`, `follow_up_due`, and `blocked`.

## Existing Gmail functionality

`src/gmail.ts` supports consent URLs with PKCE, token exchange, account identity
verification, recruiter search, message and attachment parsing, threaded drafts,
sending, and labels. Tokens resolve through the active instance and are excluded
from Git. The legacy classifier is recruiter-centric and does not yet persist the
requested SaaS response categories. `product_connections` records connection
state and a secret reference, but the hosted beta does not yet implement the full
per-user OAuth callback and encrypted token service.

Gmail remains a response engine and a job-alert input. It is not the primary
opportunity source.

## Existing resume-generation functionality

The legacy engine selects resume families, generates tailored DOCX files from
approved templates, removes malformed titles and empty bullets, checks
unsupported claims, creates cover letters, and records artifacts. The hosted beta
can upload, list, download, and delete resumes and approve a JSON Career Truth
Bank. It lacks normalized resume templates, role families, immutable versions,
archive state, object storage, preview jobs, and generated-document audit records.

Fejiro's golden resume must migrate to a Fejiro-owned approved template. It is not
a product default.

## Existing approval functionality

Legacy processing supports `draft_only`, `approval_required`, and trusted-send
modes plus sensitive-field pauses. The hosted beta supports pending approval
requests and approve/reject decisions with audit records. Approval records need
to be generalized to application packages, screening answers, recruiter replies,
and sensitive declarations. MVP product settings expose only `assist` and
`approval_required`.

## Target SaaS architecture

### Opportunity Engine

Adapters implement a common import contract for manual URL, pasted description,
Gmail alerts, Greenhouse, Lever, Ashby, public career pages, and agency alerts.
The engine stores one normalized `job_postings` record, fingerprints content,
deduplicates sources, matches postings to user-owned `search_campaigns`, and
persists explainable `job_matches`.

LinkedIn and Indeed remain alert, URL-import, assisted, or approved-integration
sources until a reliable authorized interface exists.

### Application Engine

The engine loads the authenticated user, campaign, approved career facts, and
role-family template. It extracts requirements, creates versioned generated
documents and answers, validates truth and sensitive fields, creates an approval,
and records evidence after a user-directed submission. Unknown facts produce
review flags. MVP submissions always require approval.

### Response Engine

The engine resolves a user-owned Gmail integration, verifies the authenticated
mailbox, classifies messages into the product taxonomy, links messages to jobs
and applications, drafts grounded replies, and creates approvals for sensitive
actions. Tokens are encrypted outside the database record or represented by a
revocable secret-manager reference.

### Customer product

The public responsive application provides Dashboard, Jobs, Applications,
Messages, Resumes, Career Profile, Search Campaigns, Interviews, Analytics,
Integrations, and Settings. The existing operator dashboard remains an internal
migration and support tool.

### Storage and workers

- PostgreSQL is the source of truth with tenant ownership and forced RLS.
- Private object storage holds resumes, generated files, previews, and proof.
- Signed URLs provide short-lived access.
- Background workers process ingestion, parsing, scoring, document generation,
  Gmail classification, and follow-ups.
- Structured logs contain IDs and outcomes, not message bodies, resumes, answers,
  tokens, or screenshots.

## Database migration strategy

1. Keep `product_users` as the account table during compatibility work.
2. Add organizations, membership, normalized career, resume, campaign, job,
   package, response, interview, run, and audit entities with user ownership and
   forced RLS.
3. Introduce repository methods that always use `withTenant` and explicit
   ownership predicates.
4. Create a Fejiro pilot account and import legacy configuration into private
   user-owned records. Store source files in private object storage.
5. Import each legacy SQLite database separately, attaching every row to its
   resolved product user and recording source IDs for idempotency.
6. Run old and new reads in parallel, compare counts and proof semantics, then
   switch one workflow at a time.
7. Retire SQLite only after reconciliation and rollback evidence exist.
8. Rename `product_users` to `users` in a later compatibility release after all
   SQL callers are migrated. The table is the current implementation of the
   requested users entity.

## Security risks

- Fejiro identity and Canadian assumptions in shared generation and scoring can
  contaminate another user's output.
- Legacy SQLite ownership is filesystem-based rather than row-based.
- Resume bytes are stored in PostgreSQL instead of private object storage.
- `product_connections.secret_reference` has no complete secret-manager
  implementation yet.
- Broad JSON onboarding and truth records are harder to validate and audit than
  normalized facts.
- The migration runner replays idempotent SQL files but has no migration ledger
  or checksum protection.
- The in-memory HTTP rate limiter is not distributed.
- The custom HTTP server has no email verification, password reset, MFA,
  organization roles, or production OAuth callback flow.
- Browser automation is local, stateful, and unsuitable as the global SaaS core.
- Legacy logs and proof may contain personal content; they must remain local and
  excluded from source control.
- Organization access must never be inferred from an organization ID supplied by
  the client; membership and role must be checked in both RLS and service code.

## Recommended phases

1. Add normalized tenancy and application-history foundations.
2. Move Career Truth Bank and Resume Vault to normalized, versioned records.
3. Add campaigns, normalized job ingestion, deduplication, and explainable
   campaign scoring.
4. Add application packages, answer provenance, sensitive approvals, and
   generated-document audit.
5. Complete per-user Gmail OAuth and response classification.
6. Build customer onboarding and dashboard workflows.
7. Add Greenhouse, Lever, Ashby, and public career-page adapters.
8. Add background workers, analytics, admin monitoring, object storage, and
   production security operations.

Each phase requires migration verification, ownership tests, truth tests, build,
test, and documented release evidence.

## Explicit non-goals

- Blind autonomous application submission.
- CAPTCHA bypassing or unauthorized scraping.
- Treating Gmail as the main job-discovery channel.
- Making Fejiro's golden resume a universal template.
- Native iOS or Android applications before the responsive web workflow is
  stable.
- Replacing working legacy features before migration and reconciliation.
- Storing OAuth tokens, email bodies, resumes, screenshots, proof, or generated
  private documents in Git.
- Claiming production readiness from local tests alone.

## First implementation milestone

Add the normalized tenant-owned schema around the hosted beta:

- organizations and membership;
- profile, preference, career, resume, campaign, job, package, application,
  response, interview, follow-up, generated-document, run, and audit entities;
- forced RLS and organization-membership checks;
- immutable application state transitions;
- uniqueness constraints for duplicate jobs and applications;
- schema tests that ensure every private entity has ownership and RLS.

This milestone establishes safe storage contracts. It does not expose unfinished
customer workflows or migrate private pilot data into source control.
