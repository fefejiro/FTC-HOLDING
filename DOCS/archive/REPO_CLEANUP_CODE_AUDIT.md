# Repo Cleanup Code Audit — April 29, 2026

| Path | App | Classification | Risk | Recommended Action |
|------|-----|----------------|------|-------------------|
| .github/workflows/saywetin-android-release.yml | CI | production-critical | high | Keep |
| .github/workflows/saywetin-dispatch-from-issue.yml | CI | production-critical | high | Keep |
| .github/workflows/saywetin-qa.yml | CI | production-critical | high | Keep |
| .wrangler/ | infra | local-noise | low | Safe ignore via .gitignore |
| cleaning-collage.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| commercial-cleaner.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-desk-cleaning.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-floor-cleaning.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-office-space-clean.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-owner-portrait.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-team-supplies.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| gc-washroom-cleaning.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| hero-office-team.webp | APPS/ftc-site/public | local-noise | low | Owner approval required |
| tests/setup.ts | tests | feature-in-progress | medium | Owner approval required |
| tmp-live.html | root | local-noise | low | Safe delete now |
| tmp-og.html | root | local-noise | low | Safe delete now |
| tmp/ | root | local-noise | low | Safe ignore via .gitignore |
| scripts/garden-portal-ga4-experiment-compare.sql | scripts | experimental | low | Owner approval required |
| scripts/garden-portal-ga4-funnel-baseline.sql | scripts | experimental | low | Owner approval required |
| supabase/migrations/202604260001_payment_audit.sql | supabase | production-critical | high | Keep |
| supabase/migrations/202604260002_onboard_client_function.sql | supabase | production-critical | high | Keep |
| supabase/migrations/202604260003_onboard_fix_partial_index.sql | supabase | production-critical | high | Keep |
| supabase/migrations/202604280001_garden_cleaners_quotes.sql | supabase | production-critical | high | Keep |
| saywetin/.idea/caches/ | saywetin | local-noise | low | Safe ignore via .gitignore |
| saywetin/.idea/deviceManager.xml | saywetin | local-noise | low | Safe ignore via .gitignore |
| saywetin/.idea/vcs.xml | saywetin | local-noise | low | Safe ignore via .gitignore |
| saywetin/client/src/components/site-footer.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/components/site-header.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/components/track-card.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/lib/discover-api.ts | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/pages/artist.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/pages/charts.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/pages/discover.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/client/src/pages/download.tsx | saywetin | feature-in-progress | medium | Owner approval required |
| saywetin/migrations/ | saywetin | production-critical | high | Keep |
| una-labs-site/public/una-labs-icon.png | una-labs-site | production-critical | high | Keep |
| DOCS/CLIENT_ONBOARDING_PLAYBOOK.md | docs | production-critical | high | Keep |
| DOCS/EMAIL_CONTACTS_AND_FORWARDING.md | docs | production-critical | high | Keep |
| DOCS/GARDEN_PORTAL_ANALYTICS_EVENT_MAP.md | docs | production-critical | high | Keep |
| DOCS/GARDEN_PORTAL_REPORTING_BASELINE.md | docs | production-critical | high | Keep |
| DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md | docs | production-critical | high | Keep |
| DOCS/RAILWAY_CONSOLIDATION_PLAN.md | docs | production-critical | high | Keep |
| DOCS/REPO_CLEANUP_CODE_AUDIT.md | docs | production-critical | high | Keep |
| DOCS/REPO_CLEANUP_DOC_AUDIT.md | docs | production-critical | high | Keep |
| DOCS/REPO_CLEANUP_MATRIX.md | docs | production-critical | high | Keep |
| DOCS/garden-cleaners-quote-persistence.md | docs | production-critical | high | Keep |
| DOCS/onboarding/ | docs | production-critical | high | Keep |
## Safe delete now
- tmp-live.html
- tmp-og.html

## Safe ignore via .gitignore
- .wrangler/
- tmp/
- saywetin/.idea/caches/
- saywetin/.idea/deviceManager.xml
- saywetin/.idea/vcs.xml

## Owner approval required
- cleaning-collage.webp
- commercial-cleaner.webp
- gc-desk-cleaning.webp
- gc-floor-cleaning.webp
- gc-office-space-clean.webp
- gc-owner-portrait.webp
- gc-team-supplies.webp
- gc-washroom-cleaning.webp
- hero-office-team.webp
- scripts/garden-portal-ga4-experiment-compare.sql
- scripts/garden-portal-ga4-funnel-baseline.sql
- tests/setup.ts
- saywetin/client/src/components/site-footer.tsx
- saywetin/client/src/components/site-header.tsx
- saywetin/client/src/components/track-card.tsx
- saywetin/client/src/lib/discover-api.ts
- saywetin/client/src/pages/artist.tsx
- saywetin/client/src/pages/charts.tsx
- saywetin/client/src/pages/discover.tsx
- saywetin/client/src/pages/download.tsx
# Repo Cleanup Code Audit — April 29, 2026

| Path | App | Classification | Risk | Recommended Action |
|------|-----|----------------|------|-------------------|
| .github/workflows/saywetin-android-release.yml | CI | production-critical | high | Keep |
| .github/workflows/saywetin-dispatch-from-issue.yml | CI | production-critical | high | Keep |
| .github/workflows/saywetin-qa.yml | CI | production-critical | high | Keep |
| .wrangler/ | infra | local-noise | low | Candidate for cleanup if not used |
| cleaning-collage.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| commercial-cleaner.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-desk-cleaning.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-floor-cleaning.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-office-space-clean.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-owner-portrait.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-team-supplies.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| gc-washroom-cleaning.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| hero-office-team.webp | garden-cleaners | local-noise | low | Candidate for cleanup if not referenced |
| ../saywetin/.idea/caches/ | saywetin | local-noise | low | Candidate for cleanup (IDE cache) |
| ../saywetin/.idea/deviceManager.xml | saywetin | local-noise | low | Candidate for cleanup (IDE config) |
| ../saywetin/.idea/vcs.xml | saywetin | local-noise | low | Candidate for cleanup (IDE config) |
| ../saywetin/client/src/components/site-footer.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/components/site-header.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/components/track-card.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/lib/discover-api.ts | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/pages/artist.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/pages/charts.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/pages/discover.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/client/src/pages/download.tsx | saywetin | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../saywetin/migrations/ | saywetin | production-critical | high | Keep (DB migrations) |
| ../una-labs-site/public/una-labs-icon.png | una-labs-site | production-critical | high | Keep |
| ../../DOCS/CLIENT_ONBOARDING_PLAYBOOK.md | docs | production-critical | high | Keep |
| ../../DOCS/EMAIL_CONTACTS_AND_FORWARDING.md | docs | production-critical | high | Keep |
| ../../DOCS/GARDEN_PORTAL_ANALYTICS_EVENT_MAP.md | docs | production-critical | high | Keep |
| ../../DOCS/GARDEN_PORTAL_REPORTING_BASELINE.md | docs | production-critical | high | Keep |
| ../../DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md | docs | production-critical | high | Keep |
| ../../DOCS/RAILWAY_CONSOLIDATION_PLAN.md | docs | production-critical | high | Keep |
| ../../DOCS/REPO_CLEANUP_MATRIX.md | docs | production-critical | high | Keep |
| ../../DOCS/garden-cleaners-quote-persistence.md | docs | production-critical | high | Keep |
| ../../DOCS/onboarding/ | docs | production-critical | high | Keep |
| ../../scripts/garden-portal-ga4-experiment-compare.sql | scripts | experimental | low | Candidate for cleanup if not used |
| ../../scripts/garden-portal-ga4-funnel-baseline.sql | scripts | experimental | low | Candidate for cleanup if not used |
| ../../supabase/migrations/202604260001_payment_audit.sql | supabase | production-critical | high | Keep |
| ../../supabase/migrations/202604260002_onboard_client_function.sql | supabase | production-critical | high | Keep |
| ../../supabase/migrations/202604260003_onboard_fix_partial_index.sql | supabase | production-critical | high | Keep |
| ../../supabase/migrations/202604280001_garden_cleaners_quotes.sql | supabase | production-critical | high | Keep |
| ../../tests/setup.ts | tests | feature-in-progress | medium | Keep if in active dev, else cleanup |
| ../../tmp-live.html | root | local-noise | low | Candidate for cleanup (temp file) |
| ../../tmp-og.html | root | local-noise | low | Candidate for cleanup (temp file) |
| ../../tmp/ | root | local-noise | low | Candidate for cleanup (temp dir) |
| ../../workers/saywetin-ai/ | workers | feature-in-progress | medium | Keep if in active dev, else cleanup |

**Candidate Cleanup List:**
- .wrangler/
- *.webp (if not referenced in code/assets)
- ../saywetin/.idea/*
- ../../tmp-live.html, ../../tmp-og.html, ../../tmp/
- scripts/garden-portal-ga4-*.sql (if not used)

**Notes:**
- No deletes or refactors performed.
- All production-critical and migration files are marked high risk and should not be removed.
- IDE, temp, and cache files are safe to remove unless actively used.
- Feature-in-progress files should be reviewed with devs before cleanup.
