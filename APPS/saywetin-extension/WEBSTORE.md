# SayWetin Chrome Extension — Chrome Web Store Submission Checklist

> Status: supporting reference.
>
> Use `RELEASE_QUEUE.md` for the active remaining work list.
> This file should stay focused on store submission requirements and reference steps.

## 1. Manifest & Build
- [x] manifest.json is Manifest V3, icons included
- [x] Output in dist/ is clean and production-ready
- [x] No dev/test code in build

## 2. Features
- [x] Popup UI: hero image, orb, branding
- [x] Tab audio capture and recognition
- [x] Lyric meaning (cultural-analysis)
- [x] Deep-link to track page
- [x] Sync recent recognitions if authenticated

## 3. Permissions
- [x] Only required permissions: tabCapture, storage, scripting, tabs
- [x] No unnecessary host permissions

## 4. Testing
- [x] Manual QA on Chrome stable and beta
- [x] Tested on multiple sites/tabs
- [x] Error handling validated

## 5. Assets
- [x] 128x128, 48x48, 32x32, 16x16 icons present
- [x] Screenshots of popup UI
- [x] Short and long description
- [x] Feature highlights

Suggested listing copy aligned with the live app:

- Title: `SayWetin: Lyrics & Meaning`
- Short description: `Recognize songs in your browser tab, follow the lyric, and understand slang and cultural meaning instantly.`
- Feature highlights: `Song recognition`, `Live lyric follow-up`, `Slang meaning`, `Cultural context`

## 6. Privacy & Compliance
- [x] No tracking, analytics, or ads
- [x] User audio is only sent to backend for recognition
- [x] Privacy policy link (saywetin.app/privacy)

## 6.1 Backend Endpoint
- [x] Primary endpoint is `https://api.saywetin.app`
- [x] Health check passes: `https://api.saywetin.app/health`
- [x] Railway fallback endpoint documented for ops only

## 7. Submission
- [ ] Zip dist/ and upload to Chrome Web Store
- [ ] Fill out listing details, upload screenshots
- [ ] Add privacy policy URL
- [ ] Submit for review

## 8. Documentation Consistency
- [x] README reflects current API endpoint and extension ID
- [x] RELEASE-NOTES includes latest infra and release changes
- [x] TESTING includes domain and health verification steps

---

## How to Publish
1. Run `npm run build`
2. Zip the `dist/` folder
3. Go to https://chrome.google.com/webstore/devconsole
4. Upload zip, fill out listing, submit
