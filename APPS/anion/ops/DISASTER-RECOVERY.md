# Anion Class App — Disaster Recovery

**Version:** 1.0  
**Last Updated:** 2026-05-07  
**Owner:** Platform Operator / Una Labs  
**Review Cycle:** Quarterly

---

## Recovery Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | < 2 hours | Time to restore service after a confirmed outage |
| **RPO** (Recovery Point Objective) | < 1 hour | Maximum acceptable data loss window |

These targets apply to the primary production infrastructure (Cloudflare Pages/Workers + Supabase). Third-party dependencies (Stripe, Daily.co) are managed by their own SLAs.

---

## Infrastructure Map

| Component | Provider | Recovery Owner |
|-----------|----------|---------------|
| Web app / Edge functions | Cloudflare Pages + Workers | Operator |
| Database + Auth | Supabase (`aaaextkrfoqomzmjjkxe`) | Operator |
| Payment processing | Stripe | Stripe (external SLA) |
| Video classroom | Daily.co | Daily.co (external SLA) |
| Source of truth / code | GitHub (`fefejiro/FTC-HOLDING`) | Operator |

---

## Backup Strategy

### Database (Supabase)

Supabase provides automated daily backups on paid plans.

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|---------|
| Automated daily snapshot | Daily | 7 days (Pro) / 30 days (Team+) | Supabase-managed |
| Manual export | Before each migration | Indefinite | Operator S3 / local |

**Verify backup status:**

1. Open [Supabase Dashboard → Project Settings → Backups](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/general)
2. Confirm last backup timestamp is within the last 24 hours
3. Test restore to a staging project quarterly (see Section: Restore Runbook)

**Manual export before migrations:**

```bash
# Export full schema + data
pg_dump "postgresql://postgres:[password]@db.aaaextkrfoqomzmjjkxe.supabase.co:5432/postgres" \
  --no-acl --no-owner -Fc -f anion_backup_$(date +%Y%m%d).dump
```

> Store the dump file in a secure, off-platform location (e.g., encrypted S3 bucket). Do **not** commit it to git.

### Application Code

- Source of truth: GitHub repo `fefejiro/FTC-HOLDING`, branch `main`
- Previous deployments are snapshotted as Cloudflare deployment versions (accessible via dashboard)
- Rollback to any prior Cloudflare deployment takes < 5 minutes (see Section: Rollback Runbook)

---

## Restore Runbook

### Scenario 1 — Database partial data loss

1. Identify the timestamp of the last known-good state
2. In [Supabase Dashboard → Backups](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/general), select the target backup
3. Click **Restore** to initiate point-in-time restore (PITR) or snapshot restore
4. Estimated restore time: 15–60 minutes depending on database size
5. After restore, verify:
   - `profiles` table row count matches expectation
   - `bookings` table integrity (no orphaned foreign keys)
   - `subscriptions` table matches active Stripe subscriptions
6. Re-enable application traffic

### Scenario 2 — Full database loss (corrupt / dropped project)

1. Create a new Supabase project in the same region
2. Apply migrations in order from `supabase/migrations/`:
   ```bash
   # From APPS/anion/
   node scripts/run-migrations.cjs
   ```
3. Restore latest backup dump:
   ```bash
   pg_restore -d "postgresql://postgres:[password]@db.[new-ref].supabase.co:5432/postgres" \
     anion_backup_[date].dump
   ```
4. Update `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Workers environment
5. Redeploy app:
   ```bash
   npm run build:worker && npm run deploy:worker
   ```
6. Test auth flow (magic link) and confirm sessions are valid

### Scenario 3 — Cloudflare Workers deployment failure

1. Open [Cloudflare Dashboard → Workers & Pages → anion → Deployments](https://dash.cloudflare.com)
2. Identify the last stable deployment
3. Click **Rollback to this deployment**
4. Estimated time: < 5 minutes global propagation
5. Verify health endpoint: `curl https://your-production-domain.com/api/health`

### Scenario 4 — Stripe webhook failure

Missed webhooks do not cause data loss — Stripe retries failed webhooks for up to 72 hours.

1. In [Stripe Dashboard → Webhooks → anion endpoint](https://dashboard.stripe.com/webhooks), check failed event log
2. For each failed event, click **Resend**
3. If the endpoint is permanently unreachable, investigate Cloudflare Worker logs
4. Subscription sync can also be reconciled manually:
   ```bash
   # Fetch current subscription from Stripe and update DB
   # (Placeholder: add reconciliation script to scripts/)
   ```

---

## Incident Response

### Severity Levels

| Level | Definition | Response Time |
|-------|-----------|--------------|
| P1 — Critical | Complete service outage or data breach | Immediate (< 15 min) |
| P2 — High | Core feature unavailable (auth, billing, classroom) | < 1 hour |
| P3 — Medium | Degraded performance or non-critical feature failure | < 4 hours |
| P4 — Low | Cosmetic issue or minor edge-case failure | Next business day |

### Response Steps

1. **Detect** — Alert fires (see MONITORING-ALERTS.md) or user reports issue
2. **Triage** — Assign severity level; identify affected component
3. **Communicate** — Notify stakeholders (client contact + team lead) within 15 minutes of P1/P2
4. **Contain** — Roll back deployment or disable affected feature route if needed
5. **Restore** — Follow relevant restore runbook above
6. **Verify** — Run smoke checklist (`ops/M5-SMOKE-TEST-CHECKLIST.md`)
7. **Post-mortem** — Document root cause, timeline, and preventive action within 48 hours of P1/P2

### Communication Template (P1/P2)

```
INCIDENT: [Short description]
Severity: P[1/2]
Started: [ISO timestamp]
Affected: [Components]
Status: Investigating / Mitigating / Resolved
Next update: [Time]
Owner: [Name]
```

---

## External Dependency SLAs

| Service | Published SLA | Status Page |
|---------|--------------|-------------|
| Supabase | 99.9% (Pro plan) | https://status.supabase.com |
| Stripe | 99.99% | https://status.stripe.com |
| Daily.co | 99.9% | https://status.daily.co |
| Cloudflare | 99.99% | https://www.cloudflarestatus.com |

---

## Quarterly DR Test

Run the following each quarter:

- [ ] Verify Supabase backup timestamp is current
- [ ] Perform test restore to a staging Supabase project and confirm row counts match
- [ ] Trigger a Cloudflare deployment rollback in staging
- [ ] Resend one historical Stripe webhook event and confirm subscription sync
- [ ] Update this document with test date and result

**Last tested:** [Insert date]  
**Result:** [Pass / Fail / Issues found]

---

## Related Docs

- [CLIENT-HANDOVER.md](./CLIENT-HANDOVER.md)
- [MONITORING-ALERTS.md](./MONITORING-ALERTS.md)
- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
- [M5-SMOKE-TEST-CHECKLIST.md](./M5-SMOKE-TEST-CHECKLIST.md)
