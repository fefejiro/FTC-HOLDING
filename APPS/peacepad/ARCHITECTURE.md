# PeacePad — Architecture Reference

> One-stop doc for any dev onboarding to PeacePad or debugging a production issue.
> Keep this file updated when any infrastructure or service changes.

---

## Stack at a Glance

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React + Vite (static) | Served from `peacepad.ca` |
| **Backend** | Node.js / Express / TypeScript | Deployed to Railway as `@ftc/peacepad` |
| **Database** | PostgreSQL via **Neon** | Managed serverless Postgres — see DB section below |
| **ORM** | Drizzle ORM | Schema at `shared/schema.ts`; migrations in `server/migrations/` |
| **Auth** | Session-based (`express-session`) | `SESSION_SECRET` required in prod |
| **AI** | OpenAI API | `OPENAI_API_KEY` + `OPENAI_BASE_URL` required in prod |
| **Push** | Web Push (VAPID) | Three keys required: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| **FCM** | Firebase Admin SDK | `FIREBASE_SERVICE_ACCOUNT_JSON` (or `_PATH`) required |

---

## Hosting & Deployment

### Railway Project: `splendid-spirit`
- **Project ID:** `e9cee72a-a4b0-470c-8280-b51ff62ec4e0`
- **Service:** `@ftc/peacepad` (service ID `df4a35e3-b3de-4aa4-9cf0-5e0d9af206bc`)
- **Internal URL:** `https://ftcpeacepad-production-242f.up.railway.app`
- **Custom domain:** `api.peacepad.ca` → Cloudflare proxy → Railway
- **Build:** Railpack (not Nixpacks) — runs `npm run build --workspace=@ftc/peacepad`
- **Start:** `npm run start` → `cross-env NODE_ENV=production node dist/index.js`
- **Health check:** `GET /api/health` (Railway checks this on deploy)

### Other services in `splendid-spirit`
- `ateam-platform` — Online
- `@ftc/ftc-site` — Online
- `saywetin-api` — Online (custom domain: `api.saywetin.app`)
- `@ftc/peacepad-extension` — Completed

### Frontend (peacepad.ca)
Served separately (Cloudflare Pages or similar). The backend is API-only (`DEPLOY_ROLE=api`).

---

## Database: Neon (PostgreSQL)

PeacePad uses **Neon** — a serverless Postgres provider — for its production database.

- **Connection via:** `DATABASE_URL` environment variable (standard PostgreSQL connection string)
- **Format:** `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/peacepad`
- **ORM:** Drizzle — run `npm run db:push` to sync schema changes
- **Where to manage:** [https://console.neon.tech](https://console.neon.tech)

### DB environment variables (Railway service env)
```
DATABASE_URL=postgresql://...    ← PRIMARY — required, set in Railway service vars
DIRECT_URL=                      ← optional, some tooling needs a direct (non-pooled) URL
PGHOST=                          ← fallback if DATABASE_URL not set
PGPORT=5432
PGUSER=
PGPASSWORD=
PGDATABASE=
```

> **If `DATABASE_URL` is missing, the service crashes immediately at startup.**
> This was the root cause of the May 2026 outage.

---

## Required Environment Variables (Railway)

All of these must be set in the Railway service before the app will start cleanly:

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Neon Console → Project → Connection string |
| `SESSION_SECRET` | Generate: `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI Platform |
| `OPENAI_BASE_URL` | Default: `https://api.openai.com/v1` |
| `VAPID_PUBLIC_KEY` | Generated once via `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Same generation as above |
| `VAPID_EMAIL` | `mailto:peacepad@peacepad.ca` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service Accounts → JSON key |

Optional but used by certain features:

| Variable | Purpose |
|----------|---------|
| `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` | Email sending |
| `ONTARIO_211_API_KEY` | v2 support discovery enrichment |
| `VITS_BASE_URL` | Voice/TTS service |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | SMS/Voice |

Full reference: see `.env.example` at repo root.

---

## API Routes

| Prefix | Description |
|--------|-------------|
| `GET /api/health` | Health check (used by Railway) |
| `GET /api/version` | Version info |
| `/api/*` | v1 — all existing endpoints |
| `/v2/*` | v2 conversation orchestrator (additive, v1 untouched) |

### v2 Key Endpoints
- `POST /v2/conversation/orchestrate` — main entry point
- `GET /v2/health`
- `POST /v2/router/intent`
- `POST /v2/modules/conflict-check`
- `POST /v2/modules/rewrite-message`
- `POST /v2/modules/support-discovery`

---

## Local Development

```bash
# 1. Copy env
cp .env.example .env
# Edit .env — set DATABASE_URL (Neon dev branch), SESSION_SECRET, etc.

# 2. Install
npm install

# 3. Sync DB schema
npm run db:push

# 4. Start dev server
npm run dev
```

Dev vs prod AI behaviour:
- `NODE_ENV !== production` AND `ALLOW_DEV_AI` not set → mock AI responses (free, fast)
- `NODE_ENV=production` → real OpenAI API

---

## Git & Deployment Flow

```
local branch → commit → git push → Railway auto-deploys @ftc/peacepad
```

Railway is linked to the GitHub repo and auto-deploys on push to the main branch.

For manual redeploy: `railway up --detach` from inside `C:\FTC HOLDING\APPS\peacepad`

---

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Service crashes at startup | Missing `DATABASE_URL` | Set it in Railway service env vars |
| 502 from `api.peacepad.ca` | Service crashed or not deployed | Check Railway dashboard + logs |
| Android "Failed to fetch" | API is down | Check `api.peacepad.ca/api/health` |
| Build fails on Railway | Railpack workspace detection issue | Check `package.json` has correct `"workspaces"` field |
| AI returns mocks in prod | `NODE_ENV` not set to `production` | Set in Railway env vars |

---

## History Note: Migration from Replit → Railway

The app was originally hosted on Replit (two Repls: dev + prod) with Replit-provisioned PostgreSQL and Neon for dev. In April/May 2026 it was migrated to Railway (`splendid-spirit` project). The DATABASE_URL from Neon must be manually set in Railway service env vars — Railway does not auto-provision it.
