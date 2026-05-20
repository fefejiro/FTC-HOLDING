# VS Code Agent Mode Handover - Anion

Use this when switching to Agent Mode. This tells the next agent exactly where to continue.

## Current repo state (verified 2026-05-19)

- M0 platform realignment is complete
- `APPS/anion` is the main web delivery lane
- Next.js 15 App Router is the active runtime
- OpenNext + Cloudflare Workers setup is in place (`open-next.config.ts`, `wrangler.jsonc`)
- API route scaffolds exist: `api/health`, `api/daily/room`, `api/webhooks/stripe`
- Supabase migrations folder exists with foundation schema (`supabase/migrations/`)
- CI baseline exists (`.github/workflows/anion-web-ci.yml`)
- `anion-mobile` is deferred until M5 exits
- Premium UX pass completed across core pages and lesson room states
- CI regression gate (`npm run ci:check`) is passing after auth type compatibility fix

## What NOT to redo

- Do not recreate M0
- Do not reintroduce Vite files
- Do not switch away from the locked stack
- Do not start mobile by default
- Do not reference `next-on-pages`
- Do not roll back the tokenized premium UI changes in app surfaces

## Active milestone: M2 Delivery Execution

**Goal:** Continue feature delivery on top of a stabilized premium shell (bookings, classroom lifecycle, billing completion, and release quality gates).

**Current baseline already in place:**
- Premium token system in `app/globals.css`
- Updated UX shells in `app/layout.tsx`, `app/(public)/page.tsx`, `app/(public)/login/page.tsx`, `app/(public)/pricing/page.tsx`
- Lesson room premium parity in `app/(auth)/lesson/[sessionId]/LessonRoom.tsx`
- Auth type compatibility fix in `src/lib/auth.ts` and `src/hooks/useCurrentUser.ts`

**Immediate target outputs:**
- M2 booking flow quality pass (parent -> tutor request lifecycle)
- M3 billing completion checks (checkout, portal, webhook parity)
- M4 live classroom reliability pass (slow-network and reconnect behavior)
- M5 release QA artifacts (smoke, perf, and handoff evidence)

## Open decisions — document, do not guess

- Supabase project URL and anon key (needed to run migrations against real project)
- Cloudflare account ID and worker name confirmation
- Stripe canonical product and price IDs
- Daily.co domain or account

## Latest validated commits

- `90f59a53` - premium design system pass across six app surfaces
- `9528a699` - Supabase auth type import compatibility fix for CI

## Agent routing for this handover

| Task | Agent |
|------|-------|
| Read state, plan M2-M3 slice | `anion-program-director` |
| Implement feature slice | `anion-web-builder` |
| Review and release gate | `anion-qa-release` |

## First prompts to use

**Start here (Program Director):**
```
@anion-program-director
Read AGENTS.md, .github/copilot-instructions.md, ops/ROADMAP.md, ops/release-log.md, and ops/weekly-status.md.
Inspect current repo state and produce an M2-M3 execution plan with: primary agent, reviewer agent, files expected to change, acceptance criteria, definition of done, blockers.
Do not restart M0/M1. Continue from current stabilized premium baseline.
```

**Then implement (Web Builder):**
```
@anion-web-builder
Implement one vertical slice only (M2 or M3 as directed by the plan).
Preserve premium token usage and visual consistency in all touched pages.
Keep changes reviewable and add test notes for behavior, regressions, and fallback states.
Update ops docs if implementation decisions change.
```

**Then review (QA):**
```
@anion-qa-release
Review slice changes for: functional correctness, regression risk, loading and failure states, missing tests, and release readiness evidence.
```
