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

The repository currently contains:

- A responsive local HTML dashboard served by Node
- Per-instance YAML configuration and private filesystem roots
- SQLite persistence
- Gmail OAuth and recruiter-message workflows
- Resume generation and application-package workflows
- Browser-assisted job-board operations
- Proof-backed application states
- Windows scheduled-task runners

This is a working pilot/operator system. It is not currently:

- A public hosted service
- A user-authenticated multi-tenant SaaS
- A native iOS or Android app
- Suitable for arbitrary users without operator-created instance files
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

This validates the local Fejiro pilot workflow, not public-product readiness.
Hosted identity, PostgreSQL tenancy, private object storage, queue workers,
encrypted per-user OAuth, self-service onboarding, production deployment, and
the two-week Chukwuma pilot remain release gates.

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

1. Replace filesystem tenant selection with authenticated user ownership.
2. Replace SQLite with PostgreSQL and private object storage.
3. Add account authentication, recovery, and session management.
4. Add per-user OAuth connections and encrypted token storage.
5. Add consent versioning and revocation.
6. Add background queues, retries, rate limits, and quiet hours.
7. Add responsive user and admin experiences.
8. Pass cross-tenant isolation and authorization tests.
9. Complete privacy, retention, export, deletion, and incident procedures.
10. Run the first-friend pilot reliably for at least two weeks.

## Near-Term Build Order

1. Finish Chukwuma as an isolated first-friend pilot.
2. Extract candidate-neutral domain services from local operator commands.
3. Define `/api/v1` schemas and tenant authorization tests.
4. Introduce PostgreSQL and object-storage adapters behind repositories.
5. Build self-service web onboarding and approval queues.
6. Deploy the web application and workers.
7. Add PWA installation and notifications.
8. Build and distribute iOS and Android beta clients.
