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
- Pre-send gate on Enter and send button for uncached drafts.
- Live API preflight analysis is the decision source for this pass.
- Threshold-based intervention modal only when risk warrants it.
- WhatsApp uses **Apply Suggested** to safely replace the composer draft without auto-sending.
- Per-site auto-check can be toggled in extension popup.
- Popup includes build stamp plus debug trace export and clear actions.

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
   - popup shows the `root-apps` build stamp
   - popup says WhatsApp uses Apply Suggested for safe review before sending
5. Type one of these messages in a WhatsApp chat:
   - Safe control: `Hey, I am outside.`
   - Soft escalation: `You always pick up the kid late.`
   - Strong escalation: `Fuck you.`
6. For `Fuck you.`:
   - the modal should appear
   - the primary button should say **Apply Suggested**
   - clicking it should replace the composer draft and keep it unsent
   - you should manually press send after review
7. If behavior is wrong, click **Copy Debug Trace** in the popup and paste the trace back into the thread.

## Debug logs to expect
- `content_loaded`
- `draft_detected`
- `background_check_scheduled`
- `send_gate_intercepted`
- `preflight_requested`
- `preflight_result_api`
- `intervention_decision`
- `modal_opened`
- `apply_suggested_clicked`
- `composer_replace_verified`
- `trace_exported`

## Notes
- WhatsApp host access is declared directly in `manifest.json`; you do not need to manually toggle the site row in Chrome.
- Opening the popup on a supported site forces content-script injection for the current tab.
- If nothing happens, inspect the extension service worker console, the WhatsApp page console, and use the popup trace export.