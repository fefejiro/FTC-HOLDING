# Mobile Setup — Capture Ideas Anywhere

5-minute setup so you can drop ideas into the FTC backlog from your phone.

## 1. Install GitHub Mobile
- iOS: https://apps.apple.com/app/github/id1477376905
- Android: https://play.google.com/store/apps/details?id=com.github.android
- Sign in as `@fefejiro`.

## 2. Home-screen shortcut → "New Issue"
Add this URL as a home-screen shortcut for one-tap idea capture:

\`\`\`
https://github.com/fefejiro/FTC-HOLDING/issues/new/choose
\`\`\`

**iOS (Safari):** open URL → Share → Add to Home Screen → name it "FTC Idea".
**Android (Chrome):** open URL → ⋮ menu → Add to Home screen → name it "FTC Idea".

You'll get four templates: Agent-Ready, Continuous Improvement, Bug, Idea.

## 3. Notifications
In GitHub Mobile → Settings → Notifications, enable:
- [x] Pull request reviews requested
- [x] Issues assigned to you
- [x] Mentions
- [ ] (turn off everything else to keep noise low)

## 4. Offline capture (no signal)
Edit `INBOX.md` at repo root in any text editor. On reconnect:

\`\`\`bash
npm run inbox:flush
\`\`\`

Each bullet becomes a GitHub issue. Prefix `ci:`, `bug:`, or `idea:` to route; default is `agent-ready`.

## 5. Verify
- [ ] Open GitHub Mobile, navigate to fefejiro/FTC-HOLDING — issues visible
- [ ] Tap home-screen shortcut → choose template → submit a test idea
- [ ] Confirm test issue appears with the right label
- [ ] Close and delete the test issue

Done. The agent picks up `agent-ready` and `continuous-improvement` issues nightly.
