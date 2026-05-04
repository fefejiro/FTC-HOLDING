# Tow Signal - Project Context

**Purpose:** Roadside assistance dispatch platform. Public brand: Tow Signal. Internal runtime: Dispatch. Ottawa live. GTA built into pipeline.

**Live URLs:**
- Public front door: https://dispatch.unalabs.cloud
- Driver intake: https://dispatch.unalabs.cloud/request
- Operator console: https://dispatch.unalabs.cloud/operator
- Admin (private): https://dispatch-admin.unalabs.cloud/admin
- Health check: https://dispatch.unalabs.cloud/health
- Railway fallback: https://dispatch-api-production.up.railway.app/health

**Status:** Live in production. Reliability hardening sprint in progress. Rebrand to Tow Signal selected on 2026-05-04.

**Tech Stack:**
- Frontend: React + Vite
- Backend: Node.js + Express, Railway Hobby Plan (active)
- Edge: Cloudflare Worker fronts the public branded path
- Database: Supabase (Postgres via Drizzle ORM)
- Real-time: SSE (Server-Sent Events) + Web Push to operators
- Mobile: Capacitor Android (Play Store path to be updated to Tow Signal branding)
- Tests: Playwright E2E

**Incident Sources (in priority order):**
1. Ontario 511 official feed
2. City of Ottawa traffic events feed
3. OC Transpo service alerts
4. TomTom traffic
5. Waze via OpenWebNinja/RapidAPI

**Current Paying Clients:** Kevin, Cheta (Ottawa operators)

**Monthly Burn:** Railway Hobby (~$5 USD) + TomTom/Waze API costs

**Naming Rule:**
- Say **Tow Signal** in public-facing docs, screens, demos, and marketplace materials.
- Keep **Dispatch** for repo paths, service IDs, worker names, and technical runtime references until a deeper refactor is scheduled.

**Next Steps (Rebrand + Reliability Sprint):**
1. Repair production routing so public Tow Signal loads again
2. Update public UI copy, metadata, and marketplace naming
3. Harden operator UX for degraded source states
4. Run Playwright smoke test against production and fix failures
5. Add a cleaner premium Tow Signal visual system before the next app-store push
