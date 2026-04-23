# @ftc/supabase

Shared Supabase client factory used across FTC applications.

Exports:

- `createBrowserClient()` – initializes browser-side client using public keys.
- `createServerClient(cookies?)` – optional helper for Next.js server components.
- `Database` type placeholder for future schema generation.
- `SupabaseClient` typed alias.

Environment variables required by all apps:

```
NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
```

Package is private and built with `npm run build`.
