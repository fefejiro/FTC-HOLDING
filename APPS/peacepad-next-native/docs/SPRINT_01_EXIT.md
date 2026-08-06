# Sprint 01 — Networked staging foundation

## Exit status

**PARTIALLY COMPLETE — LOCAL VERIFIED.** The native branch now has the
contracts and tests needed to connect two fictional accounts to staging. It is
not a production release and no deployment was triggered.

## Verified in this sprint

- staging-only environment validation;
- production-host and production-write blocking;
- fictional session authentication and rate limiting;
- two-fictional-account HTTP handshake;
- strict staging-origin CORS;
- fail-closed health/readiness behavior;
- idempotent synthetic migrations;
- simulated restart verification;
- staging coordination-client binding;
- synthetic invitation → acceptance → conversation → message → correction →
  search journey;
- explicit family and permission authorization guards.

## Blocked or not started

- real PostgreSQL provisioning (Docker and `psql` are unavailable locally);
- real migration and restart proof against PostgreSQL;
- two real iPhone staging pass;
- network delivery/retry behavior against a deployed service;
- production identity migration, billing, calls, notifications, or App Store
  release work.

## Next sprint order

1. Provision an isolated staging PostgreSQL service and inject secrets from the
   runtime environment only.
2. Run the migration and restart suite against that service.
3. Deploy the staging rail without production routes.
4. Run two-fictional-account invitation, messaging, correction, search, and
   calendar authorization tests against the deployed rail.
5. Capture one simulator and one real-iPhone evidence pass.
6. Start PR E with QA matrix, governance, and release/rollback documentation.

## Release rule

V2 remains unreleasable until the blocked gates above are evidenced. The live
Capacitor app, production APIs, App Store record, and real family data remain
untouched.
