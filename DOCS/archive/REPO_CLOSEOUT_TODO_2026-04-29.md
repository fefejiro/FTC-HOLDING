# Repo Closeout Todo - 2026-04-29

This file tracks the remaining open worktree items after the Garden client handoff docs commit.

## Current Open Items

| Lane | Path / Area | Current Status | Recommended Action | Owner Decision Needed |
| --- | --- | --- | --- | --- |
| Garden app/test changes | `APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx` | Modified | Review, build/test, then commit with Garden portal UI/test changes if accepted | No |
| Garden Playwright tests | `APPS/ftc-site/tests/garden-cleaners-public.spec.ts` | Modified | Review final live-test absolute URL patch, then commit with Garden portal UI/test changes | No |
| Garden Playwright tests | `APPS/ftc-site/tests/garden-portal-credentialed.spec.ts` | Modified | Review final live-test absolute URL patch, then commit with Garden portal UI/test changes | No |
| Garden Playwright tests | `APPS/ftc-site/tests/garden-portal.spec.ts` | Modified | Review final live-test absolute URL patch, then commit with Garden portal UI/test changes | No |
| Garden gate/status docs | `DOCS/GARDEN_48H_HANDOFF_SPRINT_BOARD.md` | Modified | Review latest gate wording, then commit separately as handoff gate update | No |
| Garden gate/status docs | `DOCS/GARDEN_PRODUCTION_HANDOFF_GATE.md` | Modified | Review latest gate wording, then commit separately as handoff gate update | No |
| SayWetin IDE noise | `APPS/saywetin/.idea/workspace.xml` | Modified | Do not commit. Either ignore local-only or reset if confirmed unnecessary | Yes before reset |
| SayWetin IDE noise | `APPS/saywetin/.idea/caches/` | Untracked | Do not commit. Add to ignore or remove as local cache | Yes before delete |
| SayWetin IDE noise | `APPS/saywetin/.idea/deviceManager.xml` | Untracked | Do not commit. Add to ignore or remove as local cache | Yes before delete |
| SayWetin IDE noise | `APPS/saywetin/.idea/markdown.xml` | Untracked | Do not commit unless intentionally shared IDE config | Yes |
| SayWetin IDE noise | `APPS/saywetin/.idea/vcs.xml` | Untracked | Do not commit. Add to ignore or remove as local cache | Yes before delete |
| SayWetin report | `APPS/saywetin/ops/FULL_E2E_QA_REPORT.md` | Untracked | Review whether this is a real SayWetin QA deliverable; commit only in SayWetin lane | Yes |
| Supabase temp | `supabase/.temp/cli-latest` | Modified | Do not commit. Ignore/reset after confirming it is CLI cache only | Yes before reset |
| Untracked Garden doc | `DOCS/GARDEN_ADMIN_USER_MANAGEMENT_FINAL_SPEC.md` | Untracked | Review and commit if it is part of Garden admin roadmap package | No |
| Untracked Garden doc | `DOCS/GARDEN_CLIENT_WALKTHROUGH_PACK.md` | Untracked | Review overlap with client handoff package; either commit as active or archive/merge | Yes |
| Untracked Garden doc | `DOCS/GARDEN_PRODUCTION_ACCOUNT_SETUP_RESULT.md` | Untracked | Commit as active production account/status record if content contains no secrets | No |
| Untracked Garden doc | `DOCS/GARDEN_SUPABASE_AUTH_EMAIL_TEMPLATE_UPDATE.md` | Untracked | Commit as auth email template runbook if content contains no secrets | No |

## Suggested Commit Order

1. `fix(garden): polish portal login and stabilize live QA tests`
   - Garden portal UI file and Garden Playwright tests only.

2. `docs(garden): update handoff gates and auth status`
   - Garden sprint board, production handoff gate, account setup result, Supabase email template runbook, admin user management spec if accepted.

3. `chore(repo): ignore local IDE and Supabase cache noise`
   - `.gitignore` update only, if needed.

4. SayWetin lane
   - Decide separately whether `APPS/saywetin/ops/FULL_E2E_QA_REPORT.md` should be committed.

## Do Not Do Without Owner Approval

- Do not delete or reset modified SayWetin files.
- Do not commit IDE files unless intentionally shared.
- Do not commit Supabase temp/cache files.
- Do not merge duplicate handoff docs without checking whether newer client-facing docs supersede them.
