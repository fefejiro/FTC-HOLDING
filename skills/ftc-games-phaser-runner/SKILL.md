---
name: ftc-games-phaser-runner
description: Use when implementing or polishing a Phaser 3 endless runner / arcade game in the FTC Games slate (e.g., Gidi Dashers). Load before editing GameScene, MenuScene, GameOverScene, obstacle / pickup spawners, lane logic, or game-feel polish (input buffering, camera shake, hit-stop, death animation).
---

# FTC Games — Phaser Runner / Arcade

Implementation skill for 2D / 2.5D endless runner and arcade titles built on Phaser 3 + TypeScript + Vite. Reference build: `APPS/gidi-dashers`.

## Use When

- Editing a Phaser 3 scene under `APPS/<game>/src/scenes/`
- Adding obstacle / pickup spawners, lane logic, parallax background
- Polishing game-feel (input buffering, coyote timing, hit-stop, screen shake)
- Wiring SFX / music for an arcade title
- Diagnosing frame-rate / GC issues on low-end Android

## Stack

- **Phaser 3** (latest stable), **TypeScript strict**, **Vite**.
- **Tone.js** or Web Audio for procedural SFX before licensing samples.
- **localStorage** key `ftc.<game>.best` for high score; never write more than once per game-over.
- Cloudflare Pages for web deploy. Bubblewrap → TWA for Android.

## File Layout (canonical)

```
APPS/<game>/
  GAME-BRIEF.md
  index.html
  package.json
  vite.config.ts
  src/
    main.ts
    config.ts            # Phaser game config, scale, physics
    scenes/
      BootScene.ts       # set scale, input, key bindings
      PreloadScene.ts    # generate procedural textures, load assets
      MenuScene.ts
      GameScene.ts       # core loop
      GameOverScene.ts
    systems/
      sfx.ts             # procedural audio module
      lanes.ts           # lane positions, switching, buffering
      spawner.ts         # obstacles + pickups
      difficulty.ts      # tempo curve / director
    types.ts
  public/
    icons/
  scripts/
    android-live-loop.ps1
```

## Game-Feel Non-Negotiables

Every runner / arcade title must implement:

1. **Input buffering** — queue lane-switch / jump / slide inputs up to 120ms before they're legal.
2. **Coyote timing** — collision forgiveness window 60-120ms after a lane switch.
3. **Hit-stop** — freeze 80-120ms on impactful events (pickup combo, big obstacle near-miss).
4. **Camera shake budget** — max one shake per second, peak ≤ 6px, decay < 200ms. Use `this.cameras.main.shake(duration, intensity)`.
5. **Death animation ≥ 700ms** before scene transition. Particle burst + slowdown + flash.
6. **Score milestone banners** at 1k / 5k / 10k / 25k. Slide in 200ms, hold 600ms, slide out 200ms.
7. **Warning arrows** for incoming high-priority obstacles (off-screen above) — colour matches obstacle type.
8. **Speed ramp** — linear from `baseSpeed` to `baseSpeed * 1.8` over 90s, then plateau.
9. **Procedural lane spawning** with authored "safe-window" patterns (never two simultaneous obstacles in all 3 lanes).
10. **Pause** on Android back-button + on visibility-change.

## Performance Budget (Android API 24+, low-end)

- Cold launch < 3s on Pixel 4a tier.
- Steady 60fps; never drop below 50fps for > 200ms.
- Active sprite count < 80.
- No allocations in `update()` hot path — pre-pool obstacles / pickups / particles.
- Texture atlases ≤ 1024×1024 for low-end safety.
- `pixelArt: false` unless game is intentionally pixel — antialiased text and sprites by default.

## Scene Conventions

- **MenuScene**: animated background (parallax + floating particles), title, single primary CTA, character / theme select, best-score, settings (audio toggle).
- **GameScene**: HUD top-left score / top-right best, lane debug only in dev, no console.log in production builds.
- **GameOverScene**: dark gradient overlay, score card, RUN AGAIN as primary, MENU as secondary.

## SFX Module Pattern

Every game exports a `sfx` object from `systems/sfx.ts` with at minimum:

```ts
export const sfx = {
  init(): void;
  setMuted(m: boolean): void;
  laneSwitch(): void;
  pickup(): void;
  combo(n: number): void;
  hit(): void;
  death(): void;
  milestone(): void;
  uiClick(): void;
};
```

All procedural Web Audio first. Sample packs only when procedural ceiling is hit.

## Common Pitfalls

- **Camera shake on every hit** — feels cheap. Reserve for death + 5+ combos.
- **Letter-badge obstacles** — placeholder only; replace with sprite pass before internal track.
- **Tween storms** — multiple tweens on the same target without `killTweensOf` cause animation tearing.
- **Physics bodies on every particle** — use Phaser Particle Emitter, not Arcade physics.
- **Reading `localStorage` in `update()`** — read once in `create()`, write once in game-over.

## Build & Test

```powershell
Set-Location "C:\FTC HOLDING\APPS\<game>"
npm install
npm run build
npx wrangler pages deploy dist --project-name <game>
# Android
.\scripts\android-live-loop.ps1
```

## Trigger Phrases

- "polish gidi dashers"
- "endless runner"
- "lane switching"
- "phaser game"
- "game feel"
- "screen shake"
- "input buffering"
