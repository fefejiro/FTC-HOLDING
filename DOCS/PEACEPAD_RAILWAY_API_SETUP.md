# PeacePad Railway API Setup

## Service
- Service name: `peacepad-api`
- Root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build`
- Start command: `npm run start`

## Health Checks
- `/health`
- `/api/health`

## Required Environment Variables
- `NODE_ENV=production`
- `PORT` (Railway sets this)
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL` (if DB-backed mode is enabled)
- `OPENAI_API_KEY` (only if AI features are enabled)
- `MAILJET_API_KEY` (only if email features are enabled)
- `MAILJET_SECRET_KEY` (only if email features are enabled)
- `VAPID_PUBLIC_KEY` (only if push features are enabled)
- `VAPID_PRIVATE_KEY` (only if push features are enabled)
- `VAPID_EMAIL` (only if push features are enabled)
- `CUSTOM_DOMAINS=peacepad.ca,www.peacepad.ca`

Set all values in Railway variables. Do not commit values to git.

## CORS Assumptions for `api.peacepad.ca`
Server CORS policy must allow:
- `https://peacepad.ca`
- `https://www.peacepad.ca`
- `capacitor://localhost`
- `http://localhost`
- `http://127.0.0.1`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Current PeacePad API server code already includes these origins in production configuration.
