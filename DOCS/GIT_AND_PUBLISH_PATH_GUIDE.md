# Git and Publish Path Guide

Last updated: 2026-03-19
Canonical repo root: `C:\FTC HOLDING`

## Purpose

This guide documents the safest known operating path for publishing work without disturbing unrelated active development.

It also explains the current reality discovered during the Una Labs revenue update pass.

## Core Rule

Do not assume a local direct-deploy path is safe just because Wrangler is available.

For this repo, the safest publish path is currently:
1. isolate the intended changes
2. validate build in a clean context
3. push to the correct tracked production branch
4. let the configured deployment surface publish from Git

## Important Architectural Rule

Keep frontend and backend deployment paths separate.
Do not collapse them into one conceptual bucket.

Examples:
- PeacePad frontend != PeacePad backend
- SayWetin frontend != SayWetin backend
- Una Labs site is its own frontend surface

## Una Labs Site - Current Safe Publish Path

### Safe path
For `APPS/ftc-site` production changes:
1. confirm the intended changes are only for ftc-site
2. avoid mixing with unrelated PeacePad or extension work
3. create a clean worktree from `origin/main` when needed
4. apply or cherry-pick only the intended ftc-site commits
5. run:
   - `npm --prefix APPS/ftc-site run build`
6. push to `main`
7. let Cloudflare Pages production deploy from Git
8. verify live routes after deploy

### Why this is the current safe path
During the March 19 pass:
- direct Wrangler deploy attempts were noisy and ambiguous
- local direct deploy path hit output path / ENOENT issues
- Git-connected production flow was clearer and safer

## Una Labs Site - Current Unsafe / Unclear Path

Avoid depending on direct local Pages deploy from `APPS/ftc-site` until the path is explicitly fixed and documented.

Current issue observed:
- `wrangler.toml` references Pages output expectations that did not line up cleanly with the current local build/deploy behavior
- result: deployment ambiguity and ENOENT failure risk

This should be treated as a documentation and tooling cleanup item, not operator guesswork.

## When To Use a Worktree

Use a worktree when:
- current branch has unrelated in-progress work
- production changes must be isolated
- you need to promote a narrow set of site changes to `main`
- you do not want to contaminate active development with release handling

Example flow:
```powershell
git fetch origin
git worktree add C:\FTC HOLDING\.tmp-main-publish origin/main
cd C:\FTC HOLDING\.tmp-main-publish
git checkout -b promote-change
# cherry-pick or apply only the intended commit(s)
npm --prefix APPS/ftc-site run build
git push origin promote-change:main
```

## Preview vs Production Reminder

Cloudflare Pages project behavior may differ by branch.
Do not assume a branch push updates production.

Check:
- which branch is mapped to production
- whether your push created only a preview deployment
- whether preview deployments are currently healthy

If production is mapped to `main`, branch pushes alone are not enough.

## Validation Checklist Before Calling A Publish Done

Do not say “published” until all are true:
- intended commit is on the correct remote branch
- deployment path is the correct one for that surface
- build succeeded in clean context
- target route resolves live
- key CTA paths render as expected

## Required Follow-Up Cleanup

Future operators should make this clearer by documenting:
- exact ftc-site Pages production mapping
- exact preview behavior
- exact direct-deploy viability or non-viability
- exact output path expectations for local Pages deploys

## Summary

Current best operator rule:
- isolate changes
- validate cleanly
- push to the true production branch
- verify the live route
- keep frontend/backend deployment mental models separate
