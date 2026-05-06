# PeacePad Release Execution Checklist

This is the canonical release checklist for PeacePad.

Use this file as the single execution surface for release readiness, Android QA, store submission, and production verification. Older checklist documents remain as supporting references only where they contain background detail.

## Scope

- Release packaging and signing
- Production deployment verification
- Android QA and device coverage
- Play Store metadata and submission
- Final launch decision

## Reference Sources

- `PLAY_STORE_CHECKLIST.md` for store-specific background
- `PLAY_STORE_LAUNCH_READINESS.md` for launch context and prior planning notes
- `ANDROID_QA_CHECKLIST.md` for expanded manual QA coverage
- `deployment-checklist.md` for environment and deployment background

## 1. Release Prerequisites

- [ ] Confirm release target, owner, and go/no-go date
- [ ] Confirm production domain, privacy policy URL, and terms URL are live
- [ ] Confirm production secrets and environment variables are set
- [ ] Confirm signing strategy is ready (keystore or CI signing)
- [ ] Confirm version number and release notes for this build

## 2. Build Readiness

- [ ] Verify Android SDK / toolchain is installed on the build machine
- [ ] Verify Gradle signing configuration is working
- [ ] Verify `npm run build` completes without blocking errors
- [ ] Verify Android release build or bundle command completes successfully
- [ ] Verify artifact output exists and is the expected version
- [ ] Verify release artifact size and packaging are acceptable for Play submission

## 3. Production Deployment Verification

- [ ] Deploy current production build
- [ ] Verify production app loads on the canonical domain
- [ ] Verify privacy and terms pages are reachable on production
- [ ] Verify authentication works on production
- [ ] Verify critical API-backed flows work with production configuration
- [ ] Verify email, notifications, and other required integrations behave correctly

## 4. Android QA

### Device Coverage
- [ ] Test on at least one budget Android device
- [ ] Test on at least one mid-range Android device
- [ ] Test on at least one recent Android device
- [ ] Test one larger-screen or tablet layout if supported

### Core User Flows
- [ ] Install flow works cleanly
- [ ] Login or onboarding works
- [ ] Messaging works end-to-end
- [ ] Conch Mode or calling flow works end-to-end
- [ ] Calendar and scheduling flows work
- [ ] Expense tracking works
- [ ] Tasks and reminders work
- [ ] Privacy and safety surfaces are accessible

### Quality Checks
- [ ] Permission prompts behave correctly
- [ ] No critical console or device log errors during core flows
- [ ] App remains usable under normal mobile network conditions
- [ ] Offline or reconnect behavior is acceptable for intended flows
- [ ] Performance is acceptable on mid-range hardware

## 5. Store Listing Assets

- [ ] Final app icon is available in required dimensions
- [ ] Required screenshots are complete and current
- [ ] Feature graphic is prepared if needed
- [ ] Short description is finalized
- [ ] Full description is finalized
- [ ] Support contact details are finalized
- [ ] Category and audience selections are finalized
- [ ] Content rating answers are prepared

## 6. Play Console Submission

- [ ] App record exists in Play Console
- [ ] Metadata is populated from approved assets and copy
- [ ] Privacy policy URL is entered and verified
- [ ] Terms or support URLs are entered where required
- [ ] Internal or closed testing track is configured if needed
- [ ] Release artifact is uploaded
- [ ] Release notes are added
- [ ] Data safety and policy declarations are reviewed against the live product
- [ ] Submission is sent for review

## 7. Launch Decision

- [ ] No critical blockers remain open
- [ ] Open medium issues have explicit owner and follow-up plan
- [ ] Rollback or hotfix path is known
- [ ] Team sign-off recorded

## 8. Post-Submission Checks

- [ ] Verify the submitted version and notes match the intended build
- [ ] Monitor review feedback and policy notices
- [ ] Track launch issues, crash reports, and user feedback after release

## Open Decisions

- [ ] Confirm whether the release path is PWA/TWA, native wrapper, or full native Android package
- [ ] Confirm the authoritative production hosting and deployment workflow
- [ ] Confirm the minimum supported Android device matrix for release sign-off