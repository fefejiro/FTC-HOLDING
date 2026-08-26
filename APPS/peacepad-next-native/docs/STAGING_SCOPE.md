# PeacePad Native V2 staging rail

> Historical early PR #172 scope record. For current release status and later
> staging additions, see [STATUS.md](STATUS.md).

This branch adds the first isolated staging rail for the native client. It is
strictly synthetic and fail-closed:

- the runtime must be `staging`;
- configured families and actors are fictional;
- the session token is verified against a SHA-256 digest with a pepper;
- CORS accepts only the configured staging app origin;
- `/health`, `/readyz`, and authenticated `/api/v2/session` are the only
  routes exposed by this rail;
- no production host, production identity, database write, upload, or App
  Store configuration is reachable from these files.
- `staging.env.example` contains placeholders only; secrets and fictional
  session hashes must be injected at runtime.

The HTTP rail uses an injectable readiness probe. A small typed PostgreSQL
adapter now defines the harmless `SELECT 1` readiness boundary without adding
a database dependency to the client package. Migration verification, restart
persistence, and Railway staging configuration remain explicit PR D gates; they
are not claimed complete by this commit.

Verification performed locally:

- focused TypeScript compile for the staging files: passed;
- runtime smoke: unauthenticated session returns `401`, valid fictional
  session returns `200`, disallowed origin returns `403`;
- bundle ID and production-write guardrails remain unchanged.
