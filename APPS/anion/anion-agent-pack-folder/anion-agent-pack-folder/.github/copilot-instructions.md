# Copilot repository instructions for Anion

You are working inside the Anion Class App repository.

## Product and delivery context

- Anion is now a committed FTC client project
- It must be delivered like a real production system
- It should also preserve reusable FTC product IP where possible
- Premium quality matters more than shipping shallow placeholders

## Approved architecture

- Next.js App Router
- Cloudflare Workers using OpenNext
- Supabase for data and auth
- Stripe for billing
- Daily React for live classrooms

## Current state

- M0 platform realignment is complete
- Do not reintroduce Vite runtime files
- Do not reference `next-on-pages`
- Treat the web repo as the main delivery lane
- `anion-mobile` is deferred until explicitly pulled into scope

## Coding expectations

- Prefer small, reviewable pull requests
- Use server side route handlers where appropriate
- Keep business logic out of UI components where possible
- Write types first for contracts and interfaces
- Preserve clear role boundaries: student, parent, tutor, admin
- Keep billing and access control server driven
- Keep real time collaboration logic well isolated and documented

## Quality expectations

- No fake completeness
- No TODO only PRs for milestone critical work
- Add test coverage or explicit test notes
- Document assumptions
- Update status and ADR artifacts when architecture changes

## Project priorities

1. M1 foundation wiring
2. M2 booking and session orchestration
3. M3 billing and entitlement
4. M4 live lesson room
5. M5 real time collaboration, operator QA, release hardening

## Avoid

- random package additions
- speculative refactors
- scope creep into mobile
- duplicating auth logic across client and server
- coding features out of milestone order
