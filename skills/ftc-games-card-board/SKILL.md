---
name: ftc-games-card-board
description: Use when implementing or designing FTC card / board / dice / tile games — Whot! Online, Ayo (Mancala), Naija Ludo, Suwe, Naija Snakes & Ladders, or any 2D turn-based game with rules logic. Load before scaffolding card-game state machines, board representations, AI opponents, or matchmaking.
---

# FTC Games — Card / Board / Dice

Implementation skill for 2D turn-based titles. The Carrom Pool / Ludo Party playbook: traditional African game → digital → polished → monetised.

## Use When

- Scaffolding Whot! Online, Ayo, Naija Ludo, Suwe, or any traditional African game
- Implementing rules engines, turn state machines, AI opponents
- Designing async / pass-and-play / vs-bot multiplayer (no realtime)
- Polishing card / dice / tile animation pipelines

## Stack

- **Phaser 3** + TypeScript + Vite (default, same as runner skill).
- **Pure TS rules engine** under `src/rules/` — engine-agnostic, fully unit-tested with `vitest`. **Never** put rules in scenes.
- **State machine** via [`xstate`](https://xstate.js.org/) for turn flow (idle → drawing → playing → resolving → ended).
- **Supabase** for profiles + leaderboards + async match state.
- **No realtime infra** in the v1 of any title. Vs-bot + pass-and-play + async only.

## File Layout (canonical)

```
APPS/<game>/
  GAME-BRIEF.md
  src/
    main.ts
    rules/
      types.ts          # Card, Player, GameState
      engine.ts         # pure: applyMove(state, move) -> state
      validators.ts     # legal moves
      ai.ts             # bot policies (random, greedy, minimax)
      __tests__/
        engine.test.ts
        ai.test.ts
    state/
      machine.ts        # xstate machine
    scenes/
      BootScene.ts
      MenuScene.ts
      LobbyScene.ts     # mode select: vs bot / pass-and-play / async
      TableScene.ts     # the game table
      GameOverScene.ts
    ui/
      Card.ts
      Hand.ts
      DiscardPile.ts
      OpponentBar.ts
    systems/
      sfx.ts
      animations.ts     # deal / play / shuffle pipelines
```

## Hard Rules

1. **Rules engine is pure functions only.** No Phaser imports. No DOM. No randomness without seedable RNG.
2. **Every legal-moves function is unit-tested** with at least 10 cases (happy path, edge cases, illegal-move rejections).
3. **AI difficulty tiers** — easy (random valid), medium (greedy heuristic), hard (1-2 ply lookahead). Never ship without medium+.
4. **Animations are skippable.** User can tap to fast-forward any deal / shuffle / score animation.
5. **No silent rule changes** between updates without versioning game state (`stateVersion: number`).

## Animation Standards

- Card deal: 220ms ease-out, staggered 60ms per card.
- Card play: 280ms with arc; lift 20px, settle on pile.
- Score reveal: 400ms count-up, hold 800ms.
- Dice roll: physics-based 600-900ms, never deterministic-looking.
- Tile slide (Ayo / mancala): 180ms ease-in-out per hop.

## Title-Specific Notes

### Whot! Online (Q1)

- 54-card Whot deck. Ranks 1-14 across 5 shapes (Circle, Cross, Triangle, Square, Star) + 5 Whot wildcards.
- Special cards: 1 (hold-on), 2 (pick-2), 5 (pick-3), 8 (suspension), 14 (general market), Whot (request shape).
- Default mode v1: vs-bot single player with 3 difficulty tiers.
- Async multiplayer in v1.1 via Supabase row state.
- Cultural polish: pidgin VO clips on key plays ("Pick two!", "Whot!"), Naija drum SFX.

### Ayo / Oware (Q2)

- 12-pit, 2-row mancala. Standard Oware rules with capture-on-2-or-3.
- 100% solvable AI with minimax — keep depth ≤ 6 for mobile perf.
- Pan-African positioning (not Naija-only).

### Naija Ludo (Q3)

- 4-player Ludo with Naija board art, pidgin VO, Lagos / Abuja / PH / Enugu themed boards.
- Vs-bot + pass-and-play v1.
- Mirror Ludo Party's monetisation (board skins, dice skins, emote IAPs).

## Common Pitfalls

- **Rules in scenes** — refactoring nightmare. Always pure engine.
- **Tween-driven state** — state should drive animations, not the reverse.
- **Unseeded RNG** — breaks replays, breaks tests. Always pass an RNG into the engine.
- **AI on the main thread** — depth-3+ minimax must run in a Web Worker or yield to `requestAnimationFrame`.

## Build & Test

```powershell
Set-Location "C:\FTC HOLDING\APPS\<game>"
npm install
npm run test       # rules + AI unit tests
npm run build
```

## Trigger Phrases

- "whot game"
- "ayo / mancala"
- "naija ludo"
- "card game rules"
- "board game state"
- "turn-based"
