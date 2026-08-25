# Just Checking In Unity Layout

This folder is the canonical game source for the Just Checking In Unity app.

## Structure

- Scripts/Domain: Pure C# domain engine (no Unity runtime dependencies).
- Scripts/Application: Use-cases, orchestration, reducers, session controllers.
- Scripts/Infrastructure: Unity Services adapters, persistence, analytics adapters.
- Scripts/Presentation: MonoBehaviour UI and scene adapters.
- Scripts/Editor: Build/content tooling and validation utilities.
- Scenes: Unity scenes used by boot, shell, session, and settings flows.
- Prefabs: Cards, UI, environment, and effects assets.
- Content: JSON content source (decks, themes).
- Art/Audio/Materials/Settings: Presentation and configuration assets.

## Rules

- Keep domain logic deterministic and testable.
- Do not commit signing keys, passwords, or service secrets.
- Keep third-party assets recorded in THIRD_PARTY_ASSETS.md.
