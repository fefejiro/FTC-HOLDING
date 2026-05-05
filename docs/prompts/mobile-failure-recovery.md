# Mobile Failure Recovery Prompt

Use this when a Copilot session has stopped responding, produced broken output, or left the repo in a bad state.

---

## When to Use

- Copilot made changes but the PR did not get created
- CI is failing and Copilot is not fixing it
- The agent went silent or hit a tool error mid-task
- Changes were pushed but they are incomplete or broken

---

## Copy-Paste Prompt

```
You are recovering a failed Copilot session in the FTC-HOLDING repo.

Context:
- Repo: fefejiro/FTC-HOLDING
- Project: [PROJECT NAME — e.g. APPS/una-labs-site]
- Branch: [BRANCH NAME]
- What was being built: [BRIEF DESCRIPTION OF THE ORIGINAL TASK]
- What broke: [DESCRIBE WHAT FAILED — e.g. CI check, missing file, half-applied change]

Instructions:
1. Check the current state of the branch. List any uncommitted changes or recent commits.
2. Review CI failures if any are present. Read the actual failure logs.
3. Do not start new work until you understand the current broken state.
4. Fix only what is broken. Do not expand scope.
5. If the original task cannot be safely completed, describe exactly what is missing
   and what steps are needed to finish it on desktop.
6. Do not touch unrelated files.
7. Do not modify .env files, deployment configs, or billing settings.
8. When done, summarize what was fixed and what remains.
```

---

## Notes

- Replace all bracketed placeholders before sending.
- If the failure is a PR issue rather than a code issue, use [failed-pr-triage.md](./failed-pr-triage.md) instead.
- If the PR is stuck as a draft, use [stuck-draft-pr.md](./stuck-draft-pr.md) instead.
