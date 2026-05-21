# Client Handoff

## If You Don't Have A Bot Or Keys Yet

Use this quick bootstrap before handoff.

1. Create bot in Telegram:
	- Open `@BotFather`.
	- Run `/newbot`.
	- Save bot token as `BOT_TOKEN`.
2. Get admin Telegram ID(s):
	- Open `@userinfobot`.
	- Send any message.
	- Copy numeric ID into `ADMIN_USER_IDS`.
3. Create football data key:
	- Use either API-SPORTS (API-Football) or football-data.org.
	- Copy key into `API_FOOTBALL_KEY`.
4. Optional:
	- Set `ODDS_API_KEY` for odds enrichment.
	- Set `CHANNEL_ID` for posting picks to channel.

## Share with Uby

1. Share live bot link: `https://t.me/<your_bot_username>`
2. Share live channel link: `https://t.me/<your_channel_username>`
3. Let Uby test as normal user first.
4. Use `/whoami` to retrieve Uby numeric Telegram ID.
5. Add Uby ID to `ADMIN_USER_IDS` only when approved.
6. Redeploy after env update.

## Railway Go-Live Sequence

Fast path (recommended):

1. Run the automation script:
	- `pwsh ./scripts/uby_go_live.ps1 -Deploy`
2. Enter prompted values:
	- `AdminUserIds`
	- `BotToken`
	- `ApiFootballKey`
3. Optional script args:
	- `-ChannelId "-1001234567890"`
	- `-OddsApiKey "..."`
	- `-AllowOutsideWindow` (only if you intentionally override your deployment window)

Manual path:

1. Set variables on service `bushy-bet-bot` in `production`:
	- `BOT_MODE=webhook`
	- `BOT_TOKEN=<real token>`
	- `ADMIN_USER_IDS=<comma-separated numeric IDs>`
	- `WEBHOOK_BASE_URL=https://bushy-bet-bot-production.up.railway.app`
	- `WEBHOOK_SECRET=<strong random string>`
	- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
	- `API_FOOTBALL_KEY=<real key>`
	- `CHANNEL_ID=<channel id or @username>` (optional)
	- `ODDS_API_KEY=<key>` (optional)
2. Deploy during allowed window.
3. Set Telegram webhook:
	- `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://bushy-bet-bot-production.up.railway.app/webhook/<WEBHOOK_SECRET>`
4. Verify:
	- `GET /health` returns `status: ok`.
	- Bot commands: `/start`, `/fixtures`, `/today`, `/results`, `/stats`.
	- Admin commands: `/whoami`, `/postpick`, `/report`.

## Never Share

- BOT_TOKEN
- .env files
- API_FOOTBALL_KEY
- ODDS_API_KEY
- DATABASE_URL
- hosting credentials
- affiliate dashboard credentials
