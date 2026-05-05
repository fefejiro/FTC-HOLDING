# FTC HOLDING — Open Tasks

Last updated: 2026-05-05

This file tracks open, issue-ready tasks across all FTC HOLDING projects.
Each item is written to be directly usable as a GitHub Issue.

For priority context, see `ROADMAP.md`. For project status, see `DOCS/FTC_PROJECT_LEDGER.md`.

---

## Infrastructure / Repo Hygiene

- [ ] **[INFRA] Decide ATEAM git tracking** — `APPS/ATEAM` is currently untracked from the root repo. Options: (A) `git add APPS/ATEAM` and commit, or (B) create its own git repo. Recommendation: Option A. Blocking: any CI/CD automation for ATEAM.

- [ ] **[INFRA] Audit and clean up `tmpclaude-*` worktree directories** — 70+ directories in `APPS/ATEAM/` and 24+ in `APPS/ATEAM/Server/` are leftover from Claude Code isolated sessions. Safe to delete. Run from `APPS/ATEAM/`: `Get-ChildItem -Directory -Filter "tmpclaude-*" | Remove-Item -Recurse -Force`

- [ ] **[INFRA] Unify Stripe worker webhook architecture** — `workers/stripe-api` webhook setup is documented inconsistently across `DOCS/`. Audit all references and produce a single canonical webhook setup doc before further Stripe changes.

- [ ] **[INFRA] Create `APPS/guardsignal` placeholder** — Once GuardSignal core loop is validated on paper, create the app folder with a README. Do not build any code until validation is complete.

- [ ] **[INFRA] Scaffold `APPS/og-trades-academy` folder** — OG Trades Academy needs a proper app scaffold if it is not yet present. Confirm domain is live first.

---

## Dispatch

- [ ] **[DISPATCH] Resolve `DATABASE_URL` railway env** — Production Railway service for Dispatch does not have a confirmed `DATABASE_URL`. Owner must set this in the Railway dashboard. Blocking: all Dispatch functionality.

- [ ] **[DISPATCH] Verify token-flow end-to-end** — After env fix, run the Dispatch E2E smoke test: `cd APPS/dispatch && npm run test:e2e:road-alerts`. Document pass/fail result in `DOCS/FTC_PROJECT_LEDGER.md`.

- [ ] **[DISPATCH] Resolve 403 access audit findings** — Review `DOCS/DISPATCH_403_ACCESS_AUDIT.md` and act on any unresolved items. Requires owner review.

---

## PeacePad

- [ ] **[PEACEPAD] Run conversion audit** — Identify where users drop off in the PeacePad signup/onboarding flow. Document findings and propose minimum viable retention improvements.

- [ ] **[PEACEPAD] Confirm first ARR milestone** — No confirmed paying customers despite live product. Set a revenue checkpoint target and track it in `FTC_MASTER.md`.

- [ ] **[PEACEPAD] Android release verification** — Verify latest Play Store build is current and matches Railway API version. See `DOCS/PEACEPAD_RELEASE_POLICY.md`.

---

## SayWetin

- [ ] **[SAYWETIN] Fix API 404s on Railway** — API endpoints are returning 404. Root cause: Railway env/routing misconfiguration. Owner must verify `PUBLIC_BASE_URL` and `DEPLOY_ROLE=api` are set in the Railway service. See `DOCS/SAYWETIN_SPLIT_DEPLOY_RUNBOOK.md`.

- [ ] **[SAYWETIN] Run real-device Android QA** — After API fix, run full E2E QA on a real Android device. Document result in `DOCS/SAYWETIN_STATUS.md`.

- [ ] **[SAYWETIN] Unblock iOS distribution** — iOS App Store review is blocked. Investigate: (A) resolve App Store review rejection, or (B) explore TestFlight for limited distribution.

- [ ] **[SAYWETIN] Confirm `saywetin.app` domain routing** — Verify that `saywetin.app` and `www.saywetin.app` both route correctly (canonical redirect `www` -> apex). Test both manually after API fix.

---

## OG Trades Academy

- [ ] **[OG-TRADES] Confirm domain HTTP 200** — Owner must manually verify `ogtradesacademy.com` returns HTTP 200. No deploy steps should proceed until this is confirmed.

- [ ] **[OG-TRADES] Set webhook env vars** — `OG_TRADES_LEADS_WEBHOOK_URL` and `OG_TRADES_CONFIRMATION_WEBHOOK_URL` must be set in Railway before leads can be delivered or users notified. Blocking: revenue.

- [ ] **[OG-TRADES] Run E2E smoke test** — After domain and webhooks are confirmed, run: `npm run smoke:prod` from `APPS/og-trades-academy`. Document result.

---

## Una Labs Site

- [ ] **[UNALABS] Activate Spark AI** — `workers/stripe-api` exposes `/api/spark/chat`, `/api/spark/create-pass`, `/api/spark/verify-pass` behind `SPARK_ENABLED=1`. Set env var in Cloudflare Worker secrets once webhook architecture is resolved.

- [ ] **[UNALABS] Record demo videos** — Demo page has no recordings. Record a walkthrough for at least one product (Dispatch or PeacePad) and wire it into `APPS/una-labs-site` via `scripts/set-howitworks-videos.mjs`.

- [ ] **[UNALABS] First paying customer checkpoint** — No customers yet. Define the minimum viable intake flow and run through it manually. Set a target date.

---

## Garden Cleaners (Client)

- [ ] **[GARDEN] Complete final acceptance walk-through** — Client must review the portal and sign off. Record the signoff timestamp in `DOCS/GARDEN_PRODUCTION_HANDOFF_GATE.md`.

- [ ] **[GARDEN] Archive handoff packet** — Once acceptance is complete, move all Garden Cleaners handover docs to `DOCS/archive/`.

---

## ATEAM

- [ ] **[ATEAM] Phase 1 capability decoupling** — Decouple the ElevenLabs integration, workflow engine, and event log so each can be tested independently. Do not expand ATEAM's surface area before this is done.

- [ ] **[ATEAM] Harden bridge API auth** — `Server/bridge.js` must require and validate `ATEAM_KEY` on every request before being exposed to any non-LAN network. Verify auth is enforced before enabling remote tunnel.

- [ ] **[ATEAM] Wire Telegram gateway bot token** — `APPS/ATEAM/telegram-gateway/.env` is missing `TELEGRAM_BOT_TOKEN`. Owner must obtain token from BotFather and set it.

---

## Anion Class App

- [ ] **[ANION] Wire Supabase auth** — Auth flow is not yet connected. Use `@ftc/auth` package. Implement sign-up, sign-in, and session guard before any other feature work.

- [ ] **[ANION] Implement tutor discovery** — Search and filter UI for finding tutors. Requires auth to be working first.

- [ ] **[ANION] Implement booking flow** — Calendar + Stripe payment for session booking. Requires tutor discovery to be working.

---

## Gidi Dashers

- [ ] **[GIDI] Complete admin portal** — `APPS/gidi-dashers-portal` is in progress. Identify remaining work and set a completion target.

- [ ] **[GIDI] Verify TWA Play Store listing** — Confirm the TWA is live on the Play Store under the correct package name and that the Digital Asset Links file is correctly deployed.

---

*Update this file as tasks are completed or new tasks are discovered.
Convert to GitHub Issues when ready for formal tracking.*
