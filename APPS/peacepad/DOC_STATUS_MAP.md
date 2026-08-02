# PeacePad Document Status Map

This file classifies the main checklist-heavy documents so execution work stays concentrated in the right places.

## Active Execution Surfaces

- `RELEASE_EXECUTION_CHECKLIST.md`
  - Canonical release gating checklist
- `ACTIONABLE_TASK_QUEUE.md`
  - Short actionable work queue extracted from broader docs
- `ios-prep/IOS_APP_REVIEW_HANDOVER_2026-07-26.md`
  - Current iOS submission status, verified evidence, security cleanup, and
    next-owner actions

## Supporting Reference Documents

- `PLAY_STORE_CHECKLIST.md`
  - Play Store-specific background and detailed notes
- `PLAY_STORE_LAUNCH_READINESS.md`
  - Historical launch planning context and supporting notes
- `ANDROID_QA_CHECKLIST.md`
  - Expanded manual QA depth and device coverage detail
- `deployment-checklist.md`
  - Deployment setup and environment background
- `VERSIONING_GUIDE.md`
  - Versioning rules and release mechanics
- `GOOGLE_PLAY_DEPLOYMENT.md`
  - Broader Play Store deployment guidance
- `REQUIREMENTS.md`
  - Detailed feature behavior and acceptance criteria
- `BACKLOG.md`
  - Broader roadmap and backlog context

## Archive Candidates

- `PLAY_STORE_LAUNCH_READINESS.md`
  - Archive once any still-relevant tasks are fully reflected in the canonical checklist and actionable queue
- Any checklist file containing dated launch assumptions or deployment details that are no longer true

## Rules

- Add new release tasks to `RELEASE_EXECUTION_CHECKLIST.md` if they gate shipping
- Add new concrete work items to `ACTIONABLE_TASK_QUEUE.md` if they are actionable within the next execution window
- Keep background explanations in supporting docs instead of duplicating them in the active execution surfaces
