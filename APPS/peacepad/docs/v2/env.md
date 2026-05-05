# PeacePad v2 Environment Variables

v2 reuses the existing server environment model and adds optional metadata/support keys.

## Required Base Server Variables
- `SESSION_SECRET`
- `DATABASE_URL` (or PG* equivalents supported by `server/config.ts`)

## v2 Optional Variables
- `PEACEPAD_COMMIT_SHA`
: Used by `GET /v2/health` for commit reporting. Fallbacks: `COMMIT_SHA`, `GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`.

- `ONTARIO_211_API_KEY`
: Enables external Ontario 211 enrichment in support discovery.

## Existing AI Variables Reused by v2 Modules
- `OPENAI_API_KEY` (or `AI_INTEGRATIONS_OPENAI_API_KEY`)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` (optional; reused by existing AI services)

## Safety Notes
- Do not commit secrets.
- Use deployment secret managers / env injection.
- `/v2/health` only exposes non-sensitive status fields.
