
# Repo Cleanup Matrix

_Last updated: 2026-04-29_

| Path | Owner | Classification | Action | Risk | Execution Wave | Depends On |
|------|-------|----------------|--------|------|----------------|------------|
| APPS/ftc-site | Dev 1 | production app | keep, QA, doc | low | 1 | - |
| APPS/saywetin-extension | Dev 2 | production app | keep, QA, doc | low | 1 | - |
| APPS/peacepad | Dev 1 | production app | keep, QA, doc | low | 1 | - |
| APPS/og-trades-academy | Dev 2 | production app | keep, QA, doc | low | 1 | - |
| APPS/saywetin | Dev 2 | production app | keep, QA, doc | low | 1 | - |
| APPS/saywetin-native | Dev 2 | production app | keep, QA, doc | low | 1 | - |
| APPS/anion | Dev 1 | production app | keep, QA, doc | low | 1 | - |
| APPS/anion-mobile | Dev 1 | production app | keep, QA, doc | low | 1 | - |
| APPS/dispatch | Dev 1 | production app | keep, QA, doc | low | 1 | - |
| APPS/peacepad-extension | Dev 1 | extension | keep, QA, doc | low | 1 | - |
| .agents/ | Dev 3 | local skills | keep, doc | low | 1 | - |
| .github/ | Dev 3 | repo infra | keep, update | low | 1 | - |
| .vscode/ | Dev 3 | config | keep, update | low | 1 | - |
| DOCS/ | Dev 3 | documentation | keep, update | low | 1 | - |
| PACKAGES/ | Dev 1 | shared code | keep, QA, doc | low | 1 | - |
| scripts/ | Dev 1 | scripts | keep, doc | low | 1 | - |
| skills-lock.json | Dev 3 | skills config | keep, doc | low | 1 | - |
| supabase/ | Dev 1 | db/config | keep, doc | low | 1 | - |
| tests/ | Dev 1 | QA/tests | keep, update | low | 1 | - |
| tmp/ | Dev 1 | noise | ignore | none | 1 | - |
| node_modules/ | Dev 1 | noise | ignore | none | 1 | - |
| wrangler.toml | Dev 1 | infra/config | keep, QA | low | 2 | - |
| package.json | Dev 1 | infra/config | keep, QA | low | 2 | - |
| package-lock.json | Dev 1 | infra/config | keep, QA | low | 2 | - |
| README.md | Dev 3 | documentation | keep, update | low | 2 | - |
| FTC_MASTER.md | Dev 3 | documentation | keep, update | low | 2 | - |
| IMPLEMENTATION_COMPLETE.md | Dev 3 | documentation | keep, update | low | 2 | - |
| START_HERE.md | Dev 3 | documentation | keep, update | low | 2 | - |
| APPS/ATEAM | Dev 1 | legacy app | archive, doc | medium | 2 | owner review |
| .git/ | Dev 1 | repo infra | keep | high | 3 | owner approval |

## Execution Waves

**Wave 1: Safe Ignore / Non-Destructive**
- tmp/
- node_modules/

**Wave 2: Archive / Move / Update Docs**
- All documentation and infra/config updates (README.md, DOCS/, .github/, .vscode/, wrangler.toml, package.json, etc.)
- Archive legacy/partial apps (APPS/ATEAM) after owner checkpoint

**Wave 3: Destructive Deletes (Owner Approval Required)**
- .git/ (repo infra, high risk)
- Any destructive action (explicit owner approval required)

## One-Command-Per-Wave Runbook

**Wave 1:**
```sh
# Safe ignore (no action needed, just verify)
ls tmp/ node_modules/
```

**Wave 2:**
```sh
# Archive/move docs and update infra/config
# (Example: move legacy, update docs, commit)
git add DOCS/ APPS/ATEAM README.md .github/ .vscode/ wrangler.toml package.json
git commit -m "Wave 2: Archive legacy, update docs and infra"
```

**Wave 3:**
```sh
# Destructive deletes (owner approval required)
# (Example: remove legacy or infra after explicit checkpoint)
# git rm -r .git/  # Only with owner approval!
# git commit -m "Wave 3: Destructive deletes (with approval)"
```

> Every path/action requires explicit owner checkpoint before deletion or destructive change.

## Batch 3 Proposed Execution Order
1. Update and QA all production apps and shared code (APPS/, PACKAGES/, supabase/, scripts/, tests/)
2. Update documentation and infra/config files (.github/, .vscode/, DOCS/, wrangler.toml, package.json, README.md, etc.)
3. Archive legacy/partial apps (APPS/ATEAM) after owner checkpoint
4. Ignore noise and temp paths (tmp/, node_modules/)
5. Final QA and doc pass before any destructive action

## Do Not Touch Yet
- .git/ (repo infra, high risk)
- APPS/ATEAM (legacy, owner checkpoint required)

> Every path/action requires explicit owner checkpoint before deletion or destructive change.
