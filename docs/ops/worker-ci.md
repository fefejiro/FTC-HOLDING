# Worker CI Validation

This repo validates the `peacepadai` worker with a path-scoped workflow:

- `.github/workflows/worker-build-validate.yml`

It runs only when files under `workers/peacepadai/**` change.

## Local run

From repo root:

```bash
npm ci --legacy-peer-deps
npx wrangler deploy --dry-run --config workers/peacepadai/wrangler.toml
```

Expected result:

- Command exits successfully without deploying.
- Any worker config or bundle errors fail the command.

## Canonical worker location

Only this location is supported for `peacepadai`:

- `workers/peacepadai/wrangler.toml`
- `workers/peacepadai/src/index.ts`
