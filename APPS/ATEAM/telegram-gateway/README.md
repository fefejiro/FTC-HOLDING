# ATEAM Telegram Gateway

This service enables **Telegram remote control** for ATEAM Local using **long polling** (`getUpdates`).

## Requirements

- Node.js 18+ (works best on Node 20+)
- ATEAM Server running locally (default `http://localhost:3000`)

## Environment Variables

- `TELEGRAM_BOT_TOKEN` (required)
- `TELEGRAM_ALLOWED_USER_ID` (preferred) (your personal Telegram user id, not the bot id)
- `TELEGRAM_ALLOWED_CHAT_ID` or `TELEGRAM_CHAT_ID` (optional compatibility fallback)
- `ATEAM_BASE_URL` (optional, default `http://localhost:3000`)

Optional:

- `TELEGRAM_POLL_TIMEOUT_SEC` (default `45`)
- `ATEAM_REQUEST_TIMEOUT_MS` (default `60000`)
- `TELEGRAM_REQUEST_TIMEOUT_MS` (default `15000`)

If no allowlist is configured, the gateway can bootstrap itself from the first private chat that sends `/link`.

You can set them in your shell, or create `APPS/ATEAM/telegram-gateway/.env` (simple `KEY=value` format).

Tip: copy `APPS/ATEAM/telegram-gateway/.env.example` to `.env` and paste your real BotFather token.

## Run

1. Start ATEAM Server:

```powershell
cd APPS/ATEAM/Server
npm start
```

2. Start Telegram Gateway (in a new terminal):

```powershell
cd APPS/ATEAM/telegram-gateway
$env:TELEGRAM_BOT_TOKEN="YOUR_TOKEN"
$env:TELEGRAM_ALLOWED_USER_ID="8271166944"
$env:ATEAM_BASE_URL="http://localhost:3000"
npm start
```

## Behavior

- Uses long polling only (no webhooks).
- Accepts the configured Telegram allowlist, or lets the first private `/link` bootstrap the allowlist when none is set.
- Supports `TELEGRAM_CHAT_ID` compatibility for private-chat setups already used elsewhere in this repo.
- Maps `chat_id` -> `session_id = "tg_<chat_id>"`, `thread_id = "telegram"`.
- Logs all inbound and outbound messages as events in ATEAM via `POST /events/:sessionId`.
- Calls ATEAM assistant `POST /agent/command` for normal Telegram chat replies.
- Sends a user-visible fallback message when ATEAM times out or returns an empty reply, instead of failing silent.
- Supports `/help` and `/whoami` for quick remote verification.
- If orchestrator emits an `approval_requested` event:
  - Creates an approval via `POST /api/approvals`
  - Sends an inline keyboard (Approve / Reject)
  - Callback decisions call `POST /api/approvals/:id/decision` and then re-run orchestration.

## Local State

- The gateway stores the Telegram `getUpdates` offset in `APPS/ATEAM/telegram-gateway/.local/offset.json` so restarts do not replay old updates.
- When bootstrapped from Telegram, the linked operator/chat is persisted in `APPS/ATEAM/telegram-gateway/.local/allowlist.json`.

## Notes

- This gateway only replies in Telegram. It does **not** post externally or automate outbound actions beyond responding in Telegram.
