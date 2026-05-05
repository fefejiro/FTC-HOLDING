# FTC HOLDING — Roadmap

Last updated: 2026-05-05

This document captures the current strategic roadmap for FTC Holding / Una Labs products.
Priority is revenue-first. Do not move to a lower-priority project while a higher one has an active blocker.

For daily status and blockers, see `DOCS/FTC_PROJECT_LEDGER.md`.
For architecture context, see `ARCHITECTURE.md`.

---

## Priority Order

1. **Dispatch** — Live with paying clients. Any regression is a revenue event.
2. **PeacePad** — Live. Path to first ARR depends on conversion audit.
3. **OG Trades Academy** — Pre-launch. Revenue-ready once domain/webhooks are confirmed.
4. **ATEAM** — Internal. Capability decoupling before any external exposure.
5. **SayWetin** — API on HOLD. iOS blocked. Android live but unverified.
6. **Gidi Dashers** — Active. TWA on Play Store. Portal in progress.
7. **Anion Class App** — Foundation scaffold. Auth and booking flow not yet wired.
8. **GuardSignal** — Pre-build validation only. No code until core loop is validated.

---

## Now (Current Sprint)

### Dispatch

- [ ] Resolve `DATABASE_URL` and runtime env on Railway
- [ ] Verify token-flow end-to-end in production
- [ ] Complete access audit review (see `DOCS/DISPATCH_403_ACCESS_AUDIT.md`)
- [ ] Run smoke test: `cd APPS/dispatch && npm run test:e2e:road-alerts`

### PeacePad

- [ ] Run conversion audit: identify drop-off points in signup and onboarding flow
- [ ] Review retention metrics (see `scripts/update-peacepad-weekly-metrics.mjs`)
- [ ] Verify production health: `npm run verify:peacepad:prod`

### OG Trades Academy

- [ ] Confirm `ogtradesacademy.com` returns HTTP 200 (manual owner check)
- [ ] Set `OG_TRADES_LEADS_WEBHOOK_URL` in Railway env
- [ ] Set `OG_TRADES_CONFIRMATION_WEBHOOK_URL` in Railway env
- [ ] Run E2E smoke test against live URL

---

## Next (Queued)

### SayWetin

- [ ] Resolve API 404s — Railway env/routing configuration
- [ ] Run real-device QA on Android (post-API fix)
- [ ] Confirm `saywetin.app` domain routing
- [ ] Unblock iOS (App Store review or alternative distribution)

### Una Labs Site

- [ ] Finalize Stripe worker webhook architecture (currently inconsistent across docs)
- [ ] Activate Spark AI chat (`SPARK_ENABLED=1`) once architecture is confirmed
- [ ] Run portfolio E2E: `npm run qa:portfolio:e2e`

### Garden Cleaners (Client)

- [ ] Complete owner/client acceptance walk-through
- [ ] Record signoff
- [ ] Archive handoff packet to `DOCS/archive/`

---

## Later (Backlog)

### ATEAM

- [ ] Decide git tracking: keep in monorepo (recommended) or move to own repo
- [ ] Phase 1 capability decoupling (decouple ElevenLabs + workflow engine from bridge)
- [ ] Harden bridge API auth before any external exposure

### Anion Class App

- [ ] Wire Supabase auth into web app (`APPS/anion`)
- [ ] Implement tutor discovery and booking flow
- [ ] Connect Stripe for session payments
- [ ] Wire Daily React for live video sessions

### Gidi Dashers

- [ ] Complete admin portal (`APPS/gidi-dashers-portal`)
- [ ] Verify TWA Play Store listing is live

### GuardSignal

- [ ] Validate core product loop on paper before any code
- [ ] Create `APPS/guardsignal` folder only after validation is complete

---

## Ongoing (Always Active)

- `npm run audit:secrets` — daily secrets audit
- `npm run qa:portfolio:e2e` — weekly portfolio E2E sweep
- `npm run metrics:peacepad:weekly` — weekly PeacePad metrics update
- Monitor Railway dashboards for both live services (Dispatch + PeacePad)
- Keep `DOCS/FTC_PROJECT_LEDGER.md` current after each sprint

---

*This roadmap is maintained manually. Update it when sprint priorities change.
Last reviewed: 2026-05-05.*
