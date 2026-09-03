Use the **Una Labs Post Agent** for this task.

Run the Una Labs daily control check for `APPS/una-social-agent` without
creating another pipeline.

## Objective

Make today's scheduled Una Labs work trustworthy. Inspect what was due, what
actually ran, what was published, and what still needs bounded recovery.

## Required sequence

1. Read `APPS/una-social-agent/docs/SOCIAL_NEWS_HANDOVER_2026-07-15.md`.
2. Confirm the repository branch and preserve unrelated changes.
3. Inspect every `UnaLabsSocial*` scheduled task, including last result, last
   run, next run, trigger, action, and enabled state.
4. Inspect today's schedule status, latest logs, publish-guard output, visible
   publish report, monitor report, social ledger, and proof screenshots.
5. Determine the expected lane from Eastern time:
   - Weekdays at 6:45 AM: regional morning news.
   - Weekdays at 5:30 PM: practical evergreen AI tip.
   - Saturday at 9:00 AM: practical weekend AI tip.
   - Sunday at 10:00 AM: weekly recap.
6. Do not rerun a lane that already has live verified proof for its slot.
7. If a due lane failed, invoke the failure-recovery playbook and repair the
   smallest failed component. Do not merely report the error.
8. If the lane completed, verify both Instagram and LinkedIn independently.
9. Reconcile the existing proof ledger with the live result.
10. Report the next scheduled run and any exact human action still required.

## Rules

- Use Eastern time and the existing scheduler configuration.
- Never count a monitor result of zero as proof that a content task succeeded.
- Never treat a clicked Post button, upload, or draft as publication proof.
- Never publish a duplicate story or image to compensate for a failed run.
- Do not publish outside the configured catch-up window unless Fejiro explicitly
  authorizes a manual recovery post.
- Do not make unrelated code changes.

## Completion evidence

Return the lane, scheduler result, quality result, Instagram status, LinkedIn
status, proof paths, ledger status, recovery performed, and next run time.
