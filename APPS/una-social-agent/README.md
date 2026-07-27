# Una Social Agent

Social content agent for Una Labs.

Current default: source-backed regional AI and technology news packages with visible-browser publishing proof.

It creates AI and technology news packages for:

- Instagram: three-slide 1080 x 1350 regional carousel package
- Instagram cover: bold editorial news cover with one large headline
- LinkedIn: separate professional caption with business and implementation context
- posting brief: one file with image path, copy/paste text, sources, and proof command
- story package: brief, source manifest, asset manifest, captions, slides, QA, and proof
- nine-post grid preview and contact sheet for feed planning
- browser publishing proof screenshots
- JSONL ledger entry with posted/failed status

The scheduled regional runner performs:

1. Discovers fresh source-backed technology stories.
2. Selects one story each for North America, Africa, and Rest of World.
3. Writes separate Instagram and LinkedIn copy in plain human language.
4. Renders a three-slide Instagram carousel.
5. Runs quality checks for source count, freshness, caption length, and visual records.
6. Publishes through the visible Chrome browser only after `publish-approved.json` exists.
7. Saves proof screenshots and writes `content/ledger/social-ledger.jsonl`.

Caption-only commands remain available for low-cost draft experiments, but they are not the normal Una Labs daily newsroom path.

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
4. Upload the three `regional-news-preview-YYYY-MM-DD-slide-*.png` files to Instagram through the real page.
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

## July 15 Posting Lessons

- Do not use `https://www.instagram.com/create/select/` as a direct navigation fallback. Instagram can treat `/create/` like a profile and open the wrong account/about modal.
- Start Instagram posting from `https://www.instagram.com/unalabs.cloud/`, close any modal with `Esc`, then click the real Create control.
- When the `Create new post` modal is visible, use a physical click on the blue `Select from computer` button before DOM/text fallbacks. This is what opened the Windows file picker reliably.
- Upload all three carousel slide PNGs, not the contact sheet and not only slide 1.
- Block posting if the caption is not visible before Share. The caption proof screenshot matters because Instagram can otherwise publish an image with no caption.
- LinkedIn page publishing was verified from the Una Labs Page posts view. Instagram verification is profile-grid proof after Share.
- Keep visual claims honest: if public image search returns irrelevant photos, use the deterministic story visual instead of a misleading stock photo.
- Deterministic fallback visuals are preview-only. They must not pass `quality:today` for live publishing because they look too generic for the Una Labs Instagram standard.
- A publishable Instagram image must either use a relevant editorial/photo asset or a reviewed generated visual that looks human, professional, story-aware, and not like a reusable dashboard template.

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
UnaLabsSocial-PeakDraft
```

Default run time:

```text
6:45 AM Eastern, weekdays
```

Register it:

```powershell
npm run schedule:register
```

Una Labs is the automated publishing sandbox. Scheduled runs create the regional
brief, render Instagram and LinkedIn visuals, run the source/caption/visual
quality gates, and publish automatically through the visible browser while API
credentials are not configured. Browser access is serialized and each result is
written to the proof ledger.

The sandbox policy permits an accepted deterministic fallback visual scoring 82
or higher to publish with a warning. Missing sources, placeholder text, rejected
visuals, low scores, missing captions, authentication failures, and missing post
proof still fail closed. This lets the sandbox learn from imperfect posts without
turning off the safety and truth checks.

The target background path is the API publisher:

```powershell
npm run publish:api:dry-run
```

The API path requires `META_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID`,
`UNA_PUBLIC_ASSET_BASE_URL`, `LINKEDIN_ACCESS_TOKEN`, and
`LINKEDIN_ORGANIZATION_ID`. Until those values and the required platform
permissions are configured, scheduled publishing continues through the visible
Una Labs sandbox browser and may temporarily take focus during its publish window.

Operational lessons from the July 15 live run:

- Instagram must upload the three carousel slide PNGs and must show the caption before Share.
- LinkedIn should use the `Photo` path from the Page posts composer when attaching the visual. Avoid raw source URLs in the LinkedIn body because LinkedIn can turn them into link previews and block photo attachment.
- LinkedIn copy should be fuller than Instagram: human, practical, and operator-focused, while still naming the sources.
- A public post counts as done only when the Page/profile proof screenshot shows the post after publishing.
- The scheduled runner loads `.env.local` into the process at runtime, but it must still spend sparingly. If acceptable photo/editorial visuals cannot be produced, the run should fail closed and write the reason to `logs/` instead of preparing a weak template for publication.
- Una Labs scheduled publishing may use the visible browser because this account is the automation sandbox. Do not copy this policy to a personal account until the proof ledger shows sustained reliability.
