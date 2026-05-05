# Desktop Test Handoff Prompt

Use this when mobile or cloud testing is not sufficient and you need exact steps to run tests on your local desktop environment.

---

## When to Use

- A Playwright E2E test needs to run locally against a live dev server
- You need to verify environment variables in a real build
- A Railway deployment needs to be validated end-to-end
- The CI environment does not replicate the production environment closely enough
- Mobile testing is blocked and you need to switch to desktop

---

## Copy-Paste Prompt

```
You are creating desktop test steps for a change in the FTC-HOLDING repo.

Change details:
- Repo: fefejiro/FTC-HOLDING
- Project: [PROJECT FOLDER — e.g. APPS/una-labs-site]
- PR or branch: [PR NUMBER OR BRANCH NAME]
- What was changed: [BRIEF DESCRIPTION]

Instructions:
1. Review the changes in the PR or branch.
2. Identify every scenario that needs to be verified by a human on desktop.
3. For each scenario, write exact, numbered steps:
   - What command to run (include full path or npm prefix)
   - What URL to open
   - What to look for (expected output, UI state, network response)
   - What failure looks like
4. Identify which steps require environment variables and which .env file they come from.
5. Flag any step that requires a Railway or Cloudflare deployment to be live.
6. Do not skip steps. Do not assume the reviewer knows the codebase.
7. Format the output as a numbered checklist that can be copy-pasted into a GitHub comment.
```

---

## Example Output Format

The agent should produce something like:

```
Desktop Test Checklist — [PR TITLE]

Environment required: APPS/una-labs-site/.env.local (see DOCS/ for variable list)

1. Run: npm --prefix APPS/una-labs-site run dev
2. Open: http://localhost:3000/intake
3. Verify: The intake form renders without console errors
4. Submit the form with valid test data
5. Verify: Redirect to /confirmation with correct summary
6. Check: Railway API log shows the POST request was received
```

---

## Notes

- This prompt is for creating the checklist, not for running the tests.
- After the checklist is created, copy it into the PR as a comment or into a `TESTING.md` file in the PR branch.
- If the steps reveal that desktop testing is not required after all, note that explicitly.
