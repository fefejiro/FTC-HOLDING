# FTC HOLDING Monorepo Runbook

This runbook documents the current repository layout and operational commands.

## Prerequisites
- Windows 10/11 or similar
- Node.js 22+ (24.x recommended for this repo)
- npm 11.x
- PowerShell

## Directory Layout

```text
C:\FTC HOLDING\FTC-HOLDING
|- APPS
|  |- ftc-site
|  |- peacepad
|  |- saywetin
|- PACKAGES
|  |- auth
|  |- config
|  |- logger
|  |- supabase
|  |- types
|- DOCS
```

Notes:
- Keep app-level deployment configs aligned with real app folders.
- See `DOCS/SAYWETIN_HANDOVER.md` for SayWetin runtime/domain notes.

## Install

```powershell
cd C:\FTC HOLDING\FTC-HOLDING
npm install --legacy-peer-deps
```

Per-app install (if needed):

```powershell
cd APPS\ftc-site ; npm install --legacy-peer-deps
cd ..\peacepad   ; npm install --legacy-peer-deps
cd ..\saywetin   ; npm install
```

## Build

```powershell
# from repo root
npm run build:ftc
npm run build:peacepad
npm run build:saywetin
npm run build
```

Or per app:

```powershell
cd APPS\ftc-site ; npm run build
cd ..\peacepad   ; npm run build
cd ..\saywetin   ; npm run build
```

## Develop

```powershell
cd APPS\ftc-site ; npm run dev
cd APPS\peacepad ; npm run dev
cd APPS\saywetin ; npm run dev
```

## Test

```powershell
npm run test
```

## Railway (PeacePad API)
- Root directory: `APPS/peacepad`
- Build command: `npm run build`
- Start command: `npm run start`
- Healthcheck path: `/health`

## Railway (SayWetin API)
- Root directory: `APPS/saywetin`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile` (when root directory is already `APPS/saywetin`)
- Healthcheck path: `/health`

## CI
- `.github/workflows/ci.yml` validates workspace build/test paths.
- Keep scripts aligned with actual folders under `APPS/`.
