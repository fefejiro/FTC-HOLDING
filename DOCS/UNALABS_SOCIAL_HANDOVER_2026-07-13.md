# Una Labs Social Newsroom Handover - 2026-07-13

## Final Outcome

Una Labs posted today's regional tech-news brief to both channels.

- LinkedIn: posted and verified through the Una Labs page visible-browser workflow.
- Instagram: posted and verified on the `unalabs.cloud` profile grid.
- Schedule: `UnaLabsSocial-PeakDraft` is registered for weekdays at 6:45 AM Eastern.

## Active Daily Workflow

```text
discover regional stories
-> build North America / Africa / Rest of World brief
-> render three Instagram carousel slides
-> write Instagram caption and LinkedIn post
-> run quality checks
-> publish through visible Chrome
-> save proof and ledger
```

## Key Commands

```powershell
cd "C:\FTC HOLDING\APPS\una-social-agent"
npm run quality:today
npm run publish:visible -- --channels instagram,linkedin
npm run schedule:status
```

Scheduled task command:

```powershell
scripts/social-run.ps1 -ForceNew -Channels "instagram,linkedin" -AllowScheduledPublish
```

## Proof Files

Proof folder:

```text
APPS/una-social-agent/content/proof/2026-07-13/
```

Important files:

```text
manual-instagram-posted.json
manual-instagram-profile-verify.png
manual-instagram-caption-filled.png
visible-linkedin-posts-verify.png
visible-linkedin-after-post.png
```

Instagram verification note:

```text
The new post is visible as the first grid item on the unalabs.cloud profile proof screenshot.
```

## Fixes Made

- Preserved the existing `APPS/una-social-agent` pipeline instead of rebuilding it.
- Enabled the weekday 6:45 AM Eastern scheduled publish path.
- Added/kept quality-gate checks before publishing.
- Added approval and caption preflight safeguards.
- Improved Instagram carousel handling so all three slide PNGs can be uploaded.
- Fixed the Instagram Create path for collapsed left-rail navigation.
- Corrected the file-picker fallback position for `Select from computer`.
- Documented that upper-monitor Chrome can use valid negative Y coordinates.

## Important Browser Lesson

Do not treat negative coordinates as automatically wrong.

In the successful Instagram run, Chrome was on the upper virtual monitor:

```text
Chrome rectangle example: L-8, T-1088, R1928, B-40
```

The working Create click used the real virtual coordinate, such as:

```text
x = 28
y = -458
```

Earlier attempts failed because the click was clamped back onto the primary monitor.

## Current Schedule

Windows task:

```text
UnaLabsSocial-PeakDraft
```

Next expected run after this handover:

```text
2026-07-14 6:45 AM Eastern
```

## Editorial Standard

Keep the daily brief:

- source-backed
- regional: North America, Africa, Rest of World
- simple human language
- useful to builders and operators
- no fake statistics
- no generic template-only visuals
- proof-backed after posting

## Remaining Improvement

The Instagram flow now works, but tomorrow's scheduled run should be watched once to confirm it repeats without manual intervention. If it fails, inspect the latest proof screenshot first before changing the pipeline.
