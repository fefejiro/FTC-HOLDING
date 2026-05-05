# Copilot Implementation Prompt

Use this as the starting template for any standard Copilot implementation task in FTC-HOLDING.

---

## When to Use

- You want to add a feature, fix a bug, update a component, or write a test
- The task is scoped to one project or one area of the repo
- You are starting fresh with no prior session context

---

## Copy-Paste Prompt

```
You are implementing a task in the FTC-HOLDING repo.

Task details:
- Repo: fefejiro/FTC-HOLDING
- Project: [PROJECT FOLDER — e.g. APPS/una-labs-site]
- Task: [CLEAR DESCRIPTION OF WHAT TO BUILD OR FIX]
- Files likely involved: [LIST ANY KNOWN FILES, OR WRITE "unknown"]
- Related issue or PR: [ISSUE NUMBER OR BRANCH NAME, OR WRITE "none"]

Constraints:
- Do not touch files outside the project folder unless strictly required.
- Do not modify .env files, deployment configs, or billing settings.
- Do not add new dependencies unless the task explicitly requires it.
- Do not redesign or refactor anything outside the scope of this task.
- Keep changes minimal and focused.

Acceptance criteria:
[LIST WHAT DONE LOOKS LIKE — e.g. "The component renders without errors", "The API returns the correct status code"]

Testing:
- Run existing tests if they exist. Do not claim tests passed unless you actually ran them.
- Note any tests that need to be run manually on desktop.
- Do not remove or skip existing tests.

When done:
- Create a pull request.
- Include a summary, list of changed files, testing notes, and any follow-up tasks.
- Flag any risks or side effects.
```

---

## Tips

- If the task is vague, ask for clarification before starting. Narrow scope is better than broad scope.
- If Copilot goes out of scope mid-task, use a scope-narrowing comment from [scope-narrowing-comments.md](./scope-narrowing-comments.md).
- If the session fails partway through, use [mobile-failure-recovery.md](./mobile-failure-recovery.md).
