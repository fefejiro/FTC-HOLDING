# FTC Parallel Release Plan and Developer Prompts

## Saved-plan target

At execution start, save this plan to:

`C:\FTC HOLDING\DOCS\WEEKLY_SHIP_PLAN_2026-08-24.md`

I will remain the reviewer. Developers prepare candidates and evidence; no candidate is submitted publicly until it passes my review and you provide feedback.

## Gate 0 â€” Safe PR Cleanup

Before development:

- Close empty Copilot WIPs: #188, #200, #231, #244, #252, #256, #274, #276, and #278.
- Comment: `Superseded by the August 24 focused release plan; this PR contains no file changes.`
- Preserve all remote branches.
- Do not close security PR #139.
- Do not automatically close #147, #157, #158, or #180.
- Create the clean PeacePad release branch before closing its older stack.
- After reconciling required commits into the replacement branch, comment with the replacement PR and close superseded PeacePad PRs #148, #160, #169â€“177, and #250.
- Review #159 and #166â€“168 individually; close only when their fixes are confirmed present or irrelevant to `2.0.1`.

## Developer Prompt 1 â€” PeacePad 2.0.1

```text
You are the PeacePad V2 release developer.

Goal:
Prepare PeacePad 2.0.1 as a polished production hotfix with a complete customer account journey. Do not expand into video, Conch AI, expenses, or unrelated architecture.

Source:
- Primary worktree: D:\PeacePadRelease\worktrees\pp-v2-onboarding
- Primary branch/head: feat/peacepad-v2-full-core at 8b18ac3179a3854ea2f6cd6d3b07cd451616bf24
- Newer UX/icon source: C:\pp-v2-rc1 at 4954832486e4332354e77b8a2d22bf4d1666f917
- Create an isolated clean worktree:
  D:\PeacePadRelease\worktrees\peacepad-2.0.1
- Create branch: release/peacepad-2.0.1
- You are not alone in the repository. Preserve unrelated work and never clean/reset a parent checkout.

Required release contract:
- Marketing version: 2.0.1
- iOS build: 5
- Android version code: 43
- Bundle/package: ca.peacepad.family
- Production Canada configuration only
- Real PeacePad conch icon
- No staging, regional-selection, reviewer-only, infrastructure, or demo wording

Required customer journey:
1. Three concise introductory slides, shown once, with Skip/Next/Get Started.
2. Replay onboarding from Settings.
3. Separate Create account and Sign in actions.
4. Email registration, verification, sign-in, recovery, and reset.
5. Sign in with Apple.
6. Google sign-in only if the production Web/iOS OAuth IDs and URL scheme validate. Time-box credential resolution to half a day. If unavailable, remove/hide Google rather than shipping a broken control.
7. Create family and invite the second parent.
8. Second parent joins.
9. Send and receive a message.
10. Create and observe a shared calendar event.
11. Close/reopen with session and data preserved.
12. Sign out/in.
13. Delete account with explicit confirmation and truthful retention copy.

Implementation rules:
- Compare the two PeacePad sources and reconcile only the required UX, recovery, icon, and release changes.
- Do not merge giant historical PRs wholesale.
- Do not expose secrets or service-account JSON.
- Keep customer copy short and calm.
- Preserve existing authorization, regional safety, audit, and deletion boundaries.
- Update release/status/handover documents to the exact candidate source.

Verification:
- TypeScript and focused Jest suites.
- Full native test suite and coverage gate.
- Secret scan and production guardrails.
- Expo configuration validation.
- Clean iOS and Android export/build checks.
- Physical iPhone journey using two new accounts.
- Android Internal Testing candidate using the identical source after iOS passes.
- Capture screenshots of onboarding, create account, verification result, home, message, calendar, Settings, and icon.

Stop before:
- App Store submission.
- Play production rollout.
- Any irreversible provider or data migration action.

Return this handoff:
- Branch and exact commit SHA.
- Clean git status.
- Changed-file summary.
- Commands and exact pass/fail results.
- iOS/Android artifact IDs, hashes, versions, and build numbers.
- Physical-device evidence.
- Remaining blockers.
- Documentation updated.
- Clear recommendation: APPROVE FOR STORE SUBMISSION or DO NOT APPROVE.
```

## Developer Prompt 2 â€” Just Checking In, Both Stores

```text
You are the Just Checking In release developer.

Goal:
Complete the existing Android and iOS releases without adding gameplay features. Produce truthful store-ready candidates and evidence for reviewer approval.

Source and tools:
- Unity source: D:\FTC-GAMES\just-checking-in-game-clean
- Operational docs: C:\FTC HOLDING\APPS\just-checking-in-game
- Unity: C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe
- Android build entry: Jci.Editor.BuildScript.BuildAndroid
- Android output: D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab
- Use an isolated D:-backed FTC worktree for any repository documentation changes.
- You are not alone in the repository. Do not reset, clean, or modify unrelated parent-checkout work.

Android target:
- Package: com.ftcholding.justcheckingin
- Marketing version: 0.2.0
- Version code: 2
- Verify the existing version-code-2 AAB before deciding whether to rebuild.
- Expected historical SHA-256:
  0272C6A1B9FBB4267AB8736FDBF4F6B6A09DB7F7E4689E321E81679879589129
- Confirm package, signing certificate, version code, icon, and target SDK from the actual artifact.
- Complete the Play listing with:
  - 512Ã—512 branded icon.
  - 1024Ã—500 feature graphic.
  - Two to eight genuine screenshots captured from the real build.
  - Existing truthful no-ads, data-safety, audience, content-rating, privacy, and category declarations.
- Do not fabricate screenshots or change declarations merely to pass review.

iOS target:
- App Store ID: 6799443182
- Bundle: existing registered JCI bundle
- Current historical target: version 1.0.0, build 2
- First verify the current App Store Connect state live.
- If build 2 remains Waiting for Review, do not upload a duplicate.
- If Apple reports an issue, fix only the stated issue and increment the build number when required.
- Verify icon, screenshots, metadata, privacy answers, age rating, review notes, and automatic-release selection.
- Normalize shell scripts to LF before any Mac execution.
- Verify the Mac Unity/Xcode versions before running the wrapper.

Experience smoke:
- Fresh install and launch.
- Branded icon visible.
- Core game/tutorial is understandable without developer explanation.
- Primary play/check-in loop completes.
- Pause/resume and relaunch work.
- No broken, placeholder, or technical text.
- No undeclared microphone, camera, location, recording, or tracking behavior.

Stop before:
- Final Play production submission if a new owner declaration is required.
- Replacing an already-reviewed iOS build without a documented reason.
- Claiming either app is public based only on upload or review submission.

Return this handoff:
- Exact Unity source state and repository commit.
- Android artifact path, size, SHA-256, signing identity, version, and code.
- Current Play release/setup state and genuine listing assets.
- Current App Store version/build/review state.
- Test devices and results.
- Screenshots and portal evidence.
- Remaining policy or owner-attestation blockers.
- Clear recommendations:
  - ANDROID APPROVE / DO NOT APPROVE
  - IOS APPROVE / DO NOT APPROVE
```

## Reviewer Workflow

After each developer returns:

1. I inspect the exact diff and dirty state.
2. I verify tests, artifacts, hashes, versions, signing boundaries, screenshots, and store claims.
3. I report findings by severity.
4. I issue one verdict:
   - Approved for submission.
   - Changes required.
   - Blocked by owner/provider action.
5. You provide product feedback.
6. Only then does the developer receive the final publication prompt for the exact reviewed artifact.
7. Completion requires a public store URL and visible versionâ€”not merely upload, TestFlight, Internal Testing, or â€œWaiting for Review.â€

## Defaults

- PeacePad ships as `2.0.1`, not `2.1.0`.
- PeacePad is the primary release; JCI proceeds concurrently.
- JCI targets both stores, with Android listing completion and live iOS-state verification.
- Build artifacts and caches stay on D:.
- No unrelated products or new features enter this sprint.


