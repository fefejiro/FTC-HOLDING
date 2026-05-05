# SayWetin ContentOps (Phase 2)

Pipeline: **QA artifact → narrative script → ElevenLabs voice → 9:16 render → approval queue → publish.**

## Layout
```
contentops/
  voice/
    profiles.json          # Persona -> voice_id + tuning (premade now, cloned later)
    list-voices.mjs        # Print available voices
    render.mjs             # text + persona -> mp3
    clone-upload.mjs       # Upload Voice Lab samples (Tier-A path)
    samples/               # Drop nigerian voice samples here: prof.mp3 male.mp3 female.mp3
    _out/                  # Rendered audio output (gitignored)
  pipeline/
    qa-to-script.mjs       # qa/_report/summary.json -> scripts/{platform}.txt
    render-9x16.mjs        # script + audio + screenshots -> 9:16 mp4 via ffmpeg
    full-run.mjs           # Orchestrator
  approval/
    queue.json             # Pending approvals (Tier B/C only; Tier A auto-publishes)
    list-pending.mjs
```

## Persona profiles (initial - premade)
| Key | Persona | Voice ID | Notes |
|-----|---------|----------|-------|
| `prof` | Nigerian Professor | `JBFqnCBsd6RMkjVDRZzb` (George - British middle-aged storyteller) | Closest premade. Replace after Voice Lab clone. |
| `male` | Nigerian middle-aged male | `CwhRBWXzGAHq8TQ4Fs17` (Roger - American casual resonant) | Replace after clone. |
| `female` | Nigerian middle-aged female | `EXAVITQu4vr4xnSDxMaL` (Sarah - mature reassuring) | Replace after clone. |

## Voice Lab cloning (Tier-A authentic Nigerian voices)
1. Record 1-3 minutes of clean speech per persona on phone (quiet room, single voice).
2. Save as `voice/samples/prof.mp3`, `voice/samples/male.mp3`, `voice/samples/female.mp3`.
3. Run `npm run voices:clone-upload`.
4. The script uploads, gets new voice_ids back, and updates `voice/profiles.json` automatically.

## Auth
Reads `ELEVENLABS_API_KEY` from User env. Set via:
```powershell
[System.Environment]::SetEnvironmentVariable('ELEVENLABS_API_KEY','sk_...','User')
```
Never paste the key into chat or commit it. `.env*` and `_out/` are gitignored.
