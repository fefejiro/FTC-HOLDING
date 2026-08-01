# Staging Invitation Slice

## Current boundary

The framework-neutral `/api/v2/invitations` handler core is implemented under
`src/staging`. It is automated-verified only. It is not deployed, is not used
by the live Capacitor app, and cannot write to PeacePad production.

Implemented behavior:

- trusted authenticated actor and family-permission checks;
- six-character codes derived from a server-only pepper and idempotency intent;
- only peppered code hashes retained in the invitation repository;
- preview after successful code resolution;
- explicit accept, decline, and sender-authorized revoke;
- proof of code resolution required before accept or decline;
- expiry, revocation, reuse, region, and optimistic-version enforcement;
- idempotent create and state transitions;
- independently rate-limited creation and resolution attempts; and
- hash-linked append-only audit events.

## Durable staging adapters

The repository now includes:

1. `PostgresInvitationStore`, with transaction rollback, advisory locks,
   compare-and-swap updates, peppered idempotency hashes, durable grants, and
   audit storage;
2. `PostgresInvitationRateLimiter`, using atomic upserts and hashed subjects;
3. `TrustedInvitationHttpBridge`, which constructs actors only through a
   server authenticator and ignores user-supplied actor headers;
4. `createStagingInvitationRuntime`, which wires those adapters, requires HTTPS
   away from localhost, and rejects non-staging origins; and
5. `staging/migrations/0001_invitation_slice.sql`, an isolated schema that has
   no plaintext invitation-code or deep-link columns and revokes PUBLIC table
   access.

The client must never be allowed to submit or override a trusted actor. The
route adapter receives that actor from server middleware rather than HTTP
headers.

## Deployment work still required

- Provision an isolated PostgreSQL database and staging API service.
- Apply the migration and grant a dedicated runtime role only the operations it
  needs. The migration was not executed locally because `psql` is unavailable.
- Bind a real database pool, staging session authenticator, and authorized
  family-directory lookup.
- Supply invitation and rate-limit peppers through the server secret store.
- Add health/readiness endpoints, structured redacted logs, and live restore
  verification.

## Promotion gate

Deploy only to an isolated staging host. Verify create, resolve, accept,
decline, revoke, expiry, retry, concurrency conflict, cross-family denial, rate
limit, audit restoration, and secret rotation before enabling a real-iPhone
staging session. Production hosts and `ca.peacepad.family` remain out of scope.
