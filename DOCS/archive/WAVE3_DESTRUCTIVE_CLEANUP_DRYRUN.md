#
## Executed Batch A (2026-04-29T)
All Batch A (READY) paths were already absent or not present in the working tree at execution time. No files or folders were removed.
Paths attempted:
- tmp-live.html
- tmp-og.html
- .wrangler/
- tmp/
- APPS/saywetin/.idea/caches/
- APPS/saywetin/.idea/deviceManager.xml
- APPS/saywetin/.idea/vcs.xml
# Wave 3 Destructive Cleanup Dry-Run (April 29, 2026)

## Candidate Delete Table
| candidate_path | source_audit_ref | why_safe | risk_if_wrong | rollback_method | status |
|---|---|---|---|---|---|
| tmp-live.html | CODE_AUDIT.md | Explicitly marked "Safe delete now"; temp file, not referenced by build | None (temp file, not tracked) | Restore from git or backup | READY |
| tmp-og.html | CODE_AUDIT.md | Explicitly marked "Safe delete now"; temp file, not referenced by build | None (temp file, not tracked) | Restore from git or backup | READY |
| .wrangler/ | CODE_AUDIT.md | Marked "Safe ignore via .gitignore"; local tool cache, not referenced by build | Minimal (tool config loss) | Recreate by running wrangler | READY |
| tmp/ | CODE_AUDIT.md | Marked "Safe ignore via .gitignore"; temp dir, not referenced by build | Minimal (temp data loss) | Recreate as needed | READY |
| APPS/saywetin/.idea/caches/ | CODE_AUDIT.md | Marked "Safe ignore via .gitignore"; IDE cache, not referenced by build | Minimal (IDE state loss) | Recreate by IDE | READY |
| APPS/saywetin/.idea/deviceManager.xml | CODE_AUDIT.md | Marked "Safe ignore via .gitignore"; IDE config, not referenced by build | Minimal (IDE config loss) | Recreate by IDE | READY |
| APPS/saywetin/.idea/vcs.xml | CODE_AUDIT.md | Marked "Safe ignore via .gitignore"; IDE config, not referenced by build | Minimal (IDE config loss) | Recreate by IDE | READY |
| APPS/ftc-site/cleaning-collage.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/commercial-cleaner.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-desk-cleaning.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-floor-cleaning.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-office-space-clean.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-owner-portrait.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-team-supplies.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/gc-washroom-cleaning.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| APPS/ftc-site/hero-office-team.webp | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in public assets | Restore from git or backup | HOLD |
| scripts/garden-portal-ga4-experiment-compare.sql | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in analytics | Restore from git or backup | HOLD |
| scripts/garden-portal-ga4-funnel-baseline.sql | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in analytics | Restore from git or backup | HOLD |
| tests/setup.ts | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in test harness | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/components/site-footer.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/components/site-header.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/components/track-card.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/lib/discover-api.ts | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/pages/artist.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/pages/charts.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/pages/discover.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |
| APPS/saywetin/client/src/pages/download.tsx | CODE_AUDIT.md | Owner approval required; not yet confirmed unused | Possible break in app | Restore from git or backup | HOLD |

## Exact commands (not executed)

### Batch A (lowest risk)
Remove temp and IDE noise:
```
Remove-Item tmp-live.html -Force
Remove-Item tmp-og.html -Force
Remove-Item -Recurse -Force .wrangler/
Remove-Item -Recurse -Force tmp/
Remove-Item -Recurse -Force APPS/saywetin/.idea/caches/
Remove-Item APPS/saywetin/.idea/deviceManager.xml -Force
Remove-Item APPS/saywetin/.idea/vcs.xml -Force
```

### Batch B (medium risk)
# (No entries in this batch for this wave)

### Batch C (needs explicit owner confirmation)
```
Remove-Item APPS/ftc-site/cleaning-collage.webp -Force
Remove-Item APPS/ftc-site/commercial-cleaner.webp -Force
Remove-Item APPS/ftc-site/gc-desk-cleaning.webp -Force
Remove-Item APPS/ftc-site/gc-floor-cleaning.webp -Force
Remove-Item APPS/ftc-site/gc-office-space-clean.webp -Force
Remove-Item APPS/ftc-site/gc-owner-portrait.webp -Force
Remove-Item APPS/ftc-site/gc-team-supplies.webp -Force
Remove-Item APPS/ftc-site/gc-washroom-cleaning.webp -Force
Remove-Item APPS/ftc-site/hero-office-team.webp -Force
Remove-Item scripts/garden-portal-ga4-experiment-compare.sql -Force
Remove-Item scripts/garden-portal-ga4-funnel-baseline.sql -Force
Remove-Item tests/setup.ts -Force
Remove-Item APPS/saywetin/client/src/components/site-footer.tsx -Force
Remove-Item APPS/saywetin/client/src/components/site-header.tsx -Force
Remove-Item APPS/saywetin/client/src/components/track-card.tsx -Force
Remove-Item APPS/saywetin/client/src/lib/discover-api.ts -Force
Remove-Item APPS/saywetin/client/src/pages/artist.tsx -Force
Remove-Item APPS/saywetin/client/src/pages/charts.tsx -Force
Remove-Item APPS/saywetin/client/src/pages/discover.tsx -Force
Remove-Item APPS/saywetin/client/src/pages/download.tsx -Force
```

## Pre-execution checklist
- [ ] Confirm all READY candidates are not referenced by any build, app, or migration logic
- [ ] Confirm all HOLD candidates with owners before proceeding
- [ ] Backup current repo state
- [ ] Review .gitignore for coverage of all temp/IDE noise

## Post-execution verification checklist
- [ ] Run git status and confirm only intended files are removed
- [ ] Run app build/tests to confirm no breakage
- [ ] Restore any files if needed from backup or git

## git status --short output
```
(Most recent output included above)
```
