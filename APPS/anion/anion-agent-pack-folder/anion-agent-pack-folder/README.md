# Anion Agent Mode Pack

This pack is meant to be copied into the root of the `anion` repository so GitHub Copilot and VS Code Agent Mode can pick up repository instructions, custom agents, handover context, and reusable task prompts.

## What this pack includes

- Repository wide Copilot instructions
- Path specific instructions
- Five custom agents for Anion
- A root `AGENTS.md` file for agent behavior and precedence
- A handover guide for VS Code Agent Mode
- Reusable skills and task prompts
- Issue and pull request templates for disciplined execution

## Recommended installation

Copy these files into the `anion` repository root.

```text
.github/
AGENTS.md
docs/
skills/
ops/
```

## Suggested first run in VS Code Agent Mode

1. Commit these files to the default branch.
2. Open the `anion` repo in VS Code.
3. Confirm Copilot custom instructions are enabled.
4. Start with the **Anion Program Director** agent.
5. Give it the prompt from `docs/vscode-agent-handover.md`.
6. Route execution to the right agent by task:
   - Web Builder for M1 and M2
   - Billing and Access for M3
   - Live Classroom for M4 and M5
   - QA and Release as reviewer for every meaningful change

## Current starting point

The handover docs assume:
- M0 platform realignment is already complete
- The main repo is `anion`
- `anion-mobile` is deferred
- The next active milestone is M1 foundation wiring and auth

## House rules

- Do not add new vendors without approval
- Do not start mobile work before the web app is stable
- Do not let agents work without an owner, reviewer, acceptance criteria, and definition of done
