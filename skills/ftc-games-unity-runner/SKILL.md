---
name: ftc-games-unity-runner
description: Use when implementing or polishing a Unity URP 3D / stylised low-poly runner / arcade game. Reference target APPS/gidi-dashers (Unity migration). Load before any Unity scene work, character controller, ScriptableObject design, asset-store integration, Mixamo animation wiring, or mobile build / signing for Android Play Store.
---

# FTC Games — Unity 3D Runner / Arcade

Implementation skill for stylised low-poly 3D runner titles built in **Unity 2022 LTS+** with **URP**, mobile-first, Android-focused, Crossy-Road-tier visual target.

## Use When

- Editing a Unity scene under `APPS/<game>/Assets/`
- Adding character controllers, lane logic, obstacle spawners, parallax cameras
- Wiring Mixamo animations, asset-store packs, Cinemachine cameras, post-processing
- Building Android `.aab` for Play Store
- Diagnosing frame-rate / draw-call issues on low-end Android

## Stack

- **Unity 2022.3 LTS** or newer (LTS only — avoid Tech Stream for shipping titles).
- **URP** (Universal Render Pipeline) — never Built-in or HDRP for mobile.
- **Cinemachine** for camera follow.
- **Input System** package (new) — never legacy `Input.GetKey` for shipping.
- **TextMeshPro** for all UI text.
- **Addressables** for asset streaming once project > 200MB.
- **Mixamo** for character animation library (free, redistributable).
- **Asset Store** packs only with commercial redistribution licence.

## Project Structure (canonical)

```
APPS/<game>/                          # Unity project root
  Assets/
    _Game/                            # all our code & assets — leading underscore to sort first
      Scripts/
        Runtime/
          Player/                     # PlayerController, LaneSwitcher, JumpSlide
          World/                      # Spawner, Difficulty, Parallax, BiomeManager
          UI/                         # MenuController, HUDController, GameOverController
          Audio/                      # SfxBus, MusicBus
          Persistence/                # SaveData, PlayerPrefsWrapper
          Systems/                    # GameLoop state machine, EventBus
        ScriptableObjects/
          ObstacleDef.asset.cs
          PickupDef.asset.cs
          BiomeDef.asset.cs
          DifficultyCurve.asset.cs
        Editor/                       # editor-only tools
      Prefabs/
        Player/
        Obstacles/
        Pickups/
        Environment/
        UI/
      ScriptableObjects/              # .asset instances
      Scenes/
        Boot.unity
        Menu.unity
        Game.unity
        GameOver.unity
      Materials/
      Models/
      Animations/
      Audio/
      Settings/                       # URP asset, quality settings
    Plugins/                          # third-party
    AssetStore/                       # gitignored — re-import from manifest
  Packages/
    manifest.json
  ProjectSettings/
  .gitignore
  GAME-BRIEF.md
  UNITY-NOTES.md
```

## Hard Rules

1. **URP only.** Never Built-in or HDRP for mobile titles.
2. **No singletons except `GameLoop`, `AudioBus`, `SaveData`.** Use ScriptableObject events / channels for cross-system comms.
3. **No `Update()` polling for input.** Use the new Input System with action callbacks.
4. **No `GameObject.Find` / `FindObjectOfType` in `Update`.** Cache on Awake/Start.
5. **No `Instantiate`/`Destroy` in `Update` hot path.** Use object pools (`UnityEngine.Pool.ObjectPool<T>`).
6. **All gameplay tunables on ScriptableObjects**, not hard-coded floats.
7. **No allocations in hot path** — no `new List<T>()`, no LINQ in `Update`, no string concatenation per frame.
8. **Mobile-first quality settings** — disable shadows on `Low` tier, target 60fps, fall back to 30fps gracefully.
9. **No git-LFS-less binary commits** — Unity binaries (large textures, audio) require Git LFS.
10. **Asset Store assets** stored under `Assets/AssetStore/` and **gitignored**; re-import via documented manifest.

## Mobile Performance Budget

- **Target:** Pixel 4a / Tecno Camon 18 tier — 60fps default, 30fps fallback on `Low` quality tier.
- **Draw calls:** < 80 per frame (use SRP Batcher + GPU instancing).
- **Triangles on screen:** < 80k.
- **Texture memory:** < 256MB total at runtime.
- **APK size target:** < 80MB base + Play Asset Delivery for extras.
- **Cold launch:** < 4s on mid-tier Android.
- **No real-time shadows on mobile Low/Medium tiers.** Bake or fake with blob shadows.

## Game-Feel Non-Negotiables (parity with Phaser skill)

1. Input buffering — accept lane-switch / jump up to 150ms before legal.
2. Coyote timing — 80ms grace after lane edge.
3. Hit-stop — 80-120ms `Time.timeScale = 0.05f` then restore on impactful events.
4. Camera shake via Cinemachine `Impulse` source — max one per second.
5. Death sequence ≥ 1.0s with particle burst + slow-mo + camera dolly before transition.
6. Score milestone banners at 1k / 5k / 10k / 25k.
7. Speed ramp on a `DifficultyCurve` ScriptableObject (animation curve asset).
8. Procedural spawning with authored "safe-window" patterns.
9. Pause on focus-loss + Android back-button.

## Lane Movement Pattern

- **Lanes as data:** `BiomeDef.lanePositions: Vector3[]` (typically `[-2.5, 0, 2.5]` on X).
- **Movement:** lerp the player's local X to target lane over 0.18s with `EaseOutCubic`.
- **Body lean / tilt** during the lerp using `transform.Rotate` on Z, peak ±15°, settle to 0.
- **Animator parameter** `LaneTilt` for subtle hand/torso lean from Mixamo.

## Animation Setup (Mixamo)

1. Download free Mixamo character (`Y Bot` / `X Bot` for greybox).
2. Animations: `Running.fbx`, `Jumping.fbx`, `Sliding.fbx`, `Stumble Backwards.fbx`, `Death From Front.fbx`, `Idle.fbx`.
3. Import as Humanoid rig.
4. Animator Controller with states: `Idle → Running → (Jump | Slide | Stumble | Death)`.
5. Use `Animator.CrossFade` with 0.08-0.12s transitions for runner snappiness.

## Build & Sign (Android)

```powershell
# From Unity Hub: Build Settings → Android → Build (.aab)
# Signing config: Player Settings → Publishing Settings → Custom Keystore
#   Keystore: C:\FTC HOLDING\.secrets\ftc-games-keystore.jks (gitignored)
#   Alias: ftc-games
# Output: APPS/<game>/Builds/Android/<game>-<version>.aab
```

## CI / Build Recipe (later)

- Use Unity Cloud Build OR a local PowerShell script invoking `Unity.exe -batchmode -nographics -executeMethod Build.Android`.
- Don't commit Library/, Temp/, Logs/, UserSettings/, MemoryCaptures/, obj/, *.csproj, *.sln.

## Common Pitfalls

- **Built-in render pipeline** for "just to start" — switching to URP later is painful. Start URP from day 1.
- **Hard-coded lane Xs scattered across scripts** — put them on a `BiomeDef`.
- **String concatenation in HUD** (`score.ToString()` per frame) — use TMP `SetText` with an `int` and a cached `StringBuilder`.
- **Real-time shadows on mobile** — kill perf instantly. Bake everything static, blob-shadow the player.
- **Single mega-scene** — split Boot / Menu / Game / GameOver and use additive loads.
- **Unity Free splash screen left on** — disable in Player Settings (requires Plus/Pro) or accept it for v1.

## Trigger Phrases

- "unity 3d game"
- "gidi dashers unity"
- "low poly runner"
- "mixamo animation"
- "URP mobile"
- "android build aab"
