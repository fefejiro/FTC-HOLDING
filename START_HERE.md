# PeacePad Start Here

- Primary app path: `C:\FTC HOLDING\APPS\peacepad`
- Source of truth: `origin/main` on GitHub
- Frontend production owner: Cloudflare Pages (`https://peacepad.ca`, `https://www.peacepad.ca`)
- Backend production owner: Railway API service (`https://api.peacepad.ca`)
- Deploy model:
  - GitHub `main` -> Cloudflare Pages (frontend only)
  - GitHub `main` -> Railway (backend/API only)
- Railway must run with `DEPLOY_ROLE=api` in production so non-API routes return JSON `404`
- Frontend must call API via `VITE_API_BASE_URL=https://api.peacepad.ca`
- Android/Play Store releases are separate from web deploys
- Release workflow reference: `DOCS/PEACEPAD_RELEASE_POLICY.md`

## Current High-Priority Checks

1. Auth guardrail: no visible signup/signin routes leading to deprecated Replit auth links.
2. Parenting tips + weather activities: broad/default filters must return fallback content.
3. Expenses: prevent invalid settlement attempts and show human-readable errors.
4. Scheduling: only real time overlaps should be flagged; no opaque IDs in conflict text.
5. Prep Chat: Myers-Briggs selections must propagate into prompt/revision behavior.

## Useful Commands

- `npm --prefix APPS/peacepad run verify:deployment-ownership`
- `npm --prefix APPS/peacepad run test -- --run tests/unit/prepChatPersonality.test.ts`
- `npm --prefix APPS/peacepad run build`
