# Anion RLS Smoke Last Run

- Status: blocked
- Started: 2026-04-23T21:02:12.595Z
- Ended: 2026-04-23T21:07:37.736Z
- Summary: Smoke run blocked by network timeout to Supabase pooler endpoint.

## Commands
- npx --yes supabase@latest --version
- npx --yes supabase@latest projects list
- npx --yes supabase@latest db query --linked -f supabase/tests/anion_phase1_rls_smoke.sql -o table

## Details
```text
Initialising login role...

spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT
```
