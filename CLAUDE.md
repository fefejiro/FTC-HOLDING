# CLAUDE.md — FTC HOLDING Monorepo

Last audited: 2026-03-26

This file is the orientation doc for every Claude session in this repo.
Read this first. Don't re-ask questions answered here.

---

## Who You're Working With

**Mike (mikef / fejiro007)** — founder, Una Labs. Builds products that are production-deployed
and maintained solo. Works in long narrative/audio style. Values durability over complexity.
Known pattern: complex stacks drift; prefers thin, solid infrastructure with Claude as the
actual brain rather than buried inside an app layer.

---

## Repo Structure

```
C:\FTC HOLDING\          ← canonical root (git repo)
├── APPS/
│   ├── ATEAM/           ← local AI orchestration app (NOT in prod deploy pipeline)
│   ├── peacepad/        ← production mobile/web app
│   ├── saywetin/        ← production mobile/web app
│   └── ftc-site/        ← marketing site (unalabs.cloud)
├── PACKAGES/            ← shared: auth, config, logger, supabase, types
├── DOCS/                ← operational and deployment docs
├── scripts/             ← PowerShell: LinkedIn automation, verify scripts
├── workers/peacepadai/  ← Cloudflare Worker
└── tmp-bin/             ← local binaries: cloudflared.exe, claude-wrapper*.exe
```

---

## Deployment Reality

| App | Frontend | Backend |
|-----|----------|---------|
| peacepad | Cloudflare Pages → `peacepad.ca` | Railway → `api.peacepad.ca` |
| saywetin | Cloudflare Pages | Railway (Docker) |
| ftc-site | Cloudflare Pages → `unalabs.cloud` | — |
| ATEAM | **Local only** | **Local only** |

ATEAM is not in the root deployment pipeline. It is a local-first AI tool under active development.

---

## ATEAM Remote Stack

This is the phone-to-PC control layer. All components live in `APPS/ATEAM/`.

### Components

| Component | File | State |
|-----------|------|-------|
| Bridge server | `Server/bridge.js` | Working — tested on LAN and via localtunnel |
| Telegram gateway | `telegram-gateway/index.js` | Built — missing `TELEGRAM_BOT_TOKEN` in `.env` |
| Voice CLI | `voice_to_bridge.js` | Built — sends tasks to bridge via HTTP |
| Cloudflared binary | `tmp-bin/cloudflared.exe` | Present — used for HTTPS tunnel |

### Bridge Ports (from logs)
- `3101` — LAN bind (same-WiFi phone access, binds to LAN IP)
- `3102` — localtunnel instance (remote access)
- Default: `127.0.0.1:3001` (localhost only, per `.env.example`)

### How to start the bridge
```powershell
# from APPS/ATEAM/
$env:ATEAM_KEY="your-secret"
node Server/bridge.js
```

### How to expose it remotely
```powershell
tmp-bin\cloudflared.exe tunnel --url http://127.0.0.1:3001
```

### Telegram gateway
Needs `TELEGRAM_BOT_TOKEN` added to `APPS/ATEAM/telegram-gateway/.env`.
Then:
```powershell
# from APPS/ATEAM/telegram-gateway/
npm start
```

---

## Key Env Files

| File | Purpose |
|------|---------|
| `APPS/ATEAM/.env` | Main ATEAM server config |
| `APPS/ATEAM/Server/.env` | Bridge server config (overrides above) |
| `APPS/ATEAM/telegram-gateway/.env` | Telegram gateway (missing bot token) |
| `APPS/peacepad/.env.local` | PeacePad local dev |
| `APPS/saywetin/.env.local` | SayWetin local dev |

---

## Known Cleanup Needed

- `APPS/ATEAM/tmpclaude-*` — 70+ Claude worktree temp dirs. Safe to delete.
- `APPS/ATEAM/Server/tmpclaude-*` — 24+ more. Safe to delete.
- These are leftover from Claude Code isolated worktree sessions.

```powershell
# cleanup command (run from APPS/ATEAM/)
Get-ChildItem -Directory -Filter "tmpclaude-*" | Remove-Item -Recurse -Force
Get-ChildItem -Directory -Filter "tmpclaude-*" -Path Server | Remove-Item -Recurse -Force
```

---

## Working Style Notes

- Mike prefers **thin, durable infrastructure** — don't propose complex multi-layer solutions
- ATEAM's full stack (ElevenLabs + workflow engine + event log) tends to drift; don't suggest expanding it
- Claude should be the **orchestrator/brain**, not buried inside app logic
- Preferred phone interface: Claude mobile (open-ended audio input) → bridge → PC execution
- Current blocker: Claude mobile is a closed system — no custom server routing
- Workaround in progress: expose a minimal web UI or use iOS Shortcuts → bridge POST

---

## Quick Reference Commands

```powershell
# repo hygiene
npm run audit:secrets

# peacepad
npm --prefix APPS/peacepad run build
npm --prefix APPS/peacepad run verify:deployment-ownership

# saywetin
npm --prefix APPS/saywetin run verify:frontend-build

# ATEAM server
cd APPS/ATEAM/Server && npm start

# ATEAM bridge
cd APPS/ATEAM && node Server/bridge.js

# Cloudflare tunnel
tmp-bin\cloudflared.exe tunnel --url http://127.0.0.1:PORT
```
