# Dispatch - Project Context

**Purpose:** Roadside assistance dispatch platform. Ottawa live. GTA built into pipeline.

**Live URLs:**
- Public front door: https://dispatch.unalabs.cloud
- Driver intake: https://dispatch.unalabs.cloud/request
- Operator console: https://dispatch.unalabs.cloud/operator
- Admin (private): https://dispatch-admin.unalabs.cloud/admin
- Health check: https://dispatch.unalabs.cloud/health
- Railway fallback: https://dispatch-api-production.up.railway.app/health

**Status:** Live in production. Reliability hardening sprint in progress (April 2026).

**Tech Stack:**
- Frontend: React + Vite (Cloudflare Pages)
- Backend: Node.js + Express, Railway Hobby Plan (active)
- Database: Supabase (Postgres via Drizzle ORM)
- Real-time: SSE (Server-Sent Events) + Web Push to operators
- Mobile: Capacitor Android (Play Store)
- Tests: Playwright E2E

**Incident Sources (in priority order):**
1. Ontario 511 official feed — province-wide backbone
2. City of Ottawa traffic events feed — Ottawa-only
3. OC Transpo service alerts — Ottawa-only transit
4. TomTom traffic — commercial fallback
5. Waze via OpenWebNinja/RapidAPI — experimental, rate-limited

**Current Paying Clients:** Kevin, Cheta (Ottawa operators)

**Monthly Burn:** Railway Hobby (~$5 USD) + TomTom/Waze API costs

**Next Steps (Reliability Sprint):**
1. Run Playwright smoke test against production, fix any failures
2. Harden operator UX for degraded source states
3. Fix Railway cold-start causing 502s on first request
4. Add Playwright test for driver intake form
5. Verify admin source health dashboard is accurate
