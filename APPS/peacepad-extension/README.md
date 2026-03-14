# PeacePad Extension (MV3)

## Purpose
Extension-first integration surface for PeacePad pre-send mediation.

## Supported sites (v1)
- WhatsApp Web
- Gmail
- Slack Web

## Behavior (current)
- Silent background monitoring of active compose fields.
- Debounced checks after typing pauses.
- Pre-send gate on Enter for uncached drafts.
- Local rules classify clear safe / mild / strong cases first.
- Live API fallback is used only for ambiguous drafts or richer remote analysis.
- Threshold-based intervention modal only when risk warrants it.
- Per-site auto-check can be toggled in extension popup.

## Development
```powershell
npm install
npm run build
npm run test
```

## Load extension
1. Open Chrome -> `chrome://extensions`
2. Enable Developer mode
3. Load unpacked -> `APPS/peacepad-extension`

## Runtime assumptions
- Session-cookie auth or API-key auth.

## WhatsApp test flow
1. Run `npm run build` from `APPS/peacepad-extension`.
2. In `chrome://extensions`, click **Reload** on `PeacePad Pre-Send`.
3. Open the extension popup on `https://web.whatsapp.com`.
4. Confirm:
   - `Current Site` shows `whatsapp`
   - `Enable automatic monitoring` is on
   - popup says the tab is ready
   - API settings are correct for your machine if you want ambiguous fallback tests
5. Type one of these messages in a WhatsApp chat:
   - Safe control: `Hey, I am outside.`
   - Soft escalation: `You always pick up the kid late.`
   - Strong escalation: `Fuck you. You never care about the kids.`
   - Ambiguous API fallback: `When are you going to send money for the kids' school supplies? It's been weeks.`
6. Open WhatsApp DevTools and check the **Console** for `[PeacePad]` logs.

## Debug logs to expect
- `content script loaded`
- `draft detected`
- `preflight triggered`
- `preflight request sent`
- `local preflight result received`
- `intervention decision returned`

## Service worker logs to expect
- `local rule matched: safe`
- `local rule matched: mild`
- `local rule matched: strong`
- `local rule score ambiguous, using api fallback`
- `api fallback success`

## Notes
- WhatsApp host access is declared directly in `manifest.json`; you do not need to manually toggle the site row in Chrome.
- Opening the popup on a supported site now forces content-script injection for the current tab, so you do not need a manual page refresh after every extension reload.
- If nothing happens, inspect the extension **service worker** console and the WhatsApp page console.
