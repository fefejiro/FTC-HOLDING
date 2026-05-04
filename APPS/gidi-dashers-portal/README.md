# Gidi Dashers — Portal & Landing

Static Next.js 15 site. Deploys to Cloudflare Pages.

- `/` — landing page (the crew, the wahala, the power-ups)
- `/leaderboard/` — top 100 all-time runners, read from Supabase

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_GAME_URL
npm run dev          # http://localhost:3030
npm run build        # static export to ./out
```

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output dir: `out`
- Env vars: same as `.env.example`

## Backend

Supabase project hosts a `scores` table — see `../gidi-dashers/supabase/migrations/0001_scores.sql`. Run that SQL once in Supabase Studio, then paste the URL + anon key into env vars (both here and in the game repo).
