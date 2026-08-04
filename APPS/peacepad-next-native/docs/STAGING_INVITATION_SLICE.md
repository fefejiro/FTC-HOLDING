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
- durable, expiring, peppered resolution proof that survives process restarts;
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
   no plaintext invitation-code, deep-link, requester, or bearer-token columns,
   persists expiring resolution claims, and revokes PUBLIC table access; and
6. `src/staging/server.ts`, a staging-only Node host with bounded JSON input,
   strict origin handling, redacted structured logs, health/readiness checks,
   and graceful shutdown. It never applies migrations automatically.

The client must never be allowed to submit or override a trusted actor. The
route adapter receives that actor from server middleware rather than HTTP
headers.

## Deployment work still required

- Provision an isolated PostgreSQL database and staging API service.
- Apply the migration and grant a dedicated runtime role only the operations it
  needs. The same migration now executes idempotently against disposable
  embedded PostgreSQL in `npm run test:sql`.
- Deploy the reviewed host and bind its database pool, hashed synthetic staging
  session, and authorized family-directory configuration.
- Supply invitation and rate-limit peppers through the server secret store.
- Complete live restore, restart, and multi-instance verification.

Local host verification proved `/health` returns 200 and `/readyz` fails closed
with 500 when the database is intentionally unavailable. No external service,
database, migration, or production credential was created or changed.

The embedded PostgreSQL proof executes the real DDL and repository SQL. It
verifies database privacy constraints and the create, resolve, accept, grant,
and hash-linked audit path. It is not evidence of network/TLS behavior,
least-privilege runtime roles, backups, or multi-process concurrency.

The same proof runs the dependency-injected staging host over a real loopback
TCP socket. It verifies health/readiness, strict origin handling, bounded JSON,
redacted logs, two fictional bearer sessions, and acceptance after the HTTP
host is stopped and recreated. The database remains alive during that host
restart; managed-database restart and failover remain deployment gates.

## Dependency gate

TypeScript, guardrails, all 127 Jest tests, embedded PostgreSQL and HTTP restart verification,
Expo config, and an iOS production export pass. The shared monorepo Expo Doctor
run is 17/18 because web workspaces expose
React 18 above the native workspace's React 19; a clean standalone native npm
install passes 18/18. Use the standalone install strategy in CI rather than
changing unrelated web dependencies. A standalone native audit reports 11
inherited Expo toolchain advisories (10 moderate and 1 high). Do not use
`npm audit fix --force`; triage those advisories through a reviewed Expo
upgrade plan before deployment promotion.

## Promotion gate

Deploy only to an isolated staging host. Verify create, resolve, accept,
decline, revoke, expiry, retry, concurrency conflict, cross-family denial, rate
limit, audit restoration, and secret rotation before enabling a real-iPhone
staging session. Production hosts and `ca.peacepad.family` remain out of scope.
