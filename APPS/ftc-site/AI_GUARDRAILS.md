# AI Guardrails - Una Labs Site

## What AI may change
- Content copy and headings
- Image selection or SEO metadata

## What AI must never change
- Core navigation structure and route names
- Production dependencies or build steps
- Any code affecting security or data

## Privacy & secret handling rules
- No secrets in code; environment variables stored outside repository.
- AI templates must not include API keys etc.

## Required tests before commit
- Run e2e navigation tests.
- Manual smoke check of pages.

## Definition of Done
Build passes, tests pass, UI matches design system, and no broken links.
