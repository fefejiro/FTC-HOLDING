# SayWetin — Chrome Extension

Recognize any song playing in your browser tab and instantly see the lyric, slang meaning, and cultural context behind it, powered by the SayWetin API.

## Status

- Extension build: verified
- API custom domain: `https://api.saywetin.app` (live)
- API health: `/health` returns `{"status":"ok"}`

## What it does

- Premium glass-orb tap-to-listen UI
- Captures audio from the active browser tab via `chrome.tabCapture`
- Sends a 5–10s fingerprint to the SayWetin backend (ACRCloud recognition)
- Displays: track title, artist, lyric, and meaning/context
- Tap any lyric line for deeper meaning
- Opens the fuller SayWetin experience for track follow-up

## Tech stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Chrome Manifest v3
- Build output: `dist/`

## Development

```bash
npm install
npm run build
```

Optional environment override for QA and staging:

```bash
VITE_SAYWETIN_API_BASE_URL=https://api.saywetin.app
```

Load `dist/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

### Mock mode

Append `?mock=1` to the extension popup URL to test UI without a real API call.

## Backend

- Primary API: `https://api.saywetin.app`
- Railway service URL (fallback): `https://saywetin-api.splendid-spirit.up.railway.app`
- QA override env var: `VITE_SAYWETIN_API_BASE_URL`

Extension ID (current): `fpephcboldiembegdnncdbfjedognhpl`

## Release

See [RELEASE-NOTES.md](./RELEASE-NOTES.md) and [WEBSTORE.md](./WEBSTORE.md) for store submission details.

## Documentation Policy

Documentation updates are now enforced in CI on pull requests.

- If shipping behavior changes in app code (`src/`, `public/`, build config), you must also update at least one documentation file.
- Guard workflow: `.github/workflows/docs-guard.yml`
- Guard script: `scripts/docs-guard.mjs`

## ChatGPT 4.1 Fallback

When Copilot premium data is exhausted, use the repo fallback prompts for strict, evidence-based execution:

- Master prompt: `.github/prompts/chatgpt41-fallback.prompt.md`
- QA prompt (Playwright E2E): `.github/prompts/chatgpt41-fallback-qa-e2e.prompt.md`
- Runbook: `docs/CHATGPT41-FALLBACK-RUNBOOK.md`
- IDE quick keywords: `/g41`, `/g41qa`
- Clipboard automation: `npm run g41:copy -- --task "..."`, `npm run g41qa:copy -- --task "..."`
- One-shot automation: `npm run g41:go -- --task "..."`, `npm run g41qa:go -- --task "..."`
- Independent audit automation: `npm run g41audit:go -- --task "..."`, `npm run g41audit:send -- --task "..."`

These prompts are designed to reduce directory hallucination and enforce verification discipline.


## Build
```
npm run build
```

## Load in Chrome
1. Run `npm run build`
2. Go to chrome://extensions
3. Enable Developer Mode
4. Click "Load unpacked" and select the `dist/` folder
