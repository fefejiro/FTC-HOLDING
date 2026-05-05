# PeacePad Auth Setup (Supabase + Google OIDC)

## Redirect Targets (Required)
Configure auth redirects to these exact URLs:

- Web callback: `https://peacepad.ca/auth/callback`
- Mobile callback: `https://peacepad.ca/auth/mobile-callback`
- Mobile callback (www): `https://www.peacepad.ca/auth/mobile-callback`

Guest login remains available via existing guest auth routes and is not replaced by OIDC.

## Supabase Dashboard Setup
In Supabase project auth settings:

1. Set `Site URL` to `https://peacepad.ca`.
2. Add Redirect URLs:
   - `https://peacepad.ca/auth/callback`
   - `https://peacepad.ca/auth/mobile-callback`
   - `https://www.peacepad.ca/auth/mobile-callback`
   - `http://127.0.0.1:5173/auth/callback` (local dev)
3. Enable provider: `Google`.

## Google Cloud Console Setup
Create or use a Google OAuth client for web sign-in:

1. Authorized JavaScript origins:
   - `https://peacepad.ca`
   - `https://www.peacepad.ca`
   - `http://127.0.0.1:5173`
2. Authorized redirect URIs:
   - Use the Supabase callback URL shown in Supabase Google provider settings
     (typically `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`).
3. Copy Google client ID/secret into Supabase Google provider config.

## Cloudflare Pages Env Vars (`VITE_*`)
Set these in Pages (Production):

- `VITE_API_BASE_URL=https://api.peacepad.ca`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put secret values in git.

## API Service Env Vars (`SUPABASE_*` and session)
Set these in the API deployment environment (Railway or equivalent):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SESSION_SECRET`
- `PORT`
- `NODE_ENV=production`

Optional depending on enabled features:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

## Auth Flow Contract
- Frontend starts Google OAuth with Supabase.
- Callback page exchanges Supabase access token with API:
  - `POST /api/auth/supabase/exchange`
- API validates token against Supabase and establishes existing session cookie.
- Existing guest login endpoints continue to work unchanged.
