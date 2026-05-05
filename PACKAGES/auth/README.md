# @ftc/auth

Framework-agnostic authentication helpers built on top of Supabase.


## Exports

- `signInWithOtpEmail(email, redirectTo?)`
- `signInWithPassword(email, password)`
- `signOut()`
- `getSession()`
- `onAuthStateChange(handler)`
- `requireUser(session)`
- `isAuthed(session)`
- `normalizeEmail(email)` — Lowercase and trim email
- `authRedirectTo(path, origin?)` — Build absolute redirect URL
- `resetPasswordForEmail(email, redirectTo?)` — Send password reset email
- `updatePassword(newPassword)` — Update current user's password
- `getUser()` — Get current user (if any)
- `isAdminRole(role)` — Returns true if role is admin/owner_admin/una_labs_super_admin

Uses `@ftc/supabase` under the hood. This package is private and built with `npm run build`.
