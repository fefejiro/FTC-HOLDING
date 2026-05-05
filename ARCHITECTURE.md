# FTC HOLDING — Architecture

Last updated: 2026-05-05

This document describes the current technical architecture of the FTC HOLDING monorepo.
For project strategy, see `PROJECT_BRIEF.md`. For deployment specifics, see `DEPLOYMENT.md`.

---

## Monorepo Layout

```
FTC-HOLDING/
├── APPS/                   # All product applications (one folder per app)
├── PACKAGES/               # Shared internal packages (npm workspaces)
├── workers/                # Cloudflare Worker projects
├── DOCS/                   # Operational docs, runbooks, handovers
├── scripts/                # Repo-level automation scripts
├── tests/                  # Root-level cross-app test suites
├── supabase/               # Supabase config and migrations
└── wrangler.toml           # Root Cloudflare Workers config
```

Root uses npm workspaces covering `APPS/*` and `PACKAGES/*`.

---

## App Inventory

| Folder | App | Framework | Runtime |
|--------|-----|-----------|---------|
| `APPS/una-labs-site` | Una Labs marketing + intake | Next.js 14 | Cloudflare Pages |
| `APPS/ftc-site` | FTC/OG Trades shell site | Next.js 14 | Cloudflare Pages |
| `APPS/peacepad` | PeacePad web + API | Vite (frontend) + Node.js (API) | CF Pages + Railway |
| `APPS/peacepad-extension` | PeacePad Chrome extension | Vite | Chrome Web Store |
| `APPS/saywetin` | SayWetin web + API | Vite (frontend) + Node.js (API) | CF Pages + Railway |
| `APPS/saywetin-native` | SayWetin React Native app | Expo (bare) | EAS / Play Store |
| `APPS/saywetin-extension` | SayWetin Chrome extension | Vite | Chrome Web Store |
| `APPS/dispatch` | Dispatch ops tool | Node.js | Railway |
| `APPS/og-trades-academy` | OG Trades Academy | Next.js | Cloudflare Pages |
| `APPS/ATEAM` | ATEAM AI agent OS | Node.js | Railway (paused) |
| `APPS/anion` | Anion class app (web) | Next.js | TBD |
| `APPS/anion-mobile` | Anion mobile app | Expo | TBD |
| `APPS/gidi-dashers` | Gidi Dashers PWA + TWA | React / Vite | CF Pages + Play Store |
| `APPS/gidi-dashers-portal` | Gidi Dashers admin portal | React | CF Pages |

---

## Shared Packages

All packages are under `PACKAGES/` and consumed via npm workspace file-protocol links.

| Package | npm scope | Purpose |
|---------|-----------|---------|
| `auth` | `@ftc/auth` | Auth primitives wrapping Supabase auth API |
| `supabase` | `@ftc/supabase` | Supabase client factory (browser + server) |
| `config` | `@ftc/config` | Shared env/config utilities |
| `types` | `@ftc/types` | Shared TypeScript types |
| `logger` | `@ftc/logger` | Shared logging helpers |
| `peacepad-sdk` | `@ftc/peacepad-sdk` | PeacePad API client |
| `anion-shared` | `@ftc/anion-shared` | Anion shared logic |
| `anion-types` | `@ftc/anion-types` | Anion TypeScript types |

### Auth / Supabase Pattern (Phase 2)

- `@ftc/supabase` exposes `createBrowserClient()` and `createServerClient(cookies?)`.
- `@ftc/auth` provides `signInWithOtpEmail`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`, `requireUser`, `isAuthed`.
- Packages are runtime-agnostic. UI glue (React hooks, server actions, route guards) stays in each `APPS/*` directory.
- Only public keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`) are safe in clients.
- Service-role keys are server-only and must never be committed.

---

## Cloudflare Workers

| Worker folder | Purpose |
|---------------|---------|
| `workers/stripe-api` | Stripe payments + Spark AI chat endpoints |
| `workers/peacepadai` | PeacePad AI features |
| `workers/dispatch-edge` | Dispatch edge routing |
| `workers/ateam-edge` | ATEAM edge layer |
| `workers/ateam-ops` | ATEAM ops automation |

Workers are configured per-project using `wrangler.toml` at either root or worker directory level.

---

## Infrastructure Stack

| Layer | Provider | Notes |
|-------|---------|-------|
| Frontend hosting | Cloudflare Pages | Git-push deploys from `main` |
| Backend hosting | Railway (`splendid-spirit` project) | Docker + Node services |
| Database | Supabase | Shared project; per-app schemas |
| Auth | Supabase Auth | Per-app, via `@ftc/auth` |
| Email | Resend + custom SMTP | Per-app config |
| Payments | Stripe | Managed via `workers/stripe-api`; see `DOCS/stripe-setup-handover.md` |
| Domains | Cloudflare DNS | See `DOCS/DOMAIN_AND_OWNERSHIP_MAP.md` |
| Mobile | EAS + Play Store | SayWetin (Android live), Anion (TBD) |

---

## Deployment Flow

```
git push origin main
        │
        ├──► Cloudflare Pages (frontend build + deploy)
        │        Runs app-specific build command
        │        Output: static assets served at app domain
        │
        └──► Railway (backend build + deploy)
                 Runs Dockerfile or Node start command
                 Output: API service at api.<domain>
```

Apps with both frontend and backend components deploy independently. Frontend and API are always separate Railway/CF services.

---

## Security Boundaries

- No secrets in source code. All secrets in environment variables.
- No service-role Supabase keys in client bundles.
- `npm run audit:secrets` detects common secret patterns in the codebase.
- See `DOCS/SECURITY_ROTATION_CHECKLIST.md` for rotation procedures.
- See `AI_GUARDRAILS.md` for AI agent constraints.

---

## Known Architecture Decisions Pending

1. **ATEAM git tracking:** APPS/ATEAM is currently untracked from root repo. Decision pending: keep in monorepo (Option A) or move to its own repo (Option B). Recommendation in `FTC_MASTER.md`: Option A.
2. **OG Trades Academy:** Domain live but no confirmed build target yet.
3. **GuardSignal:** No folder in `APPS/`. Do not create until core loop is validated.
4. **Spark AI kill switch:** `SPARK_ENABLED=1` env var controls Spark AI endpoints in `workers/stripe-api`.

---

*For detailed deployment commands, see `DEPLOYMENT.md`.
For project strategy and priority, see `PROJECT_BRIEF.md` and `FTC_MASTER.md`.
For operational runbooks, see `DOCS/RUNBOOK.md`.*
