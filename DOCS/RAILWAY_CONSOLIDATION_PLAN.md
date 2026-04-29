# Railway Consolidation Plan

**Final Infra State (2026-04-29):**
- All live backend and persistence infra is on Cloudflare Pages and Supabase.
- Railway is documentation-only; no pause, delete, or move actions are to be taken from this doc.
- See Garden and QA docs for proof of live deployment and persistence.

_Last updated: 2026-04-28_

**DECISION BANNER:**
No Railway service should be paused, deleted, or migrated from this document alone. Final cleanup requires Railway dashboard verification of domains, env vars, traffic, and latest deployments.

**Note:** 404 on `/api/health` does not equal outage unless the app is expected to expose that route. See Evidence column for details.

## 1. Executive Recommendation

Consolidate all live backend services to a single canonical Railway account and project per product (PeacePad, SayWetin, Dispatch). Keep all static/front-end sites on Cloudflare Pages. Migrate durable records (e.g., Garden quotes) to Supabase. Set Railway billing alerts and usage limits. Document canonical deployment and ownership. Only pause or remove duplicate services after verification.

## 2. Current Railway Inventory

| Railway Account/Workspace | Project | Service | Repo | Branch | Root Directory | Build Command | Start Command | Status | Latest Deploy | Railway URL | Custom Domain | Env Vars Present? | Classification | Evidence | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| enchanting-caring | ateam-api | ateam-api | APPS/ATEAM | main | APPS/ATEAM | npm run build | npm start | paused | unknown | https://ateam-api.enchanting-caring.up.railway.app | none | yes | ASSUMED | Not reachable, exceeded limits | Exceeded limits |
| enchanting-caring | sunny-acceptance | sunny-acceptance | unknown | main | unknown | unknown | unknown | paused | unknown | https://sunny-acceptance.enchanting-caring.up.railway.app | none | yes | ASSUMED | Not reachable, exceeded limits | Exceeded limits |
| enchanting-caring | dispatch-api | dispatch-api | APPS/dispatch | main | APPS/dispatch | npm run build | npm start | paused | unknown | https://dispatch-api.enchanting-caring.up.railway.app | none | yes | ASSUMED | Not reachable, exceeded limits | Exceeded limits |
| enchanting-caring | FTC-HOLDING | FTC-HOLDING | unknown | main | unknown | unknown | unknown | paused | unknown | https://ftc-holding.enchanting-caring.up.railway.app | none | yes | ASSUMED | Not reachable, exceeded limits | Exceeded limits |
| lively-simplicity | @ftc/peacepad | peacepad-api | APPS/peacepad | main | APPS/peacepad | npm run build:api | npm run start | online | recent | https://peacepad-api.lively-simplicity.up.railway.app | api.peacepad.ca | yes | ASSUMED | curl.exe -I https://peacepad-api.lively-simplicity.up.railway.app -> SSL trust failure (inconclusive); curl.exe -I https://api.peacepad.ca -> 404 (endpoint missing or unknown) | Canonical API host (historical) |
| lively-simplicity | @ftc/dispatch | dispatch-api | APPS/dispatch | main | APPS/dispatch | npm run build | npm start | online | recent | https://dispatch-api.lively-simplicity.up.railway.app | dispatch-api.unalabs.cloud | yes | ASSUMED | curl.exe -I https://dispatch-api.lively-simplicity.up.railway.app -> SSL trust failure (inconclusive); curl.exe -I https://dispatch-api.unalabs.cloud -> could not resolve host | Canonical API host (historical) |
| lively-simplicity | @ftc/ftc-site | ftc-site | APPS/ftc-site | main | APPS/ftc-site | npm run build | npm start | failed | recent | https://ftc-site.lively-simplicity.up.railway.app | none | yes | ASSUMED | Not reachable | Should move to Pages |
| lively-simplicity | ateam-platform | ateam-platform | APPS/ATEAM | main | APPS/ATEAM | npm run build | npm start | failed | recent | https://ateam-platform.lively-simplicity.up.railway.app | none | yes | ASSUMED | Not reachable | Not production |
| lively-simplicity | @ftc/peacepad-extension | peacepad-extension | APPS/peacepad-extension | main | APPS/peacepad-extension | npm run build | npm start | failed | recent | https://peacepad-extension.lively-simplicity.up.railway.app | none | yes | ASSUMED | Not reachable | Not production |
| splendid-spirit | @ftc/dispatch | dispatch-api | APPS/dispatch | main | APPS/dispatch | npm run build | npm start | online | recent | https://dispatch-api.splendid-spirit.up.railway.app | dispatch-api.unalabs.cloud | yes | ASSUMED | curl.exe -k -I https://dispatch-api.splendid-spirit.up.railway.app -> 404 (endpoint missing or unknown) | Canonical API host (candidate, should become single home after verification) |
| splendid-spirit | @ftc/peacepad | peacepad-api | APPS/peacepad | main | APPS/peacepad | npm run build:api | npm run start | online | recent | https://peacepad-api.splendid-spirit.up.railway.app | api.peacepad.ca | yes | ASSUMED | curl.exe -k -I https://peacepad-api.splendid-spirit.up.railway.app -> 404 (endpoint missing or unknown); curl.exe -I https://api.peacepad.ca -> 404 (endpoint missing or unknown) | Canonical API host (candidate) |
| splendid-spirit | @ftc/peacepad-extension | peacepad-extension | APPS/peacepad-extension | main | APPS/peacepad-extension | npm run build | npm start | failed | recent | https://peacepad-extension.splendid-spirit.up.railway.app | none | yes | ASSUMED | Not reachable | Not production |
| splendid-spirit | @ftc/ftc-site | ftc-site | APPS/ftc-site | main | APPS/ftc-site | npm run build | npm start | failed | recent | https://ftc-site.splendid-spirit.up.railway.app | none | yes | ASSUMED | Not reachable | Should move to Pages |
| splendid-spirit | saywetin-api | saywetin-api | APPS/saywetin | main | APPS/saywetin | Dockerfile | Dockerfile | online | recent | https://saywetin-api.splendid-spirit.up.railway.app | api.saywetin.app | yes | ASSUMED | curl.exe -k -I https://saywetin-api.splendid-spirit.up.railway.app -> 404 (endpoint missing or unknown); curl.exe -I https://api.saywetin.app -> 404 (endpoint missing or unknown) | Canonical API host (candidate) |


## 3. Canonical Railway Project/Account Recommendation

**Current split between splendid-spirit and lively-simplicity appears historical, not technically required.**

**Recommendation:**
- Migrate all production APIs to a single Railway project (likely splendid-spirit) after verifying domain and environment variable setup.
- All other projects/services are paused, failed, or legacy and should not be used for production.


## 4. Service Placement Matrix

| Service | Placement |
|---|---|
| PeacePad API | Railway (splendid-spirit, after verification) |
| SayWetin API | Railway (splendid-spirit, after verification) |
| Dispatch API | Railway (splendid-spirit, after verification) |
| PeacePad Frontend | Cloudflare Pages |
| SayWetin Frontend | Cloudflare Pages |
| Dispatch Frontend | Cloudflare Pages |
| FTC Site | Cloudflare Pages |
| Durable records | Supabase |
| ATEAM | Not production, do not consolidate |
| PeacePad Extension | Not production, do not consolidate |


## 5. What Should Stay on Railway
- PeacePad API (move to splendid-spirit if not already)
- SayWetin API (move to splendid-spirit if not already)
- Dispatch API (move to splendid-spirit if not already)

## 6. What Should Move to Cloudflare Pages
- All front-end/static sites: PeacePad, SayWetin, FTC Site, Dispatch

## 7. What Should Move to Supabase
- Durable records (e.g., Garden quotes, user data, analytics) should be migrated to Supabase, not Railway databases.


## 8. Duplicate/Paused/Broken Services
- enchanting-caring: all services paused (exceeded limits)
- lively-simplicity: multiple failed/legacy services (should be deleted after verification)
- splendid-spirit: only keep production APIs, others failed/legacy

## 8a. Do Not Pause Yet (Needs Verification)
- All services with ASSUMED classification above require live traffic/domain and environment variable verification before any pause or removal.
- Specifically: PeacePad API, SayWetin API, Dispatch API on both splendid-spirit and lively-simplicity.

## 9. Billing/Usage Risks
- Multiple paused/failed services indicate exceeded limits and risk of surprise billing if reactivated.
- Only keep production services online; set Railway billing alerts and usage limits.

## 10. Safe Consolidation Order
1. Inventory and document all services (done in this plan).
2. Migrate all static/front-end sites to Cloudflare Pages if not already.
3. Migrate durable data to Supabase.
4. Set billing alerts and usage limits in Railway.
5. After verification, pause or delete duplicate/legacy services.

## 11. Rollback Notes
- Do not delete any service until new canonical setup is verified live.
- Keep backups of all environment variables and deployment configs.
- If a migration fails, revert DNS and redeploy previous service.


## 12. Likely Canonical Target

**splendid-spirit** should become the single Railway production home for all backend APIs, provided:
- All custom domains (api.peacepad.ca, api.saywetin.app, etc.) are attached and verified
- All required environment variables are present by name
- All API endpoints return expected responses (even if /api/health is not implemented)

**Migration path:**
1. Inventory and verify all domains and env vars on splendid-spirit
2. Migrate any remaining production API from lively-simplicity to splendid-spirit
3. Update DNS and redeploy as needed
4. Only after verification, pause or remove legacy/duplicate services


**What can stay on Cloudflare/Supabase:**
- All static/front-end sites (Cloudflare Pages)
- Durable records and analytics (Supabase)

## Owner Access Needed
- Railway admin access to all three workspaces (enchanting-caring, lively-simplicity, splendid-spirit)
- Cloudflare admin access for domain and Pages setup
- Supabase admin access for data migration


## Open Questions
- Are all custom domains attached and verified in Railway and Cloudflare?
- Are all required environment variables present by name in the Railway project?
- Are all API endpoints returning expected responses (not just /api/health)?
- Is there a plan for legacy/archived data in paused services?
- Who is the current owner/contact for each Railway workspace?
- BLOCKER: Cloudflare Email Routing Rules permission for unalabs.cloud still returns 403; cannot create forwarding rule for hello@unalabs.cloud to fefiuvwere@gmail.com. Manual dashboard setup or additional API permission required.
