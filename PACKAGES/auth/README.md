# @ftc/auth

Framework-agnostic authentication helpers built on top of Supabase.

Exports:

- `signInWithOtpEmail(email)`
- `signInWithPassword(email, password)` (optional)
- `signOut()`
- `getSession()`
- `onAuthStateChange(handler)`
- `requireUser(session)`
- `isAuthed(session)`

Uses `@ftc/supabase` under the hood. This package is private and built with `npm run build`.
