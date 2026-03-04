# PeacePad v2 Testing

## Automated
Run v2 unit coverage:

```bash
npx vitest run \
  tests/unit/v2/intentRouter.test.ts \
  tests/unit/v2/conflictCheck.test.ts \
  tests/unit/v2/rewriteMessage.test.ts \
  tests/unit/v2/supportDiscovery.test.ts
```

What is covered:
- Intent router returns valid `module_id` from free-form input.
- Conflict check returns `conflict_level` and `safety_flags`.
- Rewrite message returns three styles and filters escalation language.
- Support discovery applies ranking and crisis-first safety gating.

## Type Check / Lint Baseline
Project command:

```bash
npm run check
```

Note: this repo currently has pre-existing TypeScript errors outside `server/v2/*`. v2 changes were validated with targeted unit tests and smoke checks.

## Latest Execution Snapshot (2026-03-04)
- `npm run check`: fails due existing non-v2 TypeScript errors in `client/*`, `server/replit_integrations/*`, and other legacy files.
- `npx vitest run tests/unit/v2/*.test.ts`: pass (6 tests).
- Local smoke endpoints on `http://127.0.0.1:5099`:
  - `GET /v2/health` -> `200`
  - `POST /v2/router/intent` -> `200`
  - `POST /v2/modules/conflict-check` -> `200`
  - `POST /v2/modules/rewrite-message` -> `200`
  - `POST /v2/modules/support-discovery` -> `200`
  - `GET /api/version` (v1 guardrail) -> `200`
- During smoke before migration, module-run tracking logs a one-time warning that `pp_v2_module_runs` is missing; endpoint behavior remains unaffected (best-effort tracking by design).

## Local Smoke
After starting the server, smoke these endpoints:

```bash
curl -s http://localhost:5000/v2/health
curl -s -X POST http://localhost:5000/v2/router/intent -H 'content-type: application/json' -d '{"text":"Help me rewrite this message"}'
curl -s -X POST http://localhost:5000/v2/modules/conflict-check -H 'content-type: application/json' -d '{"text":"If you do not answer me now I will call my lawyer"}'
curl -s -X POST http://localhost:5000/v2/modules/rewrite-message -H 'content-type: application/json' -d '{"text":"You never listen"}'
curl -s -X POST http://localhost:5000/v2/modules/support-discovery -H 'content-type: application/json' -d '{"query":"legal aid","conflict_level":4}'
```

Also verify a v1 endpoint still responds:

```bash
curl -s http://localhost:5000/api/version
```

Note:
- In restricted environments where `npm run dev` (`tsx`) cannot start due IPC permission errors, use a temporary bundled server entry for smoke checks:
  - `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=.tmp/pp-v2-smoke.js`
  - `node .tmp/pp-v2-smoke.js` with required env vars.
