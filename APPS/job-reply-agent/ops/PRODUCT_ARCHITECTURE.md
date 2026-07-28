# Una Labs JobAgent Product Architecture

## Decision

JobAgent is a multi-user Una Labs product. Candidate instances such as
`fejiro` and `chukwuma` are isolated pilots, not separate products and not
hard-coded product personas.

Build mobile-ready from the beginning, but do not put the automation engine on
the phone. Use one cloud platform with several clients:

- Responsive web application
- Installable Progressive Web App
- iOS client
- Android client
- Operator/admin console

The web application is the first production client. Native apps follow the
same versioned API after onboarding, consent, approvals, notifications, and
proof workflows are stable.

## Current Reality

JobAgent now has two deliberately separate execution boundaries:

- The existing Windows pilot/operator runtime still owns browser-assisted job
  boards, local resume generation, and the verified Fejiro Gmail workflow.
- The hosted beta foundation owns invite-only accounts, PostgreSQL tenancy,
  private object storage, approvals, proof history, queues, and trusted-runner
  task exchange.

The hosted foundation is deployed to an Una Labs Railway project with separate
web, worker, migration, PostgreSQL, and private-bucket resources. Its temporary
Railway hostname is live for controlled QA. The branded
`jobagent.unalabs.cloud` domain is registered and awaits Cloudflare DNS.
Transactional email, Google production verification, operator MFA enrollment,
the Pro-plan backup/restore drill, and channel proof runs remain release gates.

This is not yet:

- Open for broader public invitations
- A certified autonomous job-board submission engine
- A native iOS or Android app
- Ready for App Store or Play Store distribution

## Verified Pilot Status - 2026-07-27

Fejiro's local pilot has been revalidated against the isolated-instance
runtime:

- Gmail OAuth resolves exactly to `fejiro.efiuvwere@gmail.com`.
- Recruiter processing runs in `approval_required` mode with resume
  `auto_send` disabled.
- Low-fit messages below the configured match threshold are skipped without
  creating reply drafts.
- Automated alerts and no-reply newsletters are skipped.
- Recruiter inbox processing is limited to the configurable recent-mail
  window, currently 14 days, so stale labeled backlog cannot generate new
  application packages.
- A Gmail thread can create at most one reply package.
- Sensitive-language or parser-uncertain opportunities require review.
- Resume-tailoring failure stops draft creation instead of attaching a static
  fallback resume.
- BA/BSA jobs use the approved orange golden template; IT-management jobs use
  the approved IT Business Systems Manager template.
- WMS/supply-chain BA roles receive verified domain emphasis from the job
  description while preserving approved career facts.
- Generated DOCX output is audited for malformed titles, empty bullets and
  rows, mojibake, punctuation collisions, and trailing blank pages.
- Recruiter replies cannot send unless a draft is explicitly placed in the
  approved-send label. Both approved-send labels were empty at verification.
- Manually reviewed and sent Gmail drafts are reconciled back into the local
  ledger using the Gmail thread, recipient, draft creation time, sent message
  id, and sent timestamp. Reconciliation records manual approval without
  enabling autonomous sends.

This validates the local Fejiro pilot workflow, not public-product readiness.
Hosted identity, PostgreSQL tenancy, private object storage, queue workers,
encrypted per-user OAuth, self-service onboarding, production deployment, and
the two-week Chukwuma pilot remain release gates.

## SaaS Foundation Status - 2026-07-27

The safe public-beta boundary is implemented and deployed:

- Expiring one-use invitations, verified email, password recovery, rotated
  password sessions, login throttling, CSRF protection, and mandatory operator MFA
- Authenticated user-derived tenant scope on every current `/api/v1` request
- PostgreSQL repositories and forced row-level security
- Runtime refusal of superuser or `BYPASSRLS` database roles in production
- Separate migration-owner and restricted runtime-role deployment credentials
- Tenant-scoped idempotency keys for retry-safe user mutations
- Resume vault, Career Truth Bank, connection, dashboard, approval, application,
  downloadable proof, inbound email, trusted runner, and operator APIs
- Recent-authentication gates for connection revocation, pause, resume, export,
  and deletion
- Versioned consent and automation policies, quiet hours, daily caps, immediate
  pause/revocation, complete metadata export, and password-confirmed deletion
- Live PostgreSQL tests proving cross-tenant read, update, delete, and
  idempotency isolation
- Private S3-compatible storage for resumes and proof with tenant-bound keys,
  short-lived signed downloads, deletion cleanup, and no public bucket access
- PostgreSQL-backed `pg-boss` queues with retries, dead-letter handling,
  deduplication, per-user/channel grouping, quiet hours, and redacted envelopes
- A signed, expiring Windows trusted-runner protocol that keeps browser cookies
  on the candidate device and fails closed on identity, CAPTCHA, authentication,
  legal, sensitive, contradictory, or unknown gates
- A responsive installable PWA covering onboarding, policy, resumes, facts,
  connections, recommendations, approvals, applications, proof, activity, and
  security controls
- A live Railway `/readyz` promotion gate, structured redacted logs, and a
  scheduled external readiness/PWA monitor
- Fejiro dry-run and hosted import with exact identity matching, 12 approved
  facts, 68 content-deduplicated resumes, 96 applications, 65 private evidence
  artifacts, and 31 deliberately downgraded unverified records

The hosted services and tenant foundation are verified. A public beta is not
declared complete until Cloudflare activates the branded domain, the Railway
workspace is upgraded from Hobby to Pro, the email provider and operator MFA
are configured, Google verification passes, the backup restore and incident
drills pass, fresh channel proof runs complete, and the 14-day Chukwuma
isolation pilot passes.

## Target Platform

### Client layer

The responsive web and mobile clients provide:

- Account registration and sign-in
- Guided onboarding and resume upload
- Career Truth Bank review
- Job preferences and compensation floor
- Gmail and job-platform connection status
- Job recommendations
- Resume/package previews
- Approval requests and sensitive-question review
- Application and recruiter-response timelines
- Daily digest and push notification preferences
- Pause, revoke, export, and delete controls

Clients never receive raw OAuth refresh tokens, browser cookies, worker
credentials, or another user's artifacts.

### API layer

Expose a versioned API such as `/api/v1` with authenticated tenant ownership on
every request. Initial resources:

- `/users/me`
- `/profile`
- `/career-facts`
- `/job-preferences`
- `/automation-policy`
- `/connections`
- `/resumes`
- `/job-matches`
- `/application-packages`
- `/applications`
- `/approval-requests`
- `/agent-runs`
- `/audit-logs`

Mutating actions use idempotency keys. Sensitive actions require recent
authentication and explicit consent checks.

### Worker layer

Background workers own:

- Gmail synchronization and recruiter classification
- Job discovery and deduplication
- Match scoring
- Resume and cover-letter generation
- Document audit and render verification
- Approved recruiter sends
- Controlled application assistance
- Proof reconciliation
- Digests, reminders, and notifications

Browser automation remains a controlled worker capability. CAPTCHA,
authentication challenges, legal declarations, unknown answers, and identity
mismatches create manual gates.

### Data and security

Move from filesystem instances and SQLite to:

- PostgreSQL with tenant ownership on every user-owned row
- Private object storage with short-lived signed URLs
- Encrypted OAuth and platform credentials
- Queue-backed workers with per-user concurrency and rate limits
- Immutable audit events for external actions
- Central consent and policy version history
- Export, deletion, token revocation, and account pause controls

Never use a user-selectable `instance_id` as authorization. The authenticated
user or authorized operator relationship determines tenant scope server-side.

## Mobile Strategy

### Phase 1: responsive web and PWA

Ship onboarding, job review, approvals, status, and account controls as a
responsive web application. Make it installable on iOS and Android home
screens. Use push notifications where platform support permits and email as a
reliable fallback.

### Phase 2: native clients

Build iOS and Android clients against the same API. A shared cross-platform
client is appropriate for the first native release. Native-only capabilities
should be limited to secure credential storage, push notifications, file
upload, camera/document capture, deep links, and biometric re-authentication.

Do not embed Gmail credentials, job-board cookies, resume generation, or
autonomous browser workers in the mobile binary.

### Phase 3: richer mobile assistance

Add review queues, document previews, interview preparation, application
history, and one-tap human-gate continuation. Keep final proof and external
action status authoritative on the server.

## Migration Boundary

Pilot contracts map to product records:

| Pilot contract | Product record |
| --- | --- |
| `UserInstanceConfig` | user, tenant membership, connections |
| `CareerTruthBank` | career facts and provenance |
| `ApplicationAnswerProfile` | approved application answers |
| `JobPreferencePolicy` | job preferences |
| `AutomationPolicy` | consent and action authority |
| `ApplicationProof` | applications, evidence, audit events |

All new pilot work must preserve this mapping and avoid adding candidate names,
mailboxes, paths, or answer defaults to shared business logic.

## Product Gates

Before public onboarding:

1. Replace filesystem tenant selection with authenticated user ownership. **Implemented.**
2. Replace SQLite with PostgreSQL and private object storage. **Implemented for the product API.**
3. Add account authentication, recovery, and session management. **Implemented.**
4. Add per-user OAuth connections and encrypted token storage. **Implemented;
   hosted Gmail reconnection and Google verification remain external gates.**
5. Add consent versioning and revocation. **Implemented.**
6. Add background queues, retries, rate limits, and quiet hours. **Implemented.**
7. Add responsive user and admin experiences. **Implemented as a PWA.**
8. Pass cross-tenant isolation and authorization tests. **Local and live
   PostgreSQL tests pass; final CI run remains required on the release commit.**
9. Complete privacy, retention, export, deletion, and incident procedures.
   **Product controls and public pages are implemented; restore and incident
   drills remain.**
10. Run the first-friend pilot reliably for at least two weeks. **Not started.**

## Near-Term Build Order

1. Finish `jobagent.unalabs.cloud`, Resend, hosted Gmail OAuth, operator MFA,
   monitoring, backups, and restore/incident drills.
2. Complete Fejiro Gmail, LinkedIn, Indeed, and Dice proof runs without
   submitting a poor-fit role; keep Monster `manual_only` until proof exists.
3. Cut local schedules over one channel at a time after shadow comparison.
4. Run Chukwuma as an isolated first-friend pilot for 14 reliable days.
5. Open broader invitations only after privacy and Google verification.
6. Build iOS and Android clients after the API and web pilot are stable.
