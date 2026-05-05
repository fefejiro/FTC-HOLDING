# Gidi Dashers

Lagos endless runner. Dodge danfo, molue, LASTMA. Stack naira.

**Studio:** FTC Holding  
**Showcase:** unalabs.cloud/gidi-dashers (planned)  
**Play Store package:** `com.ftcholding.gididashers`  
**Status:** v0.1.0 — Hour 0 scaffold

## Stack

- Phaser 3 + TypeScript + Vite
- PWA (vite-plugin-pwa) → wrapped as TWA for Play Store via Bubblewrap
- Optional Supabase leaderboard (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- localStorage save (high score, naira stash, unlocked characters)

## Run locally

```powershell
cd "C:\FTC HOLDING\APPS\gidi-dashers"
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```powershell
npm run build
npm run preview
```

`dist/` is the static PWA bundle. Deploy to Cloudflare Pages.

## Controls

- Swipe left/right — switch lane
- Swipe up / tap — jump
- Swipe down — slide
- Keyboard: arrows + space

## Game design v1

- 3-lane runner, 360x640 portrait, scales to fit
- Obstacles: Molue, Danfo, Okada, Pothole, LASTMA
- Pickups: ₦100 / ₦500 / ₦1000 notes
- Power-ups: Agbero Shield, Suya Magnet, Fuel Boost, Keke Jetpack
- Characters: Tunde (free), Amaka (₦5k), Baba Wahala (₦50k)
- Difficulty: linear speed ramp + tighter spawn cadence

## Roadmap

- v0.1 — scaffold, placeholder art (this commit)
- v0.2 — real sprites, audio, polish
- v0.3 — PWA + TWA Android wrap, Play Store internal track
- v0.4 — Supabase leaderboard live + portal
- v1.0 — Production launch (NG-only)
- v1.1 — Daily missions, AdMob rewarded
- v1.2 — Abuja / PH city pack
- v1.3 — IAP

## Credits

Concept, design, code: FTC Holding.  
Inspired by Lagos hustle. Built without ads or trackers in v1.
