Use the **Una Labs Post Agent** for this task.

Recover the latest failed or incomplete Una Labs scheduled run in
`APPS/una-social-agent`. Do not stop at diagnosis and do not create a parallel
runner.

## Evidence first

1. Identify the exact scheduled task, slot, run date, and expected channels.
2. Read its task result, schedule status JSON, runner log, guard report, visible
   publish report, monitor report, proof directory, and social-ledger entries.
3. Verify Instagram and LinkedIn separately before deciding either is missing.
4. Identify the first failed stage. A later monitor result of zero does not
   override an earlier content-task failure.

## Bounded repair matrix

- Discovery or stale story: replace only the rejected story with a fresh,
  source-backed story from the correct region.
- False duplicate caused by a generic edition label: preserve duplicate safety,
  but compare stable story identities rather than the reusable edition heading.
- Genuine duplicate story: select a different story.
- Duplicate image: generate or source a new story-specific image and confirm
  different raw and final hashes.
- Weak or irrelevant image: revise the visual brief using evaluator feedback;
  do not repeat the same prompt unchanged.
- Missing or clipped copy: rewrite before rendering; do not hide overflow.
- Incomplete carousel: recover only failed slides or use the established
  approved single-slide rescue when quality is stronger than quantity.
- Authentication, CAPTCHA, or two-factor gate: preserve the ready package and
  report the exact shortest human action.
- One platform succeeded: do not repost there. Recover only the missing channel.

## Recovery sequence

1. Make the smallest coherent correction.
2. Run targeted checks.
3. Re-render and visually inspect the affected output.
4. Re-run quality, history, and duplicate guards.
5. Publish only the missing authorized channel inside the valid catch-up window,
   or when Fejiro explicitly authorizes a manual recovery post.
6. Verify the live result and update the existing ledger and proof files.
7. If code behavior changed, add regression coverage and update the handover.

## Stop conditions

Stop only when the missing publication is verified, the run is correctly held
after bounded retries, or a genuine external blocker requires Fejiro. Never
force publication with a stale story, reused image, weak visual, or unsupported
claim.
