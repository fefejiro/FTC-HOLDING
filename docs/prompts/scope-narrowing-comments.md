# Scope-Narrowing Comments

Use these copy-paste comments on pull requests to keep Copilot and other agents on track.
Paste the relevant comment directly into the PR conversation on GitHub Mobile.

---

## Narrow the Scope

Use when the agent is working on too many things at once.

```
Please narrow the scope of this PR. Focus only on [SPECIFIC TASK].
Do not touch any files outside of [FOLDER OR FILE NAME].
If other issues exist, create a separate issue instead of fixing them here.
```

---

## Fix Only Failed Checks

Use when CI is failing and you want only those failures addressed.

```
Please fix only the failing CI checks. Do not make any other changes.
List each failing check, explain what is causing it, and apply the minimal fix.
Do not refactor, rename, or reorganize anything while fixing the checks.
```

---

## Stop Touching Unrelated Files

Use when the agent keeps modifying files outside the task scope.

```
Stop modifying files outside the scope of this task.
The following files should not have been changed: [LIST FILES]
Revert those changes. Focus only on [ORIGINAL TASK DESCRIPTION].
```

---

## Close and Retry

Use when the PR is not salvageable and needs to be restarted.

```
Please close this PR without merging.
The changes are out of scope and cannot be cleanly recovered.
I will create a new issue with a narrower scope and retry from scratch.
Do not attempt to fix this PR further.
```

---

## Update PR Summary

Use when the PR description is missing or incomplete.

```
Please update the PR description to include:
- Summary: what was changed and why
- Files changed: list each file and what it does
- Testing performed: what was actually run (be honest)
- Risks: any potential side effects
- Follow-up tasks: anything that should happen after merging
- Desktop testing required: yes or no
```

---

## Add Testing Notes

Use when testing evidence is missing from the PR.

```
Please add testing notes to this PR.
For each change, describe:
- What test was run (unit, integration, E2E, manual)
- What the test verified
- Whether the test passed
- What still needs to be tested on desktop
Do not claim tests passed unless they were actually run.
```

---

## Resume After Scope Drift

Use after the agent has gone out of scope and you want it back on track.

```
You have drifted outside the scope of this task.
Stop all current changes. Review what you have done so far.
Revert any changes that are not directly related to [ORIGINAL TASK].
Then continue with only [REMAINING TASK DESCRIPTION].
```
