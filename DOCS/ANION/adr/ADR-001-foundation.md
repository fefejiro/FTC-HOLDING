# ADR-001 Foundation

## Context
Anion needs a durable product scaffold that fits FTC conventions, keeps costs down, and stays aligned with Supabase, Stripe, Cloudflare, and Daily React.

## Decision
- Use a Vite and React web scaffold for the initial foundation
- Create a React Native mobile scaffold in parallel
- Keep Supabase shared for early-stage cost control
- Create repo-native governance and status feeds before deeper implementation

## Consequences
- Positive:
  - Faster product foundation using patterns already present in the monorepo
  - Clear path to portfolio tracking and reusable governance
  - Lower cost in the early stage
- Negative:
  - Shared Supabase requires disciplined table names and policy boundaries
  - Dashboard integration begins as a contract and placeholder, not full live telemetry

## Follow-up
- Wire auth, booking, and subscription slices against this foundation
