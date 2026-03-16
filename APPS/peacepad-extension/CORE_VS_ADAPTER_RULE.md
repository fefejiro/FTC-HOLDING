# Core vs Adapter Decision Rule

Use this checklist before changing code.

## Rule of Thumb
- **Platform UI behavior** → Adapter / extension layer
- **Communication reasoning** → SendSmart Core

## Quick Checklist
1. Is this about DOM selectors, keyboard hooks, or UI injection?
   - If yes: adapter.
2. Is this about scoring, tone, context, or suggestion logic?
   - If yes: core.
3. Is this reusable across WhatsApp, Gmail, Slack, LinkedIn, Teams?
   - If yes: core.
4. Does this depend on a site-specific DOM structure?
   - If yes: adapter.

## If Unclear
Stop and document the ambiguity in the PR or in `ARCHITECTURE.md` before coding.
