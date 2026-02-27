# RUNBOOK - FTC Site

## Prerequisites
- Node.js v18+ or later
- npm installed

## Install
```powershell
npm install
```

## Run dev
```powershell
npm run dev
```

## Build
```powershell
npm run build
```

## Start production
```powershell
npm run start
```

## Test commands
```powershell
npm run test:e2e
```

## Troubleshooting
- Port 3000 may be in use; stop other servers or set `PORT` env var.
- If build errors reference missing ESLint config, install `eslint-config-next` or ignore.

## Deployment notes
Static exports supported; host on Vercel or any static web server with Next.js support.
