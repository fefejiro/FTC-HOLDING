# Ship-Slice Prompt (paste into Copilot Chat)

## Use

When you're ready to ship a SayWetin slice end-to-end. Replace `<SLICE>` and the bullet list of changes, then paste.

---

```
Ship SayWetin slice: <SLICE>

Surfaces: backend (Railway) + web (Cloudflare Pages saywetin-pages) + native (Play production via EAS).

Use the saywetin-three-surface-ship skill at .github/skills/saywetin-three-surface-ship/SKILL.md. Follow its 7-step sequence. Do NOT improvise.

Hard rules (already in the skill, repeating for emphasis):
1. Run scripts/bootstrap.ps1 FIRST. If it exits non-zero, stop and report.
2. Backend ships and is smoked BEFORE clients.
3. After Step 4 (gradle build), Step 5 (Hermes bundle verification) is a BLOCKING gate. If hits<1, stop, do not submit to Play.
4. Use --no-wait on eas submit. Do NOT pipe to Select-Object.
5. Use [System.IO.Compression.ZipFile]::ExtractToDirectory for AAB/APK extraction. NOT Expand-Archive.
6. Do NOT commit .env. Do NOT commit android/ (already gitignored at app level).
7. If git tree is dirty with unrelated work: stash with --include-untracked, ship, then surface stash for triage.
8. NO Play submit and NO native commit without explicit "go" from me — UNLESS this prompt itself says "go" (it does for a normal slice).

Changes in this slice:
- backend: <route, payload, response>
- web: <client call wiring>
- native: <screen + api client>

When done, output the SLICE_REPORT exactly as templates/SLICE_REPORT.md, plus elapsed time. If you exceed 90 min, halt and write a postmortem under /memories/repo/.

Go.
```

## Notes

- This prompt assumes the bootstrap preconditions are already satisfied (metro.config.js, build.gradle extraPackagerArgs, .env, EAS auth, Play key, wrangler auth). Bootstrap script catches the case where they aren't.
- For backend-only or web-only changes, do NOT use this prompt. Use the standard CI flow.
