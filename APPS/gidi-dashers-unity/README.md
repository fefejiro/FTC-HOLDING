# Gidi Dashers — Unity URP

Unity 2022.3 LTS + URP migration target. See `../gidi-dashers/UNITY-MIGRATION.md` for the week-by-week plan, and `../../skills/ftc-games-unity-runner/SKILL.md` for implementation rules.

This folder is a placeholder until Unity Hub + Unity Editor are installed and the project is created via Hub UI (`3D URP Mobile` template).

## Status

- [ ] Unity Hub installed
- [ ] Unity 2022.3 LTS + Android Build Support installed
- [ ] Project created at this path with `3D URP Mobile` template
- [ ] Folder structure scaffolded per skill (`Assets/_Game/...`)
- [ ] Git LFS configured
- [ ] Boot → Menu → Game → GameOver scene shells
- [ ] First Pixel 7 build green

## Companion (Phaser web build)

`../gidi-dashers/` — the live Phaser 3 + TS + Vite version, shipping as web + TWA. Stays alive throughout the migration.

## Key files (post-scaffold)

- `Assets/_Game/Scripts/Runtime/Player/LaneSwitcher.cs`
- `Assets/_Game/Scripts/Runtime/World/Spawner.cs`
- `Assets/_Game/Scripts/ScriptableObjects/BiomeDef.cs`
- `Assets/_Game/Scripts/ScriptableObjects/DifficultyCurve.cs`
- `Assets/_Game/Scenes/Boot.unity` — bootstrap, then additive-load Menu

## Build outputs

- `Builds/Android/gidi-dashers-unity-<version>.aab`
- Signing keystore: `C:\FTC HOLDING\.secrets\ftc-games-keystore.jks` (gitignored)
