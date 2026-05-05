# Failed PR Triage Prompt

Use this when a pull request has failing checks, unresolved conflicts, or unclear scope and you need to decide whether to fix it or close and retry.

---

## When to Use

- A PR has been open too long without merging
- CI checks are failing and the fix is unclear
- The PR touched too many unrelated files
- You are not sure whether the PR is worth saving

---

## Copy-Paste Prompt

```
You are triaging a failed pull request in the FTC-HOLDING repo.

PR details:
- Repo: fefejiro/FTC-HOLDING
- PR number or branch: [PR NUMBER OR BRANCH NAME]
- Original task: [WHAT THIS PR WAS SUPPOSED TO DO]

Instructions:
1. Read the PR diff. Identify what was changed and why.
2. Check CI status. Read the failure logs for each failing check.
3. Answer these questions:
   a. What is failing and why?
   b. Is the failure caused by this PR or by a pre-existing issue?
   c. Does the PR touch files outside its stated scope?
   d. Is the PR recoverable with a small fix, or does it need to be closed and retried?
4. Recommend one of the following actions:
   - SALVAGE: Describe the minimal fix needed to make the PR ready to merge.
   - CLOSE AND RETRY: Describe what the new PR should do differently.
5. Do not make any changes until you have completed the triage above.
6. If salvaging: fix only the failing checks. Do not add new features.
7. Do not touch unrelated files.
```

---

## Decision Guide

| Condition | Recommended Action |
|-----------|-------------------|
| 1-2 CI checks failing, clear fix exists | SALVAGE |
| PR scope has drifted significantly | CLOSE AND RETRY |
| Merge conflicts with main | SALVAGE if small, CLOSE AND RETRY if complex |
| Agent made breaking changes to unrelated files | CLOSE AND RETRY |
| PR is more than 2 weeks old and still not merged | CLOSE AND RETRY |

---

## Notes

- If the agent recommends CLOSE AND RETRY, create a new issue using the `copilot-task` issue template before closing the PR.
- Do not merge a PR that has unresolved CI failures unless you understand exactly why each check failed.
