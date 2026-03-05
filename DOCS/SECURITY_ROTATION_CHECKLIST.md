# Security Rotation Checklist

Rotate these secrets before or during production cutover:

- OPENAI API key
- MAILJET API key
- MAILJET secret key
- VAPID private key
- ACRCloud access key and access secret
- GENIUS API key
- SESSION_SECRET values (all services)

## Rotation Steps

1. Rotate keys in provider dashboards.
2. Update Railway environment variables for each API service.
3. Update Cloudflare Pages environment variables for each frontend.
4. Redeploy affected services.
5. Validate health endpoints and authentication flows.
6. Revoke old keys after verification.

## Repo Safety Rules

- Never commit `.env*` files.
- Keep only template files such as `.env.production.example` in git.
- Run `npm run audit:secrets` before pushing.
