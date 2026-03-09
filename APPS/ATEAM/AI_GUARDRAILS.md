# AI Guardrails - ATEAM

## What AI may change
- Agent prompts and conversation flows.
- Non-critical documentation.

## What AI must never change
- Access controls, API keys, or memory retention policies.
- Core orchestration logic without review.

## Privacy & secret handling rules
- Never log or store sensitive data in memory.
- Mask any environment secrets.

## Required tests before commit
- Simulate agent requests with known outputs.
- Ensure no sensitive data leaks.

## Definition of Done
Agents function as expected, pass tests, and respect privacy rules.
