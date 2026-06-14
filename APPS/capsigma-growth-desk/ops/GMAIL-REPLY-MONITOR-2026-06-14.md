# Gmail Reply Monitor - 2026-06-14

Status: deployed and configured. Production callback OAuth is blocked by
Google redirect allow-listing, so the supported connection path is local
loopback OAuth plus encrypted production token import.

## What Was Added

- Gmail OAuth start endpoint: `/api/mailbox/gmail/start`
- Gmail OAuth callback endpoint: `/api/mailbox/gmail/callback`
- Gmail mailbox status endpoint: `/api/mailbox/gmail/status`
- Gmail reply sync endpoint: `/api/mailbox/gmail/sync`
- Existing Job Reply Agent Gmail token import: `npm run gmail:import-job-token`
- Local Gmail connector command: `npm run gmail:connect-local`
- Production reply sync command: `npm run prod:sync-replies`
- Encrypted token storage in D1 using `TOKEN_ENCRYPTION_KEY`
- Reply dedupe by provider/message id
- Reply matching against sent proof by intended or actual recipient
- Reply classification into the existing attention queue

## Production Configuration

`npm run prod:doctor` now reports:

- Gmail OAuth configured: `true`
- Gmail connected: `false`
- Redirect URI: `https://capsigma-growth-desk.pages.dev/api/mailbox/gmail/callback`

The production OAuth approval URL was opened in the browser, but Google returned:

```text
Error 400: redirect_uri_mismatch
```

That means Google has not authorized:

```text
https://capsigma-growth-desk.pages.dev/api/mailbox/gmail/callback
```

The local connector avoids this by using the already-authorized desktop callback
from the Job Reply Agent:

```text
http://127.0.0.1:3007
```

## Required Human Step

First try importing the existing Job Reply Agent Gmail token:

```powershell
npm run gmail:import-job-token
```

If the existing refresh token has expired, run:

```powershell
npm run gmail:connect-local
```

Approve Gmail read-only access for `fejiro.efiuvwere@gmail.com` in the browser
window that opens. The script exchanges the local OAuth code and imports the
refresh token into production through `/api/mailbox/gmail/import-token`.

Alternative: add this authorized redirect URI to the OAuth client, then use the
Growth Desk `Connect Gmail` button:

```text
https://capsigma-growth-desk.pages.dev/api/mailbox/gmail/callback
```

Then click `Connect Gmail` again.

## After Connection

Click `Sync replies` in the Replies tab, or run:

```powershell
npm run prod:sync-replies
```

Successful sync should:

- import recent inbox messages,
- dedupe existing Gmail messages,
- match replies to sent proof,
- classify replies,
- surface positive or important replies in the human-attention queue.
