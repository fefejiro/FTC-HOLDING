# SayWetin — Chrome Extension

Recognize any song playing in your browser tab and instantly see lyrics, cultural meaning, and artist context — powered by the SayWetin API.

## Status

- Extension build: verified
- API custom domain: `https://api.saywetin.app` (live)
- API health: `/health` returns `{"status":"ok"}`

## What it does

- Glass orb tap-to-listen UI (Shazam-style)
- Captures audio from the active browser tab via `chrome.tabCapture`
- Sends a 5–10s fingerprint to the SayWetin backend (ACRCloud recognition)
- Displays: track title, artist, album art, lyrics, and cultural analysis
- Tap any lyric line for deeper meaning
- Links to open the track on Spotify or YouTube

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


## Build
```
npm run build
```

## Load in Chrome
1. Run `npm run build`
2. Go to chrome://extensions
3. Enable Developer Mode
4. Click "Load unpacked" and select the `dist/` folder
