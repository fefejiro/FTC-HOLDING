---
name: ftc-games-slate
description: Use when making FTC Games portfolio-level decisions — picking the next title to build, deciding whether to migrate engines, evaluating a game idea against the slate, or scoping a new game brief. Load before starting any new game project under APPS/ or before recommending engine migrations (Phaser → Unity, etc.).
---

# FTC Games Slate

Portfolio-level skill for FTC's games line. Before scaffolding a new game or migrating an engine, read `DOCS/FTC-GAMES-SLATE.md` and confirm fit.

## Use When

- Request mentions: new game idea, next title, what should we build, engine migration, Unity vs Phaser, monetisation strategy
- Scoping a `GAME-BRIEF.md` for a new title
- Deciding whether to invest in 3D / multiplayer / live-ops
- Reviewing whether a current title should ship, pivot, or be killed

## Hard Rules

1. **No 3D / Unity work solo.** Defer until a 2D title has revenue and we can hire a part-time 3D artist.
2. **No realtime multiplayer in Q1-Q3.** Infra cost too high. Async / turn-based / leaderboards only.
3. **No GPL / AGPL deps.** MIT / Apache-2.0 / BSD only.
4. **Cultural moat or proven genre.** Every greenlit title is one of:
   - A Naija / pan-African traditional game (Whot, Ayo, Suwe, Ludo, Snakes & Ladders).
   - A proven cash-flow genre (bubble shooter, match-3, sudoku) with a regional cosmetic skin.
   - A stylised arcade / runner with a strong cultural setting (Gidi Dashers, future Lagos-set titles).
5. **No loot boxes. No pay-to-win** in skill / board / card games.

## Greenlight Checklist

Before a title gets a folder under `APPS/`:

- [ ] Comp benchmark named (existing top-100 app it competes with).
- [ ] Cultural moat or genre justification stated.
- [ ] Engine = Phaser 3 + TS + Vite (or migration justified).
- [ ] Solo + AI buildable in ≤ 16 weeks to internal track.
- [ ] Monetisation path identified (rewarded ads / IAP / cosmetic).
- [ ] Min device target stated (Android API 24+ default).
- [ ] Kill criteria stated.

If any box is empty, do not scaffold — return the gap to the user.

## Current Slate (verify against `DOCS/FTC-GAMES-SLATE.md`)

| Q | Title | Status |
|---|-------|--------|
| Q1 | Gidi Dashers | In dev |
| Q1 | Whot! Online | Scaffold next |
| Q2 | Ayo (Mancala) | Planned |
| Q2 | Bubble Shooter Naija | Planned |
| Q3 | Naija Ludo | Planned |
| Q3 | Live ops + cross-portfolio | Planned |

## Out of Scope (do not attempt)

- Realtime sports skill (8 Ball Pool tier)
- 3D Subway-Surfers-grade runner
- MMO / RTS / live-service strategy
- Console / Steam launches
- Original IP without a comp benchmark

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
