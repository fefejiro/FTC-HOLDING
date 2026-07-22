---
name: ftc-ios-app-store-release
description: Use when preparing, validating, uploading, testing, or submitting an FTC/Una Labs iOS app through Xcode, TestFlight, or App Store Connect, especially for PeacePad, SayWetin, Capacitor apps, MacinCloud sessions, Apple privacy answers, pricing/availability, App Review, or release-blocker handoff.
---

# FTC iOS App Store Release

Use this skill to move an FTC app toward iPhone availability without pretending that a simulator run, uploaded archive, TestFlight link, or App Review submission means the same thing.

## Core rules

- Start with a repo audit unless the user explicitly asks to continue an already-audited release.
- Preserve the existing app architecture unless the user explicitly authorizes migration.
- Do not trigger Xcode Cloud unless explicitly requested.
- Keep Apple credentials, card details, passwords, and 2FA codes out of logs, screenshots, commits, and final messages.
- Treat App Store Connect dashboard changes as external state: report what was actually changed and what still needs Apple approval.
- Do not commit broad generated files while release work is happening; stage only release notes, scripts, metadata, or intentionally changed app files.

## Workflow

1. Identify the release target:
   - app name and repo path
   - bundle ID
   - Apple Developer team
   - current branch and dirty worktree
   - intended lane: local simulator, physical device, TestFlight, or public App Store
2. Verify local readiness:
   - install/build commands
   - Capacitor sync status for web-to-iOS apps
   - Xcode workspace/project path
   - signing team and bundle ID
   - simulator run or archive status
3. Separate release states:
   - `simulator_ok`: app runs in Xcode simulator only
   - `archive_validated`: Xcode archive validation passed
   - `build_uploaded`: build is visible in App Store Connect/TestFlight
   - `testflight_internal`: internal testers can install
   - `testflight_external_waiting_review`: public link exists but beta review is pending
   - `ready_for_review`: App Store metadata, privacy, pricing, and build are complete
   - `submitted_for_review`: Apple App Review submission completed
   - `live`: Apple approved and app is available on App Store
4. Complete App Store Connect in this order:
   - App Information and age rating
   - build selection
   - export compliance
   - screenshots and app metadata
   - review contact and demo instructions
   - App Privacy
   - pricing and availability
   - App Review submission
5. Capture blockers exactly:
   - expired card or membership billing
   - Apple 2FA/password prompt
   - EU trader status
   - privacy policy URL validation
   - missing screenshots
   - build processing or beta review pending

## App Privacy pattern for PeacePad-like FTC apps

Use the narrowest truthful declarations. Do not select `Sensitive Info` unless the app actually collects highly sensitive categories beyond normal family/communication context.

For data types used only to run the app or improve basic product behavior:

- Purpose: App Functionality
- Add Analytics only for telemetry/product usage categories where analytics is actually used.
- Add Product Personalization only for location or preference data that changes user experience.
- Linked to identity: Yes when stored against account/device/user records.
- Tracking: No unless data is shared with third parties for advertising or cross-app tracking.

See `references/app-store-connect-checklist.md` for a compact checklist and wording patterns.

## Remote Mac / MacinCloud operating notes

- Prefer a visible RDP session for Xcode/App Store Connect tasks; it provides human-verifiable state.
- If RDP focus or keyboard routing becomes unreliable, pause and report the exact screen rather than guessing.
- Keep screenshots proof-focused and redact/avoid credentials.
- Expect Apple sessions to expire during long App Store Connect forms. Resume from the last confirmed saved/published state.
- Browser zoom or modal footer clipping can hide App Store Connect buttons. Use screenshots between steps when coordinates become unreliable.

## Contribution and git hygiene

- GitHub contribution squares count commits only when they meet GitHub's contribution rules, including author email/account association, default/gh-pages branch or merged PR, and non-fork visibility rules.
- Before committing, check `git status --short` and avoid broad staging in a dirty monorepo.
- If hundreds of unrelated changes exist, commit a scoped release playbook or app change separately.
- Use a clear message such as `docs: add ios app store release playbook`.

## Output

- Current release state
- What changed in App Store Connect or the repo
- What is verified vs inferred
- Remaining blockers and who must act
- Exact next step
