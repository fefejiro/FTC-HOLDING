# FTC Central Skill System Plan

## 1. Current Skill Locations Found
- Canonical FTC skills now live in repo root `skills/`.
- Recovered local/agent skills also exist under `.agents/skills/`.
- GitHub/Copilot-style skills exist under `.github/skills/`.
- `skills-lock.json` remains the current skills config/lock reference.
- Current canonical FTC skills:
  - `skills/ftc-auth-foundation/`
  - `skills/ftc-client-handoff/`
  - `skills/ftc-live-qa/`
  - `skills/ftc-deployment-recovery/`
  - `skills/ftc-multi-agent-orchestration/`

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

## 5. Garden/Una Labs Lessons Promoted To Skills
- Client handoff and acceptance: `skills/ftc-client-handoff/`
- Live QA and evidence capture: `skills/ftc-live-qa/`
- Auth foundation and SMTP/security gates: `skills/ftc-auth-foundation/`
- Deployment/runtime recovery: `skills/ftc-deployment-recovery/`
- Multi-dev orchestration and CTO validation: `skills/ftc-multi-agent-orchestration/`

## 6. Skill Structure

```
skills/<skill-name>/
  SKILL.md
  references/ optional
  scripts/ optional
  assets/ optional
```

## 7. Next Steps
- Use root `skills/` as the cross-agent canonical source.
- Promote only stable, repeated workflows into `skills/`.
- Keep skill bodies lean; move bulky examples into `references/` only when needed.
- Next likely skill candidates:
  - `ftc-client-intake-scope`
  - `ftc-repo-cleanup`
  - `ftc-smtp-auth-email`
  - `ftc-mobile-e2e-release`

// No code changes made, doc only. No secrets.
