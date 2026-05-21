# Bushy Bet Bot

Football-first Telegram betting intelligence product.

Main tagline: **Football picks with receipts.**

Secondary line: **The pitch talks. Bushy Bet listens.**

## Purpose

Bushy Bet provides:
- football picks with structured reasoning
- transparent public results and stats
- responsible betting reminders
- affiliate-ready links to licensed betting platforms

Bushy Bet is **not** a sportsbook and does not process bets, deposits, or withdrawals.

## Tech Stack

- Python
- python-telegram-bot
- SQLite (local fallback) + Postgres (production)
- FastAPI webhook runtime
- .env configuration
- pytest

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy environment template:

```bash
cp .env.example .env
```

4. Set your values in `.env`:

- `BOT_TOKEN` Telegram bot token
- `ADMIN_USER_IDS` comma-separated Telegram user IDs
- `CHANNEL_ID` Telegram channel ID for posting picks (optional)
- `DATABASE_PATH` SQLite DB file path

## Run Bot

```bash
python run.py
```

Mode is controlled by `BOT_MODE`:

- `BOT_MODE=polling` for local development
- `BOT_MODE=webhook` for production webhook runtime

## Run Tests

```bash
pytest -q
```

## Run Production Preflight

```bash
python scripts/preflight.py
python scripts/release_verify.py
```

## Uby Go-Live (Railway)

Use the one-command onboarding script:

```powershell
pwsh ./scripts/uby_go_live.ps1 -Deploy
```

The script will:
- prompt for the required secrets (`BotToken`, `ApiFootballKey`) and admin IDs
- set Railway production variables with `--skip-deploys`
- deploy during your allowed window (or block outside window unless overridden)
- call `/health`
- set Telegram webhook automatically

## User Commands

- `/start`
- `/today`
- `/results`
- `/stats`
- `/risk`
- `/vip`
- `/help`
- `/fixtures`
- `/matchstats`

## Admin Commands

- `/addpick`
- `/editpick`
- `/deletepick`
- `/postpick`
- `/setresult`
- `/report`
- `/broadcast`
- `/addaffiliate`
- `/syncfixtures`
- `/settle`
- `/whoami`
- `/health`

## Command Example

```text
/addpick league="Premier League" match="Arsenal vs Chelsea" kickoff="2026-05-22 15:00" market="Over 2.5 Goals" selection="Over 2.5" odds="1.85" confidence="Medium" risk="Moderate" reason="Both teams create high chances and concede in transition."
```

## Security Notes

- Secrets are read from `.env` only.
- Do not commit real bot tokens or affiliate secrets.
- Admin commands reject non-admin users.
- All create/update/delete/post/result/affiliate actions are logged in `audit_log`.

## Logo Asset

- Source provided: `Bushy Bet.png`
- Production project path: `assets/bushy-bet-logo.png`
- The `/start` command now sends this logo before the welcome text.

## Access And Share With Client (Uby)

1. Local file path: `APPS/bushy-bet-bot/assets/bushy-bet-logo.png`
2. Quick share option: send that PNG directly on Telegram/WhatsApp/email.
3. In-product preview: run the bot and send `/start` to the bot to see the live logo delivery.
4. Optional packaging: zip the full `APPS/bushy-bet-bot` folder and send to Uby for full handoff.
