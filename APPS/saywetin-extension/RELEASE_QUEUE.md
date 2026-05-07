# SayWetin Extension Release Queue

This is the active execution surface for remaining Chrome extension release work.

Use `TESTING.md` as the supporting test plan and `WEBSTORE.md` as the submission reference.

## Remaining Tasks

### Manual QA
- [ ] Test on multiple tabs and sites such as YouTube and Spotify
- [ ] Test with and without a user session
- [ ] Test network and backend failure handling
- [ ] Test on Chrome stable and Chrome beta

### Infrastructure
- [ ] Set `VITE_SAYWETIN_API_BASE_URL` explicitly when targeting a non-default QA backend

### Documentation Guard
- [ ] Validate that the docs guard blocks a code-only pull request with no docs changes

### Chrome Web Store Submission

> **HARD BLOCKER — awaiting funds**
> Chrome Web Store developer account requires a one-time $5 USD registration fee.
> Do not proceed with submission steps below until the account is registered.
> Dashboard: https://chrome.google.com/webstore/devconsole

- [ ] Pay $5 registration fee and activate Chrome Web Store developer account ← BLOCKER
- [x] Privacy policy drafted (`docs/privacy.html`) — deploy to `https://saywetin.app/privacy` before submitting
- [ ] Deploy `docs/privacy.html` to `saywetin.app/privacy` (no web frontend exists yet — needs a home)
- [ ] Prepare store listing assets: at least 1 screenshot (1280×800 or 640×400) and a 440×280 tile image
- [ ] Upload `saywetin-extension.zip` to the Chrome Web Store dashboard
- [ ] Fill out listing: short description (≤132 chars), full description, category, language
- [ ] Add privacy policy URL (`https://saywetin.app/privacy`) in the listing form
- [ ] Submit for review (Google review SLA: 1–7 days)