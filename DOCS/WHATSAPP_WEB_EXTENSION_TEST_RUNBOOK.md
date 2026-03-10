# PeacePad WhatsApp Web Test Runbook

## What you need
- Chrome browser
- WhatsApp Web (`https://web.whatsapp.com`)
- Built extension from this repo
- PeacePad API reachable at one of:
  - `https://api.peacepad.ca` (recommended for shared testing)
  - `http://localhost:5000` (local backend)

## Backend requirements (must have)
1. Enable preflight endpoint:
   - `FEATURE_EXTERNAL_PREFLIGHT_API=true`
2. Auth mode (pick one):
   - Session cookie mode: log in to PeacePad in browser
   - API key mode: set `PEACEPAD_ACTIONS_API_KEY=<your-key>` on backend and enter same key in extension popup
3. CORS for extension origin:
   - Production API: add extension origin to `CORS_ALLOWED_ORIGINS`
     - Example: `CORS_ALLOWED_ORIGINS=chrome-extension://<your-extension-id>,https://peacepad.ca,...`
   - Local dev API: extension origins are allowed automatically in non-production.

## Build steps (already validated)
From repo root:

```powershell
npm.cmd --prefix PACKAGES/peacepad-sdk run build
npm.cmd --prefix APPS/peacepad-extension run build
```

## Load extension
1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select `APPS/peacepad-extension`
5. Copy the extension ID (if testing against production CORS, this ID is required)

## Configure extension
1. Click PeacePad extension icon
2. Set **API Base URL**:
   - `https://api.peacepad.ca` or `http://localhost:5000`
3. Optional: set **API Key** (if using API-key auth mode)
4. Ensure **auto-check** is enabled for WhatsApp

## WhatsApp test flow
1. Open `https://web.whatsapp.com`
2. Focus a chat input
3. Type a low-risk message:
   - `Hey, I am outside.`
   - Expected: no popup
4. Type a soft-escalation message:
   - `You always pick up the kid late.`
   - Expected: intervention popup with calmer suggestion
5. Type a high-risk message:
   - `Fuck you. You never care about the kids.`
   - Expected: immediate intervention popup

## Expected UX behavior
- Silent background checks (debounced)
- No popup for clearly safe drafts
- Popup only when risk threshold is crossed
- Modal actions:
  - Use Suggested
  - Edit Suggested
  - Send Original
  - Cancel

## Quick troubleshooting
- `401 Unauthorized`:
  - Session mode: ensure you are logged in to PeacePad
  - API key mode: verify `PEACEPAD_ACTIONS_API_KEY` and popup key match
- CORS errors in extension console:
  - Add extension origin to `CORS_ALLOWED_ORIGINS`
  - Restart backend after env changes
- No popup at all:
  - Confirm auto-check enabled in popup
  - Confirm API Base URL is correct
  - Check `FEATURE_EXTERNAL_PREFLIGHT_API=true`
