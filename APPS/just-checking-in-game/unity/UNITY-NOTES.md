# UNITY-NOTES

## Baseline

- Target editor: Unity 6.3 LTS (latest patch available in team environment).
- Template: Universal 3D / URP.
- Orientation: Portrait.
- Scripting backend: IL2CPP.
- Architectures: ARM64.
- Input: New Input System.
- UI: uGUI + TextMeshPro.

## Product identities

- Android package: `com.ftcholding.justcheckingin`
- iOS bundle id: `com.ftcholding.justcheckingin`
- Product name: Just Checking In

## Security and privacy constraints

- Do not commit keystores, provisioning profiles, or secrets.
- Do not request microphone, camera, or location permissions for launch.
- Keep signing and environment-specific settings in env vars or external secret mounts.

## Architecture constraints

- Domain reducer and core session logic remain pure C# with no MonoBehaviour dependencies.
- Just Checking In app-specific logic stays outside FTC GameCore package.
- Remote session transport uses interface-based service boundary with mockable implementation.

## Initial deliverables

- Local package scaffold: `UNITY-PACKAGES/com.ftc.gamecore`
- App docs: `GAME-BRIEF.md`, `REMOTE-SESSION-DESIGN.md`, `SECURITY-PRIVACY.md`, `THIRD_PARTY_ASSETS.md`
- Build scripts: Android/iOS export and validation scripts under `scripts/`
