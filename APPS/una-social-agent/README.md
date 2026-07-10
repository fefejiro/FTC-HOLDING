# Una Social Agent

Social content agent for Una Labs.

Current default: caption-only AI and technology news drafts. Image generation is paused.

It creates AI and technology news packages for:

- Instagram: five-slide 1080 x 1350 carousel package
- Instagram cover: bold editorial news cover with one large headline
- LinkedIn: separate professional caption with business and implementation context
- posting brief: one file with image path, copy/paste text, sources, and proof command
- story package: brief, source manifest, asset manifest, captions, slides, QA, and proof
- nine-post grid preview and contact sheet for feed planning
- browser publishing proof screenshots
- JSONL ledger entry with posted/failed status

The caption-only scheduled runner performs:

1. `npm run caption:write`
2. Writes Instagram and LinkedIn caption drafts
3. Saves source and proof metadata
4. Stops without image generation, OpenAI calls, or browser publishing

The older visual and browser-publishing commands remain in the repo, but they are no longer the default scheduled path.

## Publication Standard

The account should feel like a reliable AI and technology news publication, not a corporate slide deck.

- Covers use one strong editorial hero image or product/story object.
- Covers use one dominant headline and very little secondary text.
- Una Labs branding stays understated: handle, small mark, or final-slide credit.
- No tiny charts, signal scores, dashboard panels, paragraphs, dates, or source clutter on the cover.
- Captions stay factual, human, source-backed, and separate for Instagram and LinkedIn.
- Draft seed posts are not publish-ready until their specific primary source is verified.

## Low-Cost Caption-Only Mode

Caption-only mode does not call OpenAI, does not generate images, and does not publish anything.

```powershell
npm run caption:write
```

Or pass a specific source-backed story:

```powershell
npm run caption:write -- --title "Meta opened a new AI lane for developers" --url "https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/" --source "Meta AI Blog" --summary "Meta released Muse Spark 1.1 and opened developer access through the Meta Model API."
```

Output:

```text
content/captions/YYYY-MM-DD/caption-pack.md
content/captions/YYYY-MM-DD/caption-pack.json
```

Writing standard:

- plain human language
- no fancy words
- no hype claims
- no fake urgency
- source included
- Instagram and LinkedIn captions written separately
- LinkedIn includes a simple source-to-impact text map
- status stays `draft_caption_only` until a person approves or posts it

## New Editorial Workflow

Generate the redesigned Meta Muse Spark story:

```powershell
npm run social:generate
```

Generate the initial nine-post feed package:

```powershell
npm run social:seed-feed
```

Render or refresh previews:

```powershell
npm run social:preview
```

Run QA against rendered story packages:

```powershell
npm run social:qa
```

Important output paths:

```text
content/stories/YYYY-MM-DD-story-slug/
content/previews/current-nine-post-grid.png
content/previews/current-nine-post-contact-sheet.png
content/previews/before-after-meta-muse.png
```

The generated story directory contains:

```text
brief.json
source-manifest.json
asset-manifest.json
headline-options.json
slide-01-cover.png
slide-02-what-happened.png
slide-03-why-it-matters.png
slide-04-signal.png
slide-05-watch-next.png
instagram-caption.md
linkedin-caption.md
qa-report.json
publish-result.json
proof/
```

## Commands

```powershell
npm run draft:today
npm run asset:png
npm run publish:browser
npm run publish:browser:dry-run
npm run publish:visible
npm run publish:visible:dry-run
npm run browser:open-profile
npm run browser:open-cdp
npm run browser:open-fejiro-cdp
npm run browser:seed-profile
npm run post:record -- --instagram-url "https://..." --linkedin-url "https://..."
npm run quality:today
npm run report:today
npm run schedule:register
npm run schedule:status
npm run social:generate
npm run social:seed-feed
npm run social:preview
npm run social:qa
npm run caption:write
```

Normal same-day runs are idempotent: if a package already exists for today,
`draft:today` refreshes the same topic, copy, SVG, and PNG instead of picking a
different story. Use this only when you intentionally want a new topic:

```powershell
npm run draft:today -- --force-new
```

## Output

Drafts are written under:

```text
content/drafts/YYYY-MM-DD/
```

Assets are written under:

```text
content/assets/YYYY-MM-DD/
```

Ledger:

```text
content/ledger/social-ledger.jsonl
```

## Posting Mode

Current preferred mode is visible Chrome automation, matching the job-agent visible browser workflow:

1. Generate the package.
2. Run the quality check.
3. Use the already-open visible Fejiro Chrome window.
4. Upload `instagram-card.png` to Instagram through the real page.
5. Paste the Instagram caption and publish.
6. Paste the LinkedIn post to the Una Labs company page and publish.
7. Verify the post surfaces and save screenshots under `content/proof/YYYY-MM-DD/`.
8. Record the final status in `content/ledger/social-ledger.jsonl`.

Test browser readiness without posting:

```powershell
npm run publish:visible:dry-run
```

Default browser values:

```text
Instagram username: unalabs.cloud
LinkedIn company slug: unalabs-cloud
Chrome profile: .browser-profile
```

Optional overrides:

```powershell
$env:UNA_INSTAGRAM_USERNAME="unalabs.cloud"
$env:UNA_LINKEDIN_COMPANY_SLUG="unalabs-cloud"
$env:UNA_LINKEDIN_CREATE_URL="https://www.linkedin.com/company/unalabs-cloud/admin/"
$env:UNA_LINKEDIN_VERIFY_URL="https://www.linkedin.com/company/unalabs-cloud/posts/"
$env:UNA_SOCIAL_BROWSER_PROFILE_DIR="C:\FTC HOLDING\APPS\una-social-agent\.browser-profile"
```

The dedicated Chrome profile must stay logged into the `unalabs.cloud` Instagram account and the Una Labs LinkedIn admin account. The script will not count a post as successful unless it sees a publish/verification signal and writes proof.

Open the dedicated browser profile with:

```powershell
npm run browser:open-profile
```

Seed the dedicated browser profile from the Fejiro Chrome profile (`Profile 5`) when that profile already has the Una Labs Instagram/LinkedIn sessions:

```powershell
npm run browser:seed-profile
```

Open the same dedicated profile with a control port for CDP attachment:

```powershell
npm run browser:open-cdp
$env:UNA_SOCIAL_CDP_URL="http://127.0.0.1:9222"
npm run publish:browser:dry-run
```

If all normal Chrome windows are closed, open the real Fejiro Chrome profile with a control port:

```powershell
npm run browser:open-fejiro-cdp
$env:UNA_SOCIAL_CDP_URL="http://127.0.0.1:9222"
npm run publish:browser:dry-run
```

## Schedule

Default scheduled task:

```text
UnaLabsSocial-PeakCaption
```

Default run time:

```text
12:30 PM Eastern, weekdays
```

Register it:

```powershell
npm run schedule:register
```

This one daily peak Eastern run creates both Instagram and LinkedIn caption drafts.
Instagram still needs an image or reel before it can be posted. LinkedIn can use
the text/link caption directly when you choose to publish.
