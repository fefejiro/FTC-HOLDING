# FTC Workflow Templates

Drop these templates into `.github/workflows/` when scaffolding a new app.

## Available templates

- `ftc-cf-pages.yml` — Next.js app deploy to Cloudflare Pages
- `ftc-railway-api.yml` — Express API deploy to Railway
- `ftc-cf-worker.yml` — Cloudflare Worker deploy via Wrangler
- `ftc-quality-gates.yml` — lint, TypeScript check, dependency audit, doc-drift

## 60-second copy-paste setup

1. Copy the template file into `.github/workflows/<your-workflow-name>.yml`.
2. Replace all `<...>` placeholders (`<app-name>`, `<workflow-file>`, `<worker-name>`, etc.).
   - `<workflow-file>` must match the real file name you save in `.github/workflows/` so path triggers work.
3. Set required repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `RAILWAY_TOKEN` (Railway template only)
4. Update command variables (`LINT_CMD`, `TSC_CMD`, `AUDIT_CMD`, `DOC_DRIFT_CMD`) to match the app scripts.
5. Open a PR and confirm the workflow passes.

## Notes

- These are starter templates intended for fast bootstrap.
- Existing per-app workflows should stay untouched and can be migrated app-by-app.
