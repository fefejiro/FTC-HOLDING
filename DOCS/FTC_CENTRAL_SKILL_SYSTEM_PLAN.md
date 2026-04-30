# FTC Central Skill System Plan

## 1. Current Skill Locations Found
- No `.codex/skills`, `skills/`, or `SKILLS/` folders found in the current repo.
- `.agents/` is referenced in REPO_CLEANUP_MATRIX.md as a local skills folder ("keep, doc").
- `skills-lock.json` is referenced as a skills config ("keep, doc").
- Docs mentioning skills:
  - FTC_PHASE_HANDOVER_2026-04-29.md: QA skill/report format is preferred pattern.
  - REPO_CLEANUP_MATRIX.md: lists `.agents/` and skills-lock.json.
  - INDEX.md: links to "Secrets And Skills Inventory 2026-04-28".

## 2. Recommended Canonical Location for FTC Skills
- Use a top-level folder: `skills/` at the repo root for all shared, reusable skills.
- Local/experimental skills can remain in `.agents/` but should be promoted to `skills/` when stable.

## 3. Naming Convention
- Folder: `skills/<skill-name>/`
- Skill name: lowercase, hyphen-separated (e.g., `ftc-client-delivery-handoff`)
- Main doc: `SKILL.md` inside each skill folder
- References/checklists/templates: in a `references/` subfolder

## 4. Skill Lifecycle
1. Identify repeated workflow or process pain point
2. Write skill (SKILL.md + supporting checklists/templates)
3. Test skill in real project or QA
4. Publish/share in `skills/` and announce in team channel
5. Update after lessons learned or new requirements

## 5. Garden/Una Labs Lessons to Become Skills
- Client QA/handoff skill
- Portal QA skill
- Supabase Auth/email template skill
- Cloudflare Pages deployment skill
- Repo recovery/cleanup skill
- Multi-dev orchestration skill

## 6. Recommended First Skill to Create
- `ftc-client-delivery-handoff`

### Proposed Structure:
```
skills/ftc-client-delivery-handoff/
  SKILL.md
  references/checklists.md
  references/qa-report-template.md
  references/client-email-template.md
```

## 7. Next Steps
- Create `skills/` at repo root
- Add `ftc-client-delivery-handoff/` as first canonical skill
- Migrate proven checklists/templates from Garden/Una Labs handoff docs
- Announce skill system and encourage contributions

// No code changes made, doc only. No secrets.
