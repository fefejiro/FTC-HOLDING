# Stuck Draft PR Prompt

Use this when a pull request is stuck in draft state and needs to be cleaned up, focused, and marked ready for review.

---

## When to Use

- A draft PR has been open without progress
- The PR description is incomplete or missing
- CI is passing but the PR was never promoted out of draft
- You want Copilot to finalize and clean up a draft before review

---

## Copy-Paste Prompt

```
You are finalizing a stuck draft pull request in the FTC-HOLDING repo.

PR details:
- Repo: fefejiro/FTC-HOLDING
- PR number or branch: [PR NUMBER OR BRANCH NAME]
- Original task: [WHAT THIS PR WAS SUPPOSED TO DO]

Instructions:
1. Read the current PR diff and description.
2. Confirm the PR is doing exactly what the original task asked for — nothing more.
3. If the PR contains unrelated changes, list them. Do not remove them without asking.
4. Check CI status. If any checks are failing, fix them before proceeding.
5. Write or update the PR description using this structure:
   - Summary: what was changed and why
   - Files changed: which files were modified and what each one does
   - Testing performed: what was actually run (be honest — do not claim tests passed if they were not run)
   - Risks: any potential side effects
   - Follow-up tasks: anything that should be done after merging
   - Desktop testing required: yes or no, and why
6. Mark the PR as ready for review.
7. Do not add new commits unless required to fix a CI failure.
8. Do not redesign or refactor anything that was not part of the original task.
```

---

## Notes

- A draft PR that stays in draft for more than a week should be triaged using [failed-pr-triage.md](./failed-pr-triage.md).
- If the PR needs a full restart, use [failed-pr-triage.md](./failed-pr-triage.md) to decide.
