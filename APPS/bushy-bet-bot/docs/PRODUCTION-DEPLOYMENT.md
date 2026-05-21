# Production Deployment

## Required Environment Variables

- BOT_TOKEN
- BOT_MODE=webhook
- ADMIN_USER_IDS
- CHANNEL_ID
- WEBHOOK_BASE_URL
- WEBHOOK_SECRET
- DATABASE_URL
- API_FOOTBALL_KEY  # supports API-Football or football-data.org free keys
- ODDS_API_KEY
- AFFILIATE_DEFAULT_URL
- LOG_LEVEL

## Deploy to Railway

1. Create a new Railway service from this repository.
2. Attach a Railway Postgres database.
3. Set all required environment variables in Railway dashboard.
4. Deploy with start command:
   - `python run.py`
5. Ensure the service exposes HTTPS and public URL.

## Preflight Validation

Run before first webhook deployment:

- `python scripts/preflight.py`
- `python scripts/release_verify.py`

Expected result:
- `Preflight passed: environment and database are ready`
- `Release verify passed: required docs and production templates are present`

## Set Telegram Webhook

Webhook URL format:
- `${WEBHOOK_BASE_URL}/webhook/${WEBHOOK_SECRET}`

The app sets webhook automatically on startup in webhook mode.

## Verify Health

- GET `/health`
- Expect: `{"status":"ok","database":"up"}`

## Verify Bot Commands

1. `/start`
2. `/fixtures`
3. `/today`
4. `/results`
5. `/stats`

## Verify Channel Posting

1. Run `/postpick id="..."` as admin
2. Confirm message posts to CHANNEL_ID
3. Confirm responsible betting footer is present
