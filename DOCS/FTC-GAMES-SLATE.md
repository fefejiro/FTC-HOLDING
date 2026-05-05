# FTC Games Slate — Solo Founder + AI Playbook

**Owner:** fefejiro · **Status:** Active strategy · **Last updated:** 2026-05-04

This is the canonical strategy for FTC's games line. It encodes what we will build, what we will not build, and why. Every game decision in `APPS/` games folders should reference this document.

---

## 1. Strategic Premise

Miniclip's catalog (1B+ downloads across ~100 titles) shows the playbook:

1. **Sports skill** — needs realtime multiplayer infra → out of scope solo.
2. **Board / disc / cards** (Carrom Pool 500M, Ludo Party 20M) — **regional/cultural classics, digitised.**
3. **Bubble shooter / match clones** — proven cash-flow genre, cosmetic skin layer.
4. **Casual puzzle** (Sudoku, Nonogram, Pixel Art) — Easybrain-style content factory.
5. **Endless runner / arcade** (Subway Surfers, Rail Rush, Bowmasters).
6. **Idle / tycoon** (Eatventure).

Half of Miniclip's hits are **well-executed clones with a cultural / regional twist**. Carrom (India), Ludo (India + Africa), Cricket (India). Nigeria has the same gap: no global-quality digital Whot, Ayo, Suwe, Naija Ludo. **That is FTC's lane.**

---

## 2. North-Star Position

> **FTC Games is the Naija publisher: traditional African games rebuilt to global polish, plus a stylised Lagos-flavoured runner line.**

Long-game upside: become the publishing layer for African indie game devs.

---

## 3. Build Posture

- **Default 2D engine:** Phaser 3 + TypeScript + Vite. PWA → TWA for Android.
- **3D engine (when justified):** Unity 2022 LTS+ with URP, mobile-first, Crossy-Road-style stylised low-poly.
- **Stack:** TS, Vite, Phaser 3, Cloudflare Pages (web), Supabase (auth + leaderboards), Bubblewrap (TWA wrap), Play Console, Unity (3D titles).
- **Licensing:** MIT / Apache-2.0 / BSD only. No GPL / AGPL. Free or freemium APIs only.
- **Security:** no hardcoded secrets, recently maintained deps only, no critical CVEs.

---

## 4. Slate (9-month plan)

### Quarter 1 — Months 1-2

| # | Title | Engine | Status | Goal |
|---|-------|--------|--------|------|
| 1 | **Gidi Dashers** | Unity URP (low-poly 3D) | Migrating | Crossy-Road-tier polish, Play Store launch |
| 2 | **Whot! Online** | Phaser 3 | Scaffold next | Carrom-Pool-of-Whot |

### Quarter 2 — Months 3-5

| # | Title | Engine | Why |
|---|-------|--------|-----|
| 3 | **Ayo (Mancala)** | Phaser 3 | Pan-African board, low art bar |
| 4 | **Bubble Shooter Naija** | Phaser 3 | Cash-flow genre, Lagos cosmetic skin |

### Quarter 3 — Months 6-9

| # | Title | Engine | Why |
|---|-------|--------|-----|
| 5 | **Naija Ludo** | Phaser 3 | Ludo Party tier shot |
| 6 | **Live ops** | All | Skins, tournaments, daily challenges |

### Tier-3 (high effort, attempted only when learning value justifies)

- Realtime sports skill (8 Ball Pool tier) — multiplayer infra cost.
- Subway-Surfers-grade 3D production — Sybo-tier pipeline; we will not match it but we *will* learn from attempting Unity 3D.
- MMO / strategy live-ops — ops burden too high for now.

**Note:** "do not attempt" was removed. We choose effort based on learning + commercial fit, not fear of difficulty.

---

## 5. Per-Title Brief Template

Every game keeps a `GAME-BRIEF.md` with:

```
- Title:
- Genre:
- TAM (region):
- Core loop (3 sentences):
- Win/lose state:
- Monetisation: ads / IAP / cosmetic
- Engine: Phaser 3 (TS+Vite) | Unity URP | other (justify)
- Min device target:
- Cultural moat:
- Comp benchmark (existing app):
- Kill criteria:
```

---

## 6. Game-Feel Non-Negotiables

For every title, before Play Store internal track:

- Input buffering on lane-switch / tap / play-card.
- Coyote / forgiveness window 60-120ms.
- Hit-stop frame on impactful events.
- Camera shake budget: max one per second, peak ≤ 6px.
- Audio: background loop + ≥ 6 SFX, < 200KB combined for procedural tier.
- Death / win animation ≥ 700ms before scene transition.
- Persistent best score `localStorage` key `ftc.<game>.best`.
- First-run tutorial overlay, dismissable, never shown twice.

---

## 7. Production Pipeline (per title)

1. Brief locked (`GAME-BRIEF.md`).
2. Greybox playable.
3. Art pass.
4. Audio pass (procedural first).
5. Polish pass (game-feel non-negotiables).
6. Web deploy (Cloudflare Pages, `<game>.ftcholding.com`).
7. TWA wrap (Phaser titles) or native Android build (Unity titles).
8. Internal track (Play Console), 14-day soak.
9. Closed beta, 14-21-day soak.
10. Production launch, phased rollout 5 → 20 → 50 → 100% / 7 days.

---

## 8. Monetisation Defaults

- Rewarded video on continue + interstitial every 3 game-overs.
- IAP Tier 1: remove-ads $2.99, starter pack $1.99, cosmetics $0.99-$4.99.
- Live ops: seasonal pass once DAU > 10k.
- No loot boxes, no pay-to-win in skill / board / card games.

---

## 9. Long-Game: FTC as Publisher

Once 2-3 titles are live with positive ROAS, open the **FTC Publishing** layer (70/30 dev split, FTC provides ASO + ad SDK + analytics + Play Console + marketing). Target 2-3 partner studios in Lagos / Nairobi / Accra by month 12.

---

## 10. Skills & Agents

- Skill: `skills/ftc-games-slate/SKILL.md`
- Skill: `skills/ftc-games-phaser-runner/SKILL.md`
- Skill: `skills/ftc-games-card-board/SKILL.md`
- Skill: `skills/ftc-games-unity-runner/SKILL.md`
- Skill: `skills/ftc-games-publishing/SKILL.md`
- Agent: `.github/agents/ftc-games-producer.agent.md`
- Agent: `.github/agents/ftc-games-engine-dev.agent.md`
- Agent: `.github/agents/ftc-games-publisher.agent.md`

---

## 11. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-04 | Whot! Online is title #2 | No global-quality Whot; Carrom Pool playbook applies |
| 2026-05-04 | No realtime multiplayer in Q1-Q3 | Infra cost & ops burden too high solo |
| 2026-05-04 | **Migrate Gidi Dashers to Unity URP low-poly (option C)** | Founder call. Crossy-Road tier, asset-store + Mixamo pipeline, mobile-first. Phaser web build remains as fallback / web demo. Migration plan: `APPS/gidi-dashers/UNITY-MIGRATION.md`. |
| 2026-05-04 | **Rule change: 3D / Unity is a first-class engine choice** | Founder call: learning value > short-term revenue ceiling. Removed the "no Unity solo" hard rule. Engine choice is now per-title based on fit + learning + comp benchmark, not fear of difficulty. |
