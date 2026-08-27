# PeacePad 2.0.1 end-to-end QA — 2026-08-27

## Scope

This check used the Play-delivered production binary on a physical Pixel 7 and
the Canada production API. It did not create a family, conversation, message,
calendar event, record, invitation, or call. No dummy or simulated production
data was used.

| Item | Evidence |
| --- | --- |
| Package | `ca.peacepad.family` |
| Android release | `2.0.1` / version code `45` |
| Device | Pixel 7 (`panther`), adb serial `2B260DLH2000C8` |
| Runtime | `production`, Canada, writes enabled, `playstore-production` |
| Play signer | SHA-1 `7b5df5e9f9a66b2867e92c2f47782f5ee7be2e2b` |
| Source worktree | `D:/PeacePadRelease/worktrees/peacepad-2.0.1-main-integration` |
| App log capture | `D:/PeacePadRelease/peacepad-android-qa-2026-08-27.log` |
| Latest logcat | `D:/PeacePadRelease/peacepad-android-logcat-latest-2026-08-27.txt` |

## Passed

- Production health returned `status: ok`, `environment: production`,
  `region: ca`, and `writesEnabled: true`.
- Play-installed APK manifest matched package, version, production runtime,
  production writes, and Google sign-in enabled.
- Onboarding displayed the PeacePad logo and the Next/Skip flow.
- Native Google sign-in opened the Google account picker. Selecting the
  controlled `fejiro.efiuvwere@gmail.com` account reached the production
  family setup screen.
- Force-stop and relaunch restored the authenticated session.
- Sign-out followed by Google re-entry returned to family setup without an
  auth crash or duplicate account.
- Empty family and invitation forms correctly disabled their submit actions.
- Accessibility labels exposed the logo, family name, and invitation-code
  controls.
- Logcat contained no `DEVELOPER_ERROR`, package-registration failure,
  `GoogleIdentityError`, Supabase auth failure, or app fatal exception.
- A fresh foreground PID-filtered capture showed only normal keyboard/insets
  events from the app. Device-wide Google account warnings were slow binder
  transactions from Android's account authenticator, not a PeacePad crash or
  OAuth rejection.

## Finding: single-parent entry was blocked

The previous runtime required an active shared conversation after a family was
created. A sole parent could authenticate, but was then told to share an
invitation code before the main experience could open. This was a product-flow
gap, not a Google or network failure.

The release source now provides an explicit **Continue without a co-parent**
path from both the first family screen and the post-family connection screen.
It opens a persisted, identity-scoped private workspace. The workspace is
honest about its boundary: no information is shared, and shared messaging,
calendars, and calls remain unavailable until another authorized family member
joins. It does not create a fake conversation or relax server authorization.
The choice is remembered in SecureStore and can be cleared with **Invite a
co-parent later** or **Set up family connection later**.

Regression coverage was added for both paths in
`src/runtime/PeacePadStagingRuntime.test.tsx`.

## Not run / still blocked

- Two-account invitation, messaging, calendar, records, notifications, and
  audio-call journeys require a second controlled account or a real tester
  invite. They were intentionally not fabricated.
- iOS physical-device validation of production build `2.0.1 (6)` remains
  separate from the older staging TestFlight binary that showed the
  “PeacePad unavailable” restore screen.
- Google cancellation/denial was not isolated from cached Play account
  foregrounding and needs a clean-account test.
- Jest and TypeScript binaries are absent from this worktree's incomplete
  `node_modules`; CI or a D:-backed dependency install must run the new tests
  before a replacement store artifact is submitted.

## Source validation

- `git diff --check` passed.
- PeacePad guardrails passed (`node scripts/check-lab-guardrails.cjs`).
- Secret scan passed (143 files checked).
- Babel TypeScript/JSX parsing passed for each changed source and test file.
- The attempted lockfile install was stopped after ten minutes with no
  executable links; no package-lock or source files were changed by it.

## Release interpretation

This change improves first-run UX and removes the invite-code dead end for a
single parent. It is not a claim that shared coordination or audio calling is
complete for a one-account session. A future full solo mode should add an
explicit server-side personal workspace/data contract rather than using a
self-conversation or synthetic UUID.
