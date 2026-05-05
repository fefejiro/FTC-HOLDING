---
name: ftc-multi-agent-orchestration
description: Use when coordinating Dev 1, Dev 2, Dev 3, project lead chats, or parallel FTC work lanes across Garden, SayWetin, Dispatch, OG, auth, QA, deployment, docs, and CTO validation.
---

# FTC Multi-Agent Orchestration

Use this skill when multiple agents are working at once. The goal is speed without turning the repo into soup.

## Lane Pattern

- One lead chat per project or workstream.
- Two or three dev lanes inside that chat.
- One CTO validator reviews final outputs across lanes.

## Default Dev Split

- Dev 1: backend, auth, data, env, architecture, root cause.
- Dev 2: frontend/mobile implementation, tests, build, UX.
- Dev 3: docs, QA evidence, release/handoff gates, status board.

## Workflow

1. Define the lane:
   - project
   - goal
   - allowed files
   - forbidden files
   - final output
2. Assign devs with disjoint ownership.
3. Require evidence, not vibes:
   - exact commands
   - exact files
   - pass/fail counts
   - commit hashes
   - blockers
4. CTO validates:
   - accepts
   - rejects
   - requests correction
   - changes GO/HOLD/NO-GO
5. Commit in scoped groups.

## Rules

- Do not let every dev touch every file.
- Do not mark docs complete if app work failed.
- Do not call a dashboard-only action "fixed."
- Do not confuse "test drift" with "app pass" without proof.
- Do not accept placeholder commit hashes.
- Do not paste secrets into docs or chat.

## Status Language

- `GO`: ready for the stated audience and scope.
- `HOLD`: blocked or limited, but not unsafe to continue internal work.
- `NO-GO`: do not ship, hand over, or present as ready.

## Output

- Project board summary
- Dev outputs accepted/rejected
- Current GO/HOLD/NO-GO per lane
- Next prompt for each lane
- Commit grouping recommendation
