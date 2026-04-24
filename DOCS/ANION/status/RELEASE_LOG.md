# Anion Release Log

| Date | Version | Change | Validation | Notes |
|---|---|---|---|---|
| 2026-04-23 | 0.1.0 | Foundation scaffold, governance docs, architecture overview, schema proposal, and status contract established. | Partial | Build-ready documentation baseline is in place; feature flows remain TODO-backed and should not be treated as shipped product behavior. |
| 2026-04-23 | 0.1.1 | Implemented the first concrete Phase 1 product slice: role-aware session model, tutor discovery, booking requests, and parent/student profile setup. | `npm run build` | This is still local-state foundation work; Supabase auth, persistence, and live runtime contracts remain next. |
| 2026-04-23 | 0.1.2 | Added shared Supabase-ready auth scaffolding, Vite-compatible env handling, and magic-link session hooks to Anion. | `npm run build` | Real profile persistence and role-backed data access are still pending; this closes the auth boundary scaffold, not the full production security pass. |
| 2026-04-23 | 0.1.3 | Added Supabase-backed profile/tutor/booking data adapters with demo fallback and introduced baseline Anion RLS policy migration. | `npm run build` | Owner-scoped booking/profile access is now defined in SQL; apply migrations and run authenticated smoke tests before public launch. |
