# AWS staging prerequisites

No AWS deployment is authorized by this document. It defines the evidence and
owners required before a first staging plan may contact AWS.

## Required topology decision

Use two non-production AWS accounts where possible: one Canadian account bound
to `ca-central-1` and one U.S. account bound to `us-east-2`. Separate accounts
reduce accidental cross-region access and make budgets, incident response, and
audit evidence independently attributable. A single-account exception requires
written Security and Privacy approval plus separate protected roles and state.

## Approval gate

Create an untracked copy of `config/staging-approval.example.json`. Deployment
remains blocked until every owner is named, every required approval is true,
both account IDs are supplied outside source control, and a monthly budget and
alert destination are approved. Object Lock is a separate decision and remains
false by default because retention can prevent deletion.

## Remote state

Each account requires its own private, versioned, encrypted S3 state bucket.
Use the region-specific `backend.hcl.example` only after replacing its bucket
placeholder outside source control. Native S3 lockfiles must remain enabled.
Never place credentials in backend files; use a short-lived protected role.

## Cost and operational controls

Before the first plan against AWS, record:

- a per-account monthly budget and alerts at 50%, 80%, and 100%;
- cost-anomaly alerts;
- named Platform, Security, Privacy, Records, Finance, and on-call owners;
- log and backup retention approval;
- incident and breach escalation contacts;
- a teardown decision that preserves protected state and final snapshots.

## First live staging sequence

1. Review a credential-free plan in each account separately.
2. Confirm the provider account allowlist and region identity.
3. Deploy Canada first with no application records.
4. Run migrations twice and readiness checks.
5. Prove backup restoration into a separate isolated database.
6. Repeat independently in the U.S. account.
7. Run cross-account and cross-family denial tests.
8. Stop before API traffic until Privacy and Security sign the evidence.
