# Repo Status And Next Actions - 2026-05-18

This is the current operator snapshot for FTC-HOLDING. It is meant to answer:
where we are, what is blocked, what is next, and what should keep improving without needing another handoff thread.

## Current GitHub/CI State

- PR #124, `feat(job-agent): normalize hunt job intake`, is open against `main`.
- PR #124 has a clean local validation result:
  - `npm run build` passed in `APPS/job-reply-agent`
  - `npm test` passed in `APPS/job-reply-agent`
- PR #124 is marked unstable by external Cloudflare checks:
  - `Cloudflare Pages: ftc-holding` failed
  - `Workers Builds: peacepad` failed
  - `Cloudflare Pages: ftc-site-pages` was still in progress at inspection time
- Those Cloudflare checks are external provider checks, not GitHub Actions logs. They should be treated as deployment-noise/blocking infra checks unless their logs show a source-change failure.
- PR #78, `Add reusable GitHub workflow templates for new FTC app bootstrap`, is still open as a draft and has a stale Cloudflare `gardencleaners` in-progress check from May 7, 2026.
- PR #76 does not exist in `fefejiro/FTC-HOLDING` at inspection time.

## What Changed In This Ops Pass

- Added PR-safe GitHub Actions coverage for `APPS/job-reply-agent`.
- Kept the scheduled Gmail cycle, but gated it so it only runs on `schedule` or manual `workflow_dispatch`.
- Added artifact ignore rules for job-agent SQLite WAL/SHM files and generated resume/cover-letter outputs.
- Added this status doc as the handoff anchor for active repo work.

## Project Status

| Project | Status | Latest known state | Next action |
| --- | --- | --- | --- |
| Job Hunt OS / Job Reply Agent | Active | Phase 2.5/4A intake PR open as #124 | Merge after repo checks are understood or Cloudflare noise is bypassed intentionally |
| Garden Cleaners | GO/Handoff | Production docs say owner/client acceptance and security signoff remain | Complete final acceptance and closeout packet |
| Una Labs / FTC Site | GO/Ops | Public status docs list health checks as passing | Keep monitoring and deployment docs current |
| SayWetin | HOLD | API/env/device QA still listed as blockers | Unblock API/env and rerun device QA |
| PeacePad | Active/HOLD for some PRs | External Worker checks are failing on several old draft PRs | Triage Cloudflare Worker build logs outside GitHub Actions |
| Dispatch | HOLD | Runtime env/token verification remains open | Resolve env/token path and rerun QA |
| OG Trades Academy | HOLD | Domain and webhook setup remain pending | Confirm canonical domain and webhook URLs |

## Continuous Optimization Backlog

1. Convert project status into a small machine-readable file under `ops/` and generate this doc from it.
2. Add per-app PR CI for every maintained app so Cloudflare deployment checks are not the only signal.
3. Add a stale external-check runbook for Cloudflare Pages/Workers checks that sit in progress for more than 30 minutes.
4. Add path filters or Cloudflare project build controls so unrelated app PRs do not trigger unrelated deployments.
5. Move generated runtime DB/media artifacts out of tracked app folders where possible, or enforce ignores consistently.
6. Refresh the project ledger after every merge, not only at major handoff points.
7. Close or revive stale draft PRs (#78, #79, #80, #81, #83, #88) with explicit owner notes.

## Operating Rules

- Do not commit generated resumes, cover letters, SQLite DB files, screenshots, videos, or local QA media.
- Prefer a clean branch/worktree for repo hygiene while the main working tree has unrelated dirty files.
- Treat Cloudflare checks as external deployment checks; use GitHub Actions for source-level build/test truth.
- Keep Apply Assist gated: no auto-submit, no LinkedIn automation, and pause on sensitive fields.
