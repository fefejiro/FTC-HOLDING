---
name: ftc-games-slate
description: Use when making FTC Games portfolio-level decisions — picking the next title, evaluating a new game idea, choosing an engine, or scoping a brief. Load before scaffolding any game under APPS/.
---

# FTC Games Slate

Portfolio-level skill for FTC's games line. Before scaffolding a new game or migrating an engine, read `DOCS/FTC-GAMES-SLATE.md` and confirm fit.

## Use When

- Request mentions: new game idea, next title, what should we build, engine migration, Unity vs Phaser, monetisation strategy
- Scoping a `GAME-BRIEF.md` for a new title
- Deciding whether to invest in 3D / multiplayer / live-ops
- Reviewing whether a current title should ship, pivot, or be killed

## Hard Rules

1. **Engine = right tool for the title.** Phaser 3 is the default for 2D / cards / boards. Unity URP is allowed for 3D / stylised low-poly / runner titles when the brief justifies it. Engine choice is logged in `GAME-BRIEF.md`.
2. **No realtime multiplayer in Q1-Q3.** Infra cost too high. Async / turn-based / leaderboards only.
3. **No GPL / AGPL deps.** MIT / Apache-2.0 / BSD only. Unity Asset Store assets must allow commercial redistribution in built games.
4. **Cultural moat OR proven genre OR explicit learning goal.** Every greenlit title is one of:
   - A Naija / pan-African traditional game (Whot, Ayo, Suwe, Ludo, Snakes & Ladders).
   - A proven cash-flow genre (bubble shooter, match-3, sudoku) with a regional cosmetic skin.
   - A stylised arcade / runner with a strong cultural setting (Gidi Dashers, future Lagos-set titles).
   - A **learning project** with a comp benchmark and a kill criterion stated.
5. **No loot boxes. No pay-to-win** in skill / board / card games.
6. **Learning value counts.** A title may be greenlit primarily for skill-building (e.g. first Unity 3D title) — must still have a comp benchmark and a kill criterion.

## Greenlight Checklist

Before a title gets a folder under `APPS/`:

- [ ] Comp benchmark named (existing top-100 app it competes with or learns from).
- [ ] Cultural moat OR genre justification OR explicit learning goal stated.
- [ ] Engine chosen: Phaser 3 (2D default) | Unity URP (3D / stylised low-poly) | other (justify).
- [ ] Solo + AI buildable in ≤ 16 weeks to internal track (or longer if explicitly a learning project).
- [ ] Monetisation path identified (rewarded ads / IAP / cosmetic) — may be "none, learning project".
- [ ] Min device target stated (Android API 24+ default).
- [ ] Kill criteria stated.

If any box is empty, do not scaffold — return the gap to the user.

## Current Slate (verify against `DOCS/FTC-GAMES-SLATE.md`)

| Q | Title | Engine | Status |
|---|-------|--------|--------|
| Q1 | Gidi Dashers | Unity URP (3D low-poly) | Migrating |
| Q1 | Whot! Online | Phaser 3 | Scaffold next |
| Q2 | Ayo (Mancala) | Phaser 3 | Planned |
| Q2 | Bubble Shooter Naija | Phaser 3 | Planned |
| Q3 | Naija Ludo | Phaser 3 | Planned |
| Q3 | Live ops + cross-portfolio | All | Planned |

## High-Effort Tier (attempt only with explicit founder call + learning rationale)

- Realtime sports skill (8 Ball Pool tier).
- AAA-grade 3D runner (Subway Surfers tier).
- MMO / RTS / live-service strategy.
- Console / Steam launches.
- Original IP without a comp benchmark.

## When User Asks for a New Game

1. Read `DOCS/FTC-GAMES-SLATE.md`.
2. Score against the Greenlight Checklist.
3. Pick engine (default Phaser 3; Unity URP if 3D / stylised low-poly justified).
4. If it displaces a slate item, propose the swap explicitly.
5. Load the matching implementation skill: `ftc-games-phaser-runner`, `ftc-games-card-board`, or `ftc-games-unity-runner`.
6. Create `APPS/<game>/GAME-BRIEF.md`.

## When User Asks for a New Game

1. Read `DOCS/FTC-GAMES-SLATE.md`.
2. Score the idea against the Greenlight Checklist.
3. If it displaces a slate item, propose the swap explicitly with rationale.
4. If approved, run `skills/ftc-games-phaser-runner` (runner / arcade) or `skills/ftc-games-card-board` (cards / board) to scaffold.
5. Create `APPS/<game>/GAME-BRIEF.md` from the template in the slate doc.

## Trigger Phrases

- "should we build X game"
- "next FTC game"
- "migrate to Unity"
- "FTC Games portfolio"
- "Naija game idea"
