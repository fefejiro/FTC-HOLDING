# PR Draft: LinkedIn Adapter Engine (Send-Attempt Only)

## Summary
- Added LinkedIn adapter with send-attempt-only interception and send-on-enter detection via DOM hints.
- Expanded LinkedIn composer/send selectors and added debug hint logging.
- Added LinkedIn QA checklist in `docs/LINKEDIN_QA.md`.

## Demo Notes
- Enter triggers Guardian only when the "Press Enter to Send" hint is present.
- Ctrl+Enter and the Send button always count as send attempts.

## Testing
- Not run in this pass (per request to pause testing).
