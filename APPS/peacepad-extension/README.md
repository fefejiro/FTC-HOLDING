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
- Session-cookie auth mode in v1.
- User must be signed into PeacePad API session for preflight checks.
