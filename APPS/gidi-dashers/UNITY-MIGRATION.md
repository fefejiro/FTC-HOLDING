# Gidi Dashers — Unity URP Migration Blueprint

**Decision:** Migrate from Phaser 3 web → Unity URP 3D low-poly stylised runner (Crossy Road / Subway Surfers visual tier, scaled for solo+AI build).
**Source of decision:** `DOCS/FTC-GAMES-SLATE.md` decision log (2026-05-05).
**Existing Phaser build stays alive** as `APPS/gidi-dashers/` — the web fallback + already-shipped TWA. Do not delete.
**New project root:** `APPS/gidi-dashers-unity/`.

---

## Goals

1. Learn Unity 3D end-to-end on a real shippable title (founder learning goal — explicit).
2. Reach feature parity with the Phaser version's core loop (3-lane runner, jump/slide, obstacles, pickups, score, HUD, game over).
3. Ship a Play Store internal-track build of the Unity version within 12 weeks.
4. Stylised low-poly visual quality on par with Crossy Road / Alto's Adventure tier — not Subway Surfers AAA tier.

## Non-Goals (this migration)

- Realtime multiplayer.
- Photorealistic graphics.
- iOS launch (Android-first; iOS later).
- Replacing the Phaser web build.
- Original character art (use Mixamo + asset-store low-poly for v1).

## Engine & Stack

- **Unity 2022.3 LTS** (Unity 6 once stable, but LTS-only for shipping titles).
- **URP** (Universal Render Pipeline) — never Built-in or HDRP for mobile.
- **Cinemachine** — camera follow + impulse for shake.
- **Input System (new package)** — never legacy `Input.GetKey`.
- **TextMeshPro** — all UI text.
- **Mixamo** — character + animations (free, redistributable).
- **Asset Store** — environment props + character pack (license must allow commercial redistribution in built games).
- Scripting backend: **IL2CPP**, ARM64 only (Play Store requirement).

Reference skill: `skills/ftc-games-unity-runner/SKILL.md`.

## Visual Target

- Stylised low-poly, flat-shaded with rim light or soft cel.
- Lagos / Naija setting cues: danfo bus shapes, market-stall obstacles, palm trees, jollof food pickups, naira coin pickups.
- Color palette: warm earth + saturated accents (mango orange, hibiscus red, palm green).
- Character: greybox Mixamo Y-Bot for v0; stylised Naija runner skin from asset-store + retexture for v1.

---

## Week-by-Week Plan (12 weeks)

### Week 1 — Tooling + greybox loop

- Install Unity Hub + Unity 2022.3 LTS + Android Build Support (NDK + SDK + JDK).
- Create project at `APPS/gidi-dashers-unity/` with **3D URP Mobile** template.
- Commit `.gitignore`, README, project folder structure.
- Set up Git LFS for `*.fbx *.png *.psd *.wav *.mp3 *.tga`.
- Configure quality tiers (Low/Medium/High) for mobile.
- Build Boot → Menu → Game → GameOver scene shells with additive load pattern.
- Greybox 3-lane player cube + ground plane + Cinemachine follow camera. Up-arrow / left / right / down placeholder input via Input System.
- **Exit criterion:** App boots on Pixel 7, cube switches lanes at 60fps.

### Week 2 — Lane controller + animation rig

- Replace cube with Mixamo `Y Bot` running animation.
- Animator Controller: `Idle → Running → (Jump | Slide | Stumble | Death)`.
- LaneSwitcher.cs with input buffering (150ms) + coyote (80ms) + body lean tilt.
- Jump (300ms arc) + Slide (500ms hitbox shrink) with Mixamo clips.
- ScriptableObject `BiomeDef` with lane positions, base speed, speed ramp curve.
- **Exit criterion:** Player runs forward, lane-switches with feel parity to Phaser version.

### Week 3 — Obstacle spawner + pooling

- ObstacleDef ScriptableObject (prefab + spawn weight + lane mask + safe-window rules).
- Spawner.cs using `UnityEngine.Pool.ObjectPool<T>`.
- 3 placeholder obstacle types (low cube, tall cube, slide-under-bar).
- DifficultyCurve ScriptableObject (animation curve asset, base × multiplier over time).
- Death sequence: Cinemachine Impulse shake + slow-mo + 1.0s death anim before scene transition.
- **Exit criterion:** Run survives 60s+ without GC spikes; obstacle waves never block all lanes.

### Week 4 — Pickups + score + HUD

- PickupDef SO (coin, multiplier, shield).
- HUD scene: score, distance, coins, pause button (TMP, no per-frame string alloc — `SetText(int)` + cached StringBuilder).
- Combo pickups + score milestone banners (1k / 5k / 10k / 25k).
- SaveData (PlayerPrefs wrapper): high score, total coins, settings.
- **Exit criterion:** Score + coin counters work, milestones fire SFX + banner.

### Week 5 — Audio + game-feel pass

- AudioBus + SfxBus singletons.
- Royalty-free SFX pack (asset store / freesound CC0): jump, slide, hit, coin, milestone, death, UI click.
- Music: 1 track for menu, 1 for gameplay (CC-BY or asset-store with redistribution).
- Hit-stop on impactful events (80-120ms `Time.timeScale = 0.05f`).
- Camera shake budget: max 1/sec.
- **Exit criterion:** Game-feel non-negotiables (skill checklist) all green.

### Week 6 — Naija visual replacement v1

- Buy or commission low-poly Naija pack (danfo bus, market stalls, palm trees, jollof, suya, naira coin).
- Replace placeholder obstacles + pickups.
- Replace Y-Bot greybox with stylised character (asset-store low-poly + retexture). Keep Y-Bot animations via Humanoid rig retargeting.
- URP lighting: directional sun + sky gradient; bake static lightmaps for environment.
- Disable real-time shadows on Mobile Low/Medium tier; blob-shadow under player.
- **Exit criterion:** First "this looks like a Lagos run" screenshot. Holds 60fps on Pixel 4a.

### Week 7 — Menu + GameOver + Pause flow

- Menu scene: title, play, settings, leaderboard placeholder, quit.
- GameOver scene: score, best, coins earned, retry, menu, share placeholder.
- Pause: `Time.timeScale = 0`, dim overlay, resume / restart / menu.
- Settings: music vol, sfx vol, quality tier toggle.
- Android back-button mapping via Input System (cancel action).
- **Exit criterion:** Full loop Menu → Game → GameOver → Menu works.

### Week 8 — Performance + device matrix

- Profile on Pixel 7, Pixel 4a, Tecno Camon (or closest available).
- Targets: < 80 draw calls, < 80k tris, < 256MB texture memory, 60fps default / 30fps fallback.
- SRP Batcher + GPU instancing on env props.
- Texture atlas / compression pass (ASTC for Android).
- Cold launch < 4s on mid-tier.
- **Exit criterion:** Frame-time graph clean on all 3 devices.

### Week 9 — Persistence + analytics + crash reporting

- Supabase auth-less leaderboard endpoint (anonymous high-score post; same backend the Phaser version uses).
- PostHog or Unity Analytics: `game_started`, `game_over`, `milestone_reached`, `session_pause`.
- Sentry or Unity Cloud Diagnostics for crash reporting.
- Privacy policy already live at `ftcholding.com/privacy/gidi-dashers`.
- **Exit criterion:** Forced-crash test reaches dashboard; analytics events visible in dev project.

### Week 10 — AdMob + IAP

- AdMob: banner on Menu + GameOver only, rewarded video on Continue (opt-in), interstitial every 3 game-overs (never within 30s).
- IAP: Remove Ads $2.99 (non-consumable), Coin Bundle $1.99 (consumable).
- Test IDs first, swap to live IDs only for closed beta and beyond.
- **Exit criterion:** Test ad shows; test IAP flow completes.

### Week 11 — Build + sign + internal track upload

- Player Settings: IL2CPP, ARM64 only, package id `com.ftcholding.gididashersunity` (different id from Phaser TWA — both can coexist on Play Console).
- Custom keystore `C:\FTC HOLDING\.secrets\ftc-games-keystore.jks`.
- Build .aab → upload to Play Console internal track.
- Listing copy + screenshots + feature graphic + 30s promo video.
- Data safety form + content rating (PEGI 3) + privacy policy URL.
- **Exit criterion:** Internal track build live; founder + 2 testers running it.

### Week 12 — Internal soak + polish

- 14-day soak window (per publishing skill rule).
- Crashlytics zero-out, fix any P0 / P1 reported.
- Promote to closed beta only when crash-free sessions ≥ 99% and D1 ≥ 35%.
- Decide ship v1 to production OR extend internal soak.
- **Exit criterion:** Closed-beta promotion decision logged in `DOCS/FTC-GAMES-SLATE.md`.

---

## Risks & Kill Criteria

| Risk | Mitigation |
|------|------------|
| Unity learning curve overruns budget | Cap each week's scope; pull future-week features only after current-week exit criteria pass |
| Asset-store visual quality below Crossy Road tier | Budget $200-400 for one premium low-poly pack; commission Naija reskins from a freelancer if needed |
| Mobile perf misses 60fps on Tecno tier | Drop to 30fps target on Low; shed shadows + reduce env props per chunk |
| Unity build size > 150MB | Switch to Play Asset Delivery; strip unused shaders / textures; ASTC-only |
| Founder bandwidth crunch | Phaser version stays live; no pressure to delete. Ship Unity v1 even if rough |

**Kill criteria:** If at end of Week 8 the game is below 30fps on Pixel 4a OR the visual quality is visibly below Crossy Road tier with no clear path forward, pause migration and either (a) hire a part-time Unity dev or (b) accept Phaser version as the shipping product and treat Unity work as pure learning.

---

## Coexistence with Phaser Version

- Phaser version (`APPS/gidi-dashers/`) keeps shipping as web + TWA.
- Unity version (`APPS/gidi-dashers-unity/`) ships under different package id.
- Both share the same Supabase leaderboard table → cross-version high scores.
- Eventually deprecate Phaser web version once Unity D1/D7 retention beats it for 60 days. Until then, both live.

---

## Cross-References

- `DOCS/FTC-GAMES-SLATE.md` — portfolio decision + log.
- `skills/ftc-games-slate/SKILL.md` — greenlight rules.
- `skills/ftc-games-unity-runner/SKILL.md` — implementation skill.
- `skills/ftc-games-publishing/SKILL.md` — release pipeline + gate metrics.
- `.github/agents/ftc-games-engine-dev.agent.md` — implementation agent.
- `.github/agents/ftc-games-publisher.agent.md` — release agent.
