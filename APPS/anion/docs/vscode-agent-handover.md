# VS Code Agent Mode Handover — Anion

Use this when switching to Agent Mode. This tells the next agent exactly where to continue.

## Current repo state (verified 2026-05-05)

- ✅ M0 platform realignment is complete
- `APPS/anion` is the main web delivery lane
- Next.js 15 App Router is the active runtime
- OpenNext + Cloudflare Workers setup is in place (`open-next.config.ts`, `wrangler.jsonc`)
- API route scaffolds exist: `api/health`, `api/daily/room`, `api/webhooks/stripe`
- Supabase migrations folder exists with foundation schema (`supabase/migrations/`)
- CI baseline exists (`.github/workflows/anion-web-ci.yml`)
- `anion-mobile` is deferred until M5 exits

## What NOT to redo

- Do not recreate M0
- Do not reintroduce Vite files
- Do not switch away from the locked stack
- Do not start mobile by default
- Do not reference `next-on-pages`

## Active milestone: M1 Foundation Wiring

**Goal:** A user can authenticate, resolve their role, and land on the correct dashboard.

**Target outputs:**
- `app/lib/supabase/server.ts` — server-side Supabase client (using `createServerClient` from `@supabase/ssr`)
- `app/lib/supabase/client.ts` — browser-side Supabase client
- `app/lib/auth/getCurrentUser.ts` — server helper to get session + profile + role
- `app/(auth)/layout.tsx` — real session check, redirects unauthenticated users to `/login`
- `app/(auth)/dashboard/page.tsx` — role-based redirect (student → `/student`, parent → `/parent`, tutor → `/tutor`, admin → `/admin`)
- `app/(public)/login/page.tsx` — magic link or email/password auth form
- Role guard tested (even manually)

## Open decisions — document, do not guess

- Supabase project URL and anon key (needed to run migrations against real project)
- Cloudflare account ID and worker name confirmation
- Stripe canonical product and price IDs
- Daily.co domain or account

## Agent routing for this handover

| Task | Agent |
|------|-------|
| Read state, plan M1 | `anion-program-director` |
| Implement M1 | `anion-web-builder` |
| Review M1 | `anion-qa-release` |

## First prompts to use

**Start here (Program Director):**
```
@anion-program-director
Read AGENTS.md, .github/copilot-instructions.md, ops/ROADMAP.md, and the ADRs in ops/adr/.
Inspect the current repo and produce an M1 execution plan with: primary agent, reviewer agent, files expected to change, acceptance criteria, definition of done, blockers.
Do not restart M0. Continue from current state.
```

**Then implement (Web Builder):**
```
@anion-web-builder
Implement M1 only. Wire Supabase auth and profile resolution into the Next.js App Router structure.
Add role based redirects and dashboard routing.
Keep changes reviewable and add test notes for auth and role guard behavior.
Update ops docs if implementation decisions change.
```

**Then review (QA):**
```
@anion-qa-release
Review M1 changes for: auth guard correctness, role redirect correctness, loading and failure states, missing tests, regressions against the locked stack.
```
