# Anion Architecture Overview

## Stack
- Web: Vite + React + TypeScript
- Mobile: React Native scaffold
- Data: Supabase
- Billing: Stripe
- Live lessons: Daily React
- Hosting: Cloudflare for web

## Boundaries
- Public web and mobile clients handle discovery, booking, lesson access, and subscription self-service
- Supabase stores user, relationship, booking, and session records
- Stripe owns subscription billing lifecycle
- Daily React owns live video room transport and session media

## Reuse
- Repo governance reuses the FTC project-governance skill
- Shared domain contracts live in `PACKAGES/anion-types` and `PACKAGES/anion-shared`

## Observability Contract
- Canonical status artifact: `APPS/anion/ops/status-summary.json`
- Weekly summary: `APPS/anion/ops/weekly-status.md`
- Release log: `APPS/anion/ops/release-log.md`
- Test evidence: `DOCS/ANION/status/TEST_EVIDENCE.md`

## Integration Rule
Anion must always be reducible into portfolio status, metrics, and logs without manual rework.
