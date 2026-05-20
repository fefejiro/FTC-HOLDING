# Anion Class App — Monitoring & Alerts

**Version:** 1.0  
**Last Updated:** 2026-05-07  
**Owner:** Platform Operator / Una Labs  
**Review Cycle:** Monthly

---

## Overview

This document defines the metrics, alert thresholds, routing, and ownership for Anion production monitoring.

**Monitoring stack (current):** Cloudflare Analytics + Supabase Dashboard (manual review)  
**[Placeholder: Add Datadog / Grafana / Better Uptime / Uptime Robot integration when budget allows]**

---

## Key Metrics

### Application Health

| Metric | Description | Warning Threshold | Critical Threshold |
|--------|-------------|------------------|--------------------|
| `/api/health` uptime | Edge health check endpoint availability | < 99% in 1h | Any 5xx for > 5 min |
| `/api/status` response time | Status endpoint P99 latency | > 500ms | > 2000ms |
| Homepage response time | P95 page load at edge | > 1500ms | > 5000ms |
| Worker CPU time | Cloudflare Worker CPU per request | > 30ms P95 | > 50ms P95 |

### Auth

| Metric | Description | Alert Condition |
|--------|-------------|----------------|
| Google OAuth redirect success rate | % of Google sign-in attempts that reach a valid session | < 95% over 15 min |
| Auth callback error rate | `/auth/callback` 4xx/5xx after OAuth return | > 5% in 5 min |
| Session creation failures | Supabase auth/session errors after Google sign-in | > 10 in 5 min |

### Bookings

| Metric | Description | Alert Condition |
|--------|-------------|----------------|
| Booking creation errors | `POST /api/bookings` 5xx rate | > 2% in 10 min |
| Booking status staleness | Bookings stuck in `pending` for > 48h | Count > 10 |

### Billing (Stripe)

| Metric | Description | Alert Condition |
|--------|-------------|----------------|
| Checkout session errors | `POST /api/billing/checkout` 5xx | Any in 5 min |
| Webhook processing errors | `POST /api/webhooks/stripe` 4xx/5xx | Any consecutive failure |
| Subscription sync lag | Time between Stripe event and DB update | > 5 minutes |
| Failed payment rate | Stripe payment failures | > 5% of attempts |

### Classroom (Daily.co)

| Metric | Description | Alert Condition |
|--------|-------------|----------------|
| Room creation errors | `POST /api/daily/room` 5xx | > 2% in 10 min |
| Join failures | Client-side room join error events | > 5 in 10 min |
| Daily.co API availability | External dependency | See https://status.daily.co |

### Database (Supabase)

| Metric | Description | Alert Condition |
|--------|-------------|----------------|
| Query latency P95 | Supabase DB query time | > 500ms P95 over 5 min |
| Connection pool usage | Active connections / pool limit | > 80% |
| RLS policy errors | Row-level security denials in logs | Spike > baseline + 50% |
| Backup freshness | Hours since last automated backup | > 25h |

---

## Alert Routing

| Alert | Channel | Primary Owner | Escalation |
|-------|---------|--------------|-----------|
| P1 — Service down | SMS + Email + Slack `#anion-ops` | Platform Operator | Client contact within 15 min |
| P2 — Core feature failure | Email + Slack `#anion-ops` | Platform Operator | Client contact within 1 hour |
| P3 — Degraded performance | Slack `#anion-ops` | Platform Operator | Review next business day |
| P4 — Low severity | Slack `#anion-ops` (daily digest) | Platform Operator | Backlog |
| Stripe webhook failure | Email to operator | Platform Operator | Investigate within 1 hour |
| Supabase backup staleness | Email to operator | Platform Operator | Investigate within 2 hours |

**[Placeholder: Configure actual alert destinations in monitoring tool — Slack webhook URL, PagerDuty/OpsGenie integration, email list]**

---

## Monitoring Setup Guide

### 1. Cloudflare Analytics (included)

- Navigate to [Cloudflare Dashboard → Workers & Pages → anion → Analytics](https://dash.cloudflare.com)
- Review: requests, error rates, CPU time per route
- Set up [Cloudflare Notifications](https://dash.cloudflare.com/profile/notifications) for Worker errors

### 2. Health Endpoint Uptime Check

Configure an external uptime monitor (e.g., Better Uptime, UptimeRobot, Freshping — free tiers available) to ping:

```
GET https://your-production-domain.com/api/health
Expected: 200 { "ok": true }
Check interval: 1 minute
Alert after: 2 consecutive failures
```

### 3. Supabase Dashboard Monitoring

- [Supabase Dashboard → Reports](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/reports) — query latency, auth events, API request volume
- Enable email alerts for project health anomalies in Project Settings

### 4. Stripe Radar & Webhooks

- [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) — review delivery logs
- [Stripe Dashboard → Radar](https://dashboard.stripe.com/radar) — fraud monitoring (included on paid plans)
- Enable Stripe email notifications for failed webhook deliveries

### 5. Daily.co Usage Dashboard

- [Daily.co Dashboard → Analytics](https://dashboard.daily.co/analytics) — participant counts, room errors
- Subscribe to [https://status.daily.co](https://status.daily.co) email alerts for service incidents

---

## Log Sources

| Log Source | Access | Retention |
|-----------|--------|-----------|
| Cloudflare Worker logs | Cloudflare Dashboard → Workers → Logs | Real-time + 7 days |
| Next.js edge function errors | Cloudflare Dashboard → Pages → Functions | Real-time + 7 days |
| Supabase API logs | Supabase Dashboard → Logs → API | 7 days (Pro plan) |
| Supabase Auth logs | Supabase Dashboard → Logs → Auth | 7 days (Pro plan) |
| Stripe event log | Stripe Dashboard → Developers → Events | 30 days |
| Daily.co logs | Daily.co Dashboard → Developers | 7 days |

---

## Runbook Index

| Scenario | Runbook |
|---------|---------|
| Full outage | [DISASTER-RECOVERY.md §Scenario 3](./DISASTER-RECOVERY.md) |
| Database loss | [DISASTER-RECOVERY.md §Scenario 1–2](./DISASTER-RECOVERY.md) |
| Stripe webhook failure | [DISASTER-RECOVERY.md §Scenario 4](./DISASTER-RECOVERY.md) |
| Smoke test baseline | [M5-SMOKE-TEST-CHECKLIST.md](./M5-SMOKE-TEST-CHECKLIST.md) |
| Production readiness gates | [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) |

---

## Ownership Matrix

| Area | Primary Owner | Backup |
|------|--------------|--------|
| Platform uptime | Platform Operator | [Insert backup contact] |
| Database health | Platform Operator | Supabase support |
| Billing / Stripe | Platform Operator | Stripe support |
| Classroom / Daily | Platform Operator | Daily.co support |
| Security incidents | Platform Operator | [Insert legal/compliance contact] |

**Primary operator contact:** [operator@yourdomain.com]  
**Escalation contact:** [Insert client contact email and phone]

---

## Monthly Review Checklist

- [ ] Review Cloudflare error rate trend for the past 30 days
- [ ] Check Supabase query latency P95 trend
- [ ] Confirm all Stripe webhooks delivered successfully
- [ ] Verify Supabase backup is current
- [ ] Review any P1/P2 incidents from the month and confirm post-mortems are filed
- [ ] Update alert thresholds if baseline metrics have shifted significantly

---

## Related Docs

- [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md)
- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
- [CLIENT-HANDOVER.md](./CLIENT-HANDOVER.md)
- [M5-SMOKE-TEST-CHECKLIST.md](./M5-SMOKE-TEST-CHECKLIST.md)
