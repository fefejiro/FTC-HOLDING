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
- rate-limited resolution attempts; and
- hash-linked append-only audit events.

## Deployment adapters still required

Before a staging deployment, replace `InMemoryInvitationStore` and the local
rate-limit buckets with:

1. a region-bound durable invitation and participant-grant repository;
2. transactional compare-and-swap writes for invitation state changes;
3. a shared rate limiter suitable for multiple service instances;
4. durable idempotency receipts and append-only audit storage;
5. a server-only secret provider for the hashing pepper;
6. trusted authentication middleware that constructs `StagingActor`; and
7. family display-name lookup that applies the same authorization boundary.

The client must never be allowed to submit or override a trusted actor. The
route adapter receives that actor from server middleware rather than HTTP
headers.

## Promotion gate

Deploy only to an isolated staging host. Verify create, resolve, accept,
decline, revoke, expiry, retry, concurrency conflict, cross-family denial, rate
limit, audit restoration, and secret rotation before enabling a real-iPhone
staging session. Production hosts and `ca.peacepad.family` remain out of scope.
