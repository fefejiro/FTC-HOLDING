# Phase 2 Architecture — Shared Supabase + Auth

This document explains the Phase 2 shared auth architecture introduced in the monorepo.

Purpose
- Provide a single, well-tested Supabase client factory for browser and server usage.
- Provide small, framework-agnostic auth helpers that wrap Supabase's auth API.
- Reduce duplication across apps and centralize security guidance.

Packages
- `@ftc/supabase` — client factory and typed exports
  - `createBrowserClient()` — returns a configured Supabase client for browser contexts
  - `createServerClient(cookies?)` — optional server-side client for Next.js server runtime
  - Exports a `Database` placeholder type and `SupabaseClient` alias
- `@ftc/auth` — auth primitives built on top of `@ftc/supabase`
  - `signInWithOtpEmail(email)`
  - `signInWithPassword(email, password)`
  - `signOut()`
  - `getSession()`
  - `onAuthStateChange(handler)`
  - `requireUser(session)`, `isAuthed(session)`

Design boundaries
- Packages are **runtime-agnostic**: they expose plain functions and return Supabase client instances. They do not import Next.js APIs.
- UI- or framework-specific glue (e.g., React hooks, server actions, route guards) belongs in each application under `APPS/*`.

Security and secrets
- Only public keys are safe to use in clients: `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_URL`.
- **Never** embed a Supabase service_role key in client code or commit it to the repo. Service keys belong to server-only environments and must be provided via secure secrets stores.
- CI should provide any required environment variables as repository secrets.

Type strategy
- `@ftc/supabase` exports a `Database` type placeholder. For a typed client, generate a `Database` type using Supabase tools and replace the placeholder in the package.

Build & usage
- Each package uses `tsc` to emit `dist/` (ESM + type declarations).
- Apps import packages by `file:` protocol in `package.json` (workspace linking).

Operational notes
- Keep the packages small and focused; when a shared helper grows complex, consider splitting responsibilities.
- Do not upgrade Supabase or auth behavior across apps without testing all active app integrations (currently PeacePad and SayWetin).

