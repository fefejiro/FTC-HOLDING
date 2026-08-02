# PeacePad Actionable Task Queue

This file extracts concrete work from backlog, release, QA, and store documentation.

Use this as the short execution queue. For release gating, the canonical checklist remains `RELEASE_EXECUTION_CHECKLIST.md`.

## Do Now

### iOS App Review Monitoring

- [x] Supply and verify the isolated synthetic reviewer account
- [x] Save App Review credentials and testing notes
- [x] Reply to the Guideline 2.1 reviewer-access issue
- [x] Resubmit existing build `1.0.9 (1)`
- [ ] Monitor the current `Waiting for Review` submission
- [ ] Respond narrowly if Apple sends a new Resolution Center question
- [ ] After approval, verify automatic release and the public App Store listing

See `ios-prep/IOS_APP_REVIEW_HANDOVER_2026-07-26.md`. Do not upload a
replacement build or alter the active submission without a verified blocker.

### Release Infrastructure
- [ ] Confirm the authoritative production deployment workflow and owner
- [ ] Confirm whether Android release is PWA/TWA, wrapper, or native package
- [ ] Verify the production domain configuration is final and live
- [ ] Verify privacy policy and terms URLs are reachable on the production domain

### Store Readiness
- [ ] Finalize app icon, screenshots, store descriptions, and support contact details
- [ ] Prepare or confirm the feature graphic if it will be used
- [ ] Confirm content rating answers before Play submission
- [ ] Review Play policy and data safety declarations against the live product

### Build and Signing
- [ ] Confirm keystore or signing credentials are available and backed up
- [ ] Confirm Android toolchain is available on the build machine
- [ ] Run a clean release build and verify the output artifact
- [ ] Verify version number, version code, and release notes for the next release

### Production Verification
- [ ] Verify authentication works on production
- [ ] Verify messaging works on production
- [ ] Verify Conch Mode or calling works on production
- [ ] Verify calendar, expenses, and tasks flows work on production
- [ ] Verify required integrations behave correctly in production

## This Week

### Notifications and Communication
- [ ] Configure VAPID keys for web push
- [ ] Configure Mailjet for email notifications
- [ ] Decide whether Firebase native Android push is required for the release window

### Android QA
- [ ] Test on budget, mid-range, and recent Android devices
- [ ] Verify permission prompts, reconnect behavior, and offline handling
- [ ] Check logs for critical errors during core flows
- [ ] Record blocking bugs found during device testing

### Reliability and UX
- [ ] Investigate current memory usage and confirm whether there is a leak risk
- [ ] Improve onboarding flow for first-time users
- [ ] Improve connection error messaging
- [ ] Tighten offline mode behavior where current QA shows gaps

## Later

### Product Enhancements
- [ ] Voice message transcription
- [ ] Message reactions
- [ ] Recurring calendar events
- [ ] Expense categories and reporting
- [ ] Multiple child profiles

### Platform and Operations
- [ ] Set up staging environment
- [ ] Add automated backup verification
- [ ] Add load testing for scalability
- [ ] Add security audit and rate-limiting review

### Analytics and Accessibility
- [ ] Add engagement and feature usage metrics
- [ ] Add error monitoring dashboard
- [ ] Improve accessibility and tablet support

## Deferred or Decision-Dependent

- [ ] Decide whether APNs support matters yet or should wait for iOS work
- [ ] Decide whether TWA is sufficient for launch or whether native packaging is required
- [ ] Decide whether feature graphic creation is mandatory for the first submission
