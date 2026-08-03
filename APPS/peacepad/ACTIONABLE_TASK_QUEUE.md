# PeacePad Actionable Task Queue

This file extracts concrete work from backlog, release, QA, and store documentation.

Use this as the short execution queue. For release gating, the canonical checklist remains `RELEASE_EXECUTION_CHECKLIST.md`.

## Do Now

### iOS App Review Monitoring

- [x] Supply and verify the isolated synthetic reviewer account
- [x] Save App Review credentials and testing notes
- [x] Reply to the Guideline 2.1 reviewer-access issue
- [x] Resubmit existing build `1.0.9 (1)`
- [x] Monitor the submission through approval
- [x] Respond narrowly to Apple's Resolution Center questions
- [x] Verify release, public App Store listing, and real-iPhone installation

See `ios-prep/IOS_APP_REVIEW_HANDOVER_2026-07-26.md` for the historical review
recovery. Version 1.0 is now public; do not upload a replacement binary merely
to change website discovery links or editable metadata.

### Release Infrastructure
- [x] Confirm Cloudflare Pages project `ftc-holding` as the production frontend owner
- [x] Deploy and verify the App Store discovery update from commit `eba4ddd3`
- [ ] Disconnect the unused Git integration from the legacy Cloudflare Worker `peacepad`
- [ ] Confirm whether Android release is PWA/TWA, wrapper, or native package
- [x] Verify `peacepad.ca` and `www.peacepad.ca` are attached to the Pages project
- [x] Verify privacy policy, terms, and support URLs are reachable on the production domain

See `docs/PRODUCTION_DEPLOYMENT_HANDOVER_2026-08-02.md`. Do not delete the
legacy Worker until its lack of domains, routes, bindings, and traffic is
reconfirmed. Disconnecting its Git integration is the current safe cleanup.

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
