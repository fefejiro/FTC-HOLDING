# Una Labs Social News Handover - 2026-07-15

## Current Goal

Una Labs should publish one source-backed AI and technology news package each weekday morning at 6:45 AM Eastern.

The normal news package is:

- Instagram: three-slide carousel, one story each for North America, Africa, and Rest of World.
- LinkedIn: one visual plus a fuller, human, operator-focused write-up.
- Proof: visible browser verification screenshots and a JSONL ledger entry.

Una Labs also has a second evergreen content lane for practical AI and workflow
tips. This is for posts that do not depend on breaking news: ChatGPT tips,
Claude tips, AI review habits, automation ideas, and small-business workflow
advice.

Weekend content is intentionally lighter than weekday content. Saturdays publish
a practical AI/workflow tip for saveable weekend reading. Sundays publish a
week-ahead AI and technology recap. Do not run the full regional breaking-news
brief on weekends unless explicitly requested.

## Schedule

Scheduled task:

```text
UnaLabsSocial-PeakDraft
```

Expected run time:

```text
6:45 AM Eastern, weekdays
```

Check it with:

```powershell
npm run schedule:status
```

Evergreen scheduled task:

```text
UnaLabsSocial-EvergreenTip
```

Expected run time:

```text
5:30 PM Eastern, weekdays
```

Weekend scheduled tasks:

```text
UnaLabsSocial-WeekendTip
UnaLabsSocial-WeeklyRecap
```

Expected run times:

```text
9:00 AM Eastern, Saturdays
10:00 AM Eastern, Sundays
```

Register or refresh it with:

```powershell
npm run schedule:register
```

## Standard Run Flow

```text
discover news
score stories
assign North America, Africa, Rest of World
extract visual facts
render three slide PNGs
write Instagram and LinkedIn captions
run quality gate
publish through visible Chrome
verify public posts
write proof ledger
```

## Evergreen Tip Flow

```text
select practical AI tip
write Instagram and LinkedIn copy
render three-slide tip carousel
render LinkedIn contact image
run evergreen quality gate
publish through visible Chrome
verify public posts
write proof ledger
```

Commands:

```powershell
npm run schedule:evergreen:draft
npm run schedule:evergreen:run-now
npm run schedule:weekend-tip:draft
npm run schedule:weekly-recap:draft
npm run quality:evergreen -- --slot evergreen
```

Evergreen source files:

```text
content/evergreen/tips.json
content/evergreen/weekly-recaps.json
scripts/draft-evergreen-tip.mjs
scripts/render-evergreen-preview.mjs
scripts/quality-evergreen-tip.mjs
scripts/evergreen-run.ps1
```

## Quality Rules

- Do not publish if the story set is weak, stale, sponsored, generic, or not source-backed.
- Do not publish if visual generation falls back to deterministic template art.
- Do not publish if Instagram caption is not visible before Share.
- Do not count LinkedIn or Instagram as done until the post is visible after publishing.
- LinkedIn copy should be more detailed than Instagram and should sound like a practical human briefing, not a short caption.
- Evergreen posts should sound useful and human, not like generic quote cards.
- Evergreen tips must not overwrite the daily news draft. They use a slot key
  like `content/drafts/YYYY-MM-DD-evergreen`.
- Saturday posts use slot `weekend-tip`.
- Sunday posts use slot `weekly-recap` and source line `Una Labs weekly AI notes`.

Run the gate with:

```powershell
npm run quality:today
```

## Browser Lessons

- Start Instagram posting from `https://www.instagram.com/unalabs.cloud/`.
- Do not rely on direct `/create/select/` navigation. It can open the wrong modal.
- Use the real Create control, then the blue `Select from computer` button.
- If Instagram's visible Create button does not respond, use the bookmarklet
  fallback in `visible-social-post.py`. On July 17, this was the path that
  reliably opened `Create new post`.
- Upload the three `regional-news-preview-YYYY-MM-DD-slide-*.png` files as a carousel.
- LinkedIn should use the Page post composer and the Photo route for the visual.
- Avoid raw source URLs inside the LinkedIn body when attaching a photo. Raw URLs can create link previews that interfere with image attachment.
- If a LinkedIn draft modal is open, resolve that draft before switching to
  Instagram. Otherwise Chrome may show `Leave site?` and block navigation.
- Pin visible automation to the Una Labs / Fejiro Chrome window. Do not pick the
  largest Chrome window blindly because another Chrome instance may be open.

## Visual Direction

- Prefer relevant editorial/photo visuals over reusable dashboard-style templates.
- Keep the Afrocentric, mature, grounded visual style as a guide, not a repeated character.
- Rotate scenes when generated visuals are used: commute, cafe, team meeting, boardroom, field work, home office, city, workshop.
- Do not reuse the same face, TTC-style background, laptop pose, or narrator frame for every story.
- If a good visual cannot be produced cheaply and reliably, fail closed and do not publish.

## Source Direction

Use multiple reputable sources and regional coverage. Current source expansion includes:

- OpenAI News
- Microsoft Research
- TechCabal
- Techpoint Africa
- Tech In Africa
- Rest of World / restofworld.org

Rest of World stories should display a concrete source label such as `restofworld.org`, not a vague region label.

## July 15 Verified Outcome

The July 15 live workflow proved the current route can publish to both Instagram and LinkedIn through the visible browser when:

- the visual package passes review,
- the caption is present,
- the browser is logged in,
- LinkedIn uses the image/photo flow,
- proof is checked after posting.

The scheduled task is ready, but it depends on the real signed-in browser session and should fail closed if the platform UI changes or the visual quality gate blocks the package.

## July 17 Recovery Outcome

The July 17 content package generated successfully and passed quality, but the
scheduled run was left in `draft_ready_publish_skipped` and the first visible
publisher attempt blocked at the upload controls.

Verified recovery:

- Instagram posted and was verified on the profile with proof:
  `content/proof/2026-07-17/ig3-07-profile-verify.png`
- LinkedIn posted and was verified in Page posts with proof:
  `content/proof/2026-07-17/linkedin-posts-after-manual-post.png`
- Recovery report:
  `content/proof/2026-07-17/manual-recovery-post-report.json`

Code patch applied after recovery:

- `navigate()` now handles Chrome's `Leave site?` dialog and retries the target URL.
- Instagram publishing now has a bookmarklet fallback for opening the Create modal.

Remaining reliability recommendation:

- Move publishing to official platform APIs once the required Meta and LinkedIn
  app tokens are available. Keep visible-browser posting as a backup path, not
  the long-term primary path.

## July 19 Weekend Schedule And Live Test

Scheduler update:

- `UnaLabsSocial-PeakDraft`: Monday-Friday at 6:45 AM Eastern.
- `UnaLabsSocial-EvergreenTip`: Monday-Friday at 5:30 PM Eastern.
- `UnaLabsSocial-WeekendTip`: Saturday at 9:00 AM Eastern.
- `UnaLabsSocial-WeeklyRecap`: Sunday at 10:00 AM Eastern.

Draft-only tests passed:

- Daily news flow: regional discovery, visual render, quality gate, and LinkedIn
  preview all passed.
- Saturday weekend tip flow passed with slot `weekend-tip`.
- Sunday weekly recap flow passed with slot `weekly-recap`.

Live posting outcome:

- LinkedIn posted successfully from the visible browser and showed the platform
  success confirmation.
- Instagram profile showed the generated July 19 carousel as the newest grid
  item, so the operator avoided posting a duplicate.
- Recovery proof was written to:
  `content/proof/2026-07-19/manual-recovery-post-report.json`

Remaining automation gap:

- The visible publisher can still block at native file-picker attachment on
  Instagram or LinkedIn. Treat this as the highest-priority reliability issue
  before trusting unattended posting. The quality/draft/scheduler layers are
  working; the brittle part is still native media attachment through visible
  browser controls.

## July 20 Visible Publisher Hardening

Root cause found from the July 19/20 upload failures:

- The script could attach to the correct signed-in Chrome profile while Windows
  had that Chrome window parked on a split or offscreen display.
- DOM discovery still found buttons such as `Select from computer`, but the
  physical click coordinates could be negative or outside the primary screen.
- When that happened, Instagram or LinkedIn looked ready, but the native file
  picker never opened.

Fix added in `scripts/visible-social-post.py`:

- Normalize the selected Chrome window onto the primary visible screen before
  navigation, JavaScript DOM probing, coordinate fallback clicks, and media
  upload clicks.
- Bounds-check physical DOM click coordinates before clicking.
- Make native file-picker detection tolerate reused Windows file-dialog handles
  instead of relying only on brand-new window handles.

Verification:

```powershell
python -m py_compile scripts\visible-social-post.py
```

Remaining recommendation:

- Keep the visible Fejiro/Una Labs Chrome profile open and signed in, but it no
  longer needs to be perfectly maximized. The publisher should move it into a
  usable visible position before upload actions.
- Still treat platform API posting as the long-term stronger route once tokens
  and permissions are ready. Visible browser posting is now more reliable, but
  platform UI changes can still break it.

July 20 live recovery:

- Full scheduler run generated the July 20 regional package and passed quality,
  but the first live publish attempt still blocked at native media upload.
- A targeted retry was added for Instagram's visible blue upload button and
  LinkedIn's visible photo toolbar icon.
- Re-running `npm run publish:visible -- --channels instagram,linkedin` with
  the scheduled approval override succeeded after the retry:
  - Instagram uploaded a three-slide carousel and captured profile proof.
  - LinkedIn attached the visual, posted, and verified the new Page post.
- Proof report is local at
  `content/proof/2026-07-20/visible-social-post-report.json`.

Retry rule:

- If a live publish blocks after a possible Share/Post click, check the platform
  profile/page proof before retrying. Do not blindly rerun a live publish if the
  post may already be visible.

## July 21 Duplicate-Post Recovery

Problem observed:

- Instagram showed repeated posts with the same first slide, especially the
  `A scorecard for the AI age` cover.
- LinkedIn previously accepted a text-only post because the proof check only
  confirmed post text on the Page feed, not that the image was actually attached.

Root causes:

- `content/ledger/social-ledger.jsonl` contains some older malformed/multiline
  hand notes. `scripts/draft-regional-brief.mjs` parsed the ledger inside one
  broad `try`, so one bad line caused the script to ignore later posted history.
  Same-day posted URLs were therefore not excluded.
- Visible LinkedIn media upload can open an image editor. The poster must click
  `Next` before the image is truly attached.
- LinkedIn Page prompts and toolbar shifts can make the photo icon click land
  slightly too low. Text-only posting must be treated as blocked when media was
  expected.

Fixes added:

- Ledger parsing now skips bad/non-object lines and keeps reading later posted
  entries.
- Same-day used source URLs are excluded from both ledger entries and timestamped
  proof reports.
- The visible publisher records image hashes in the ledger and blocks reposting
  the same image hash for the same channel/date unless `UNA_ALLOW_REPOST=1` is
  intentionally set.
- Proof reports are timestamped as
  `visible-social-post-report-<epoch>.json` and copied to
  `visible-social-post-report.json` for latest-run convenience, so retries no
  longer erase run history.
- LinkedIn media verification now requires image/media proof when an image was
  expected. Text-only Page-feed verification is not enough.
- LinkedIn media upload now handles the image editor `Next` step and uses a
  corrected visible photo-icon fallback.

July 21 recovery result:

- Generated a fresh regional package with:
  - North America: MIT Technology Review AI
  - Africa: TechCabal
  - Rest of World: The Verge AI
- Visual quality passed with no fallback/template slides.
- Instagram posted a new three-slide carousel and profile proof showed it as the
  newest grid item.
- LinkedIn posted with image media verified on the Page post detail.

Proof files:

- Instagram profile proof:
  `content/proof/2026-07-21/visible-instagram-profile-verify.png`
- LinkedIn media/detail proof:
  `content/proof/2026-07-21/visible-linkedin-post-detail-verify.png`
- Latest report:
  `content/proof/2026-07-21/visible-social-post-report.json`

Operational rule going forward:

- A scheduled/live run is only good when all of these are true:
  - three fresh source URLs,
  - no fallback/template visuals,
  - Instagram caption visible before Share,
  - LinkedIn image media attached and confirmed,
  - proof report records image hashes,
  - duplicate hash guard does not fire.
