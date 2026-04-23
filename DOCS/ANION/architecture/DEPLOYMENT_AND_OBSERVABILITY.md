# Anion Deployment And Observability

## Deployment Targets
- Web: Cloudflare Pages
- Mobile: App Store and Play Store via React Native build pipeline later
- Data and auth: Supabase
- Billing: Stripe
- Realtime lessons: Daily React

## Required Health Surfaces
- Web app availability
- API or Supabase-backed data access readiness
- Booking pipeline readiness
- Daily lesson room readiness
- Stripe and subscription state visibility

## Required Metrics
- Tutor count ready for discovery
- Booking count by state
- Sessions scheduled vs completed
- Active subscriptions
- Open blockers and last validation date

## Required Logs
- Weekly operator summary
- Release log
- Test evidence log
- Incident notes when defects affect booking, billing, or lesson delivery

## Repo Feed Contract
- `scripts/update-anion-status.mjs` should keep the status doc and `FTC_MASTER.md` snapshot in sync
- `APPS/una-labs-site/lib/portfolio-status.ts` should expose a portfolio placeholder until a live feed is attached
