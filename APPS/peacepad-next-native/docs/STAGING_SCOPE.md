# PeacePad Native V2 staging rail

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

The HTTP rail currently uses an injectable readiness probe. PostgreSQL-backed
readiness, migration verification, restart persistence, and Railway staging
configuration remain explicit PR D gates; they are not claimed complete by
this commit.

Verification performed locally:

- focused TypeScript compile for the staging files: passed;
- runtime smoke: unauthenticated session returns `401`, valid fictional
  session returns `200`, disallowed origin returns `403`;
- bundle ID and production-write guardrails remain unchanged.
