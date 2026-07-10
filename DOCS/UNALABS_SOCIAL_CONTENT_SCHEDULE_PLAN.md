# Una Labs Social Content Schedule Plan

Generated: 2026-07-09

## Objective

Build a consistent Una Labs social-media operating rhythm using tools already present in the FTC workspace.

The current target is a reliable daily caption-pack system that produces:

- one short Instagram caption
- one LinkedIn company-page post with a simple source-to-impact text map
- source links and quality notes
- a dated caption pack
- a clear proof record of what was drafted

Paused for now:

- image generation
- carousel generation
- automatic Instagram publishing
- automatic LinkedIn publishing
- paid OpenAI/image API usage

The previous full generate-post-verify-record system can still be resumed later. For now, the system must protect budget and write better human-readable news captions.

Older full-posting goal:

- one Instagram-ready AI/tech/news visual
- one short Instagram caption
- one longer LinkedIn company-page discussion post
- source links and quality notes
- a browser publish attempt through the logged-in Una social profile
- proof screenshots
- a proof record of what was drafted, posted, verified, skipped, or failed

Official API publishing and browser automation can still be added later, but the immediate workflow is caption-only.

## Current Channel Evidence

Screenshots show:

- LinkedIn company admin access for Una Labs.
- Instagram account access for `unalabs.cloud`.

This means the immediate browser posting route is available today. API posting still needs separate token/app setup and is not required for the first live proof.

Paused browser route:

```text
Chrome profile: Fejiro / Profile 5
Control port: 9222
LinkedIn admin start URL: https://www.linkedin.com/company/112328320/admin/dashboard/
Instagram account: unalabs.cloud
```

The scheduled caption runner does not need Chrome. Browser posting is intentionally paused until there is an approved asset and posting decision.

## Reuse Existing FTC Tools

Do not invent a brand-new platform first. Reuse the patterns already working in the workspace:

| Existing asset | Reuse for social system |
| --- | --- |
| Job Reply Agent Windows scheduler scripts | Register recurring laptop tasks such as `UnaLabsSocial-DailyDraft`. |
| Job Reply Agent proof semantics | Keep `drafted`, `needs_review`, `posted_verified`, `posted_unverified`, `blocked`, `skipped` separate. |
| CapSigma Growth Desk scheduled-send model | Reuse scheduled windows, due-item processing, safety checks, and activity ledger ideas. |
| CapSigma OpenAI web-research pattern | Use source-backed web research with compact JSON output for topic discovery and summary. |
| Una Labs site and docs | Use existing brand, product, and proof language. |
| Existing visible Chrome pattern | Use a dedicated logged-in browser profile for posting, proof screenshots, and validation. |

## Editorial Positioning

Instagram is the public pulse:

- short
- visual
- timely
- simple wording
- AI and tech news, explained without sounding like a news robot

LinkedIn is the thinking layer:

- longer
- more reflective
- connects the news to builders, small teams, operators, and Una Labs work
- explains why the story matters
- invites discussion without sounding salesy

## Daily Content Shape

One daily topic becomes two channel outputs.

### Instagram Output

Format:

- caption: 45 to 120 words
- plain human language
- no fake urgency
- no generated image requirement
- source included
- 3 to 6 hashtags

Example structure:

```text
Headline: AI agents are moving from demos to daily operations.

Caption:
The interesting shift is not that AI can answer questions. It is that teams are starting to wire AI into recurring work: intake, research, follow-up, QA, reporting, and scheduling. The winners will not be the loudest tools. They will be the systems people can trust every day.

#AI #Automation #TechNews #UnaLabs
```

### LinkedIn Output

Format:

- 180 to 350 words
- source-backed summary
- one point of view
- one practical implication
- simple text map showing source -> change -> impact
- soft discussion question at the end
- link to source or source list

Example structure:

```text
AI news is moving fast, but the operational question is still simple:

Can this help a real team do recurring work with less confusion?

Today's story points to a broader pattern. AI is leaving the novelty stage and moving into workflows: triage, customer support, research, reporting, content operations, and internal decision support.

For small teams, that matters because the bottleneck is usually not ideas. It is consistency. The companies that benefit most will be the ones that turn AI into dependable routines with review points, source trails, and clear ownership.

That is the part we care about at Una Labs: not just impressive demos, but useful systems that can be trusted on Monday morning.

What workflow would you automate first if reliability was already solved?
```

## Source Quality Rules

Every daily topic needs source proof.

Minimum:

- one primary source when possible
- otherwise two credible secondary sources
- source URLs saved in the ledger
- no health, legal, financial, or political claims unless source quality is strong and wording is careful
- no fake quotes
- no fake statistics
- no source-less trending claims

Preferred source mix:

- official company/product blogs
- official research labs
- reputable tech journalism
- standards bodies or regulatory publications when relevant
- developer docs for platform changes

Avoid:

- random repost accounts
- copied screenshots with no original source
- engagement bait
- claims that cannot be verified the same day

## Proposed Schedule

Start light and consistent. The cadence is now once per weekday at peak Eastern time.

| Time | Task | Owner |
| --- | --- | --- |
| 12:30 PM ET | Create one source-backed caption pack for Instagram and LinkedIn | Scheduled caption agent |

Recommended cadence:

- Monday to Friday: one daily AI/tech/news post package.
- Saturday: optional manual weekly recap.
- Sunday: no post unless there is a major product/news moment.

## First Implementation Path

### Phase 1: Browser Publish Factory

Create a new local workspace:

```text
C:\FTC HOLDING\APPS\una-social-agent
```

Current core commands:

```text
npm run caption:write
npm run schedule:register
```

Output folders:

```text
APPS/una-social-agent/content/captions/YYYY-MM-DD/caption-pack.md
APPS/una-social-agent/content/captions/YYYY-MM-DD/caption-pack.json
```

Daily draft package:

```text
topic.json
sources.json
instagram-caption.md
linkedin-post.md
image-prompt.md
review-checklist.md
posting-brief.md
instagram-card.svg
instagram-card.png
```

Status values:

```text
drafted
needs_review
approved
posted_verified
posted_unverified
skipped
blocked
failed
```

Browser auto-posting is paused in the caption-only phase.

The daily scheduled runner should fail visibly if the package is incomplete or low quality:

```text
npm run draft:today
npm run quality:today
npm run publish:browser
```

The quality check validates source URLs, source freshness, configured Instagram and LinkedIn word-count ranges, required package files, the posting brief, and the PNG upload asset.

The browser publisher records proof automatically. If a manual post ever happens outside the browser runner, record proof URLs with:

```text
npm run post:record -- --instagram-url "https://..." --linkedin-url "https://..."
```

### Phase 2: Visual Asset Generation

Generate the image as an original graphic, not a screenshot of a news article.

Options:

1. Use OpenAI image generation if an API key is available.
2. Use a local template renderer for branded text cards.
3. Use Codex image generation interactively for the first few posts while the template style is being defined.

Current first slice:

- `instagram-card.svg` is the editable design source.
- `instagram-card.png` is the normal Instagram upload asset.
- `image-prompt.md` is still saved for a future richer AI-generated visual, but the scheduled loop does not depend on image API access.

Recommended first style:

- Una Labs teal/orange accent
- clean editorial square card
- headline plus abstract AI/tech visual
- small footer: `Una Labs | AI + workflow systems`

### Phase 3: Browser Posting

Use a dedicated Chrome profile for scheduled posting:

- open Instagram
- upload the generated PNG
- paste the generated caption
- publish and verify against the profile/posts surface
- open LinkedIn company admin
- paste the longer generated post
- publish and verify against the company posts surface
- capture proof screenshots
- append a ledger entry

This proves the full workflow before investing in API approval and token management.

### Phase 4: Official API Publishing

Only after the draft factory produces useful posts for at least one week:

LinkedIn:

- create or configure a LinkedIn developer app
- obtain organization posting permissions
- use the LinkedIn Posts API for organization posts
- store the organization URN and access token securely
- record returned post ID as proof

Instagram:

- confirm `unalabs.cloud` is an Instagram professional account
- connect it to a Facebook Page / Meta Business asset
- configure a Meta developer app
- use Instagram Content Publishing API
- store media container ID and publish ID as proof

## Human Inputs Needed From Mike

Minimum needed now:

1. Confirm daily posting window:
   - recommended: 9:00 AM Eastern, Monday to Friday.

2. Confirm tone:
   - recommended: curious, practical, builder/operator voice.

3. Confirm content boundaries:
   - recommended: AI, automation, tech business, developer tools, product operations, and real-world workflow systems.

4. Confirm whether we can create a new app folder:
   - recommended: `APPS/una-social-agent`.

5. Confirm first-week posting mode:
   - current: browser publish with proof and ledger recording.

Needed later for API posting:

1. Meta developer / Business Suite access.
2. Instagram account type confirmation.
3. Facebook Page connected to `unalabs.cloud`.
4. LinkedIn developer app access.
5. LinkedIn organization URN and posting permission.
6. Decision on whether final publish should be fully automatic or approval-gated.

## Definition Of Done For First Slice

The first slice is done when:

- `npm run draft:today` creates one complete Una Labs social draft package.
- The package includes source links, Instagram caption, LinkedIn post, image prompt, and review checklist.
- The package includes `posting-brief.md` as the one-file manual publishing handoff.
- The package includes a platform-friendly `instagram-card.png` upload asset.
- The output is saved under a dated folder.
- A ledger entry records the topic, sources, status, and output paths.
- A Windows scheduled task can run the draft, quality check, browser publish, proof capture, and ledger update daily.
- A same-day duplicate guard prevents accidental reposts unless `--force` is used.

## Recommended Next Step

Build Phase 1:

```text
APPS/una-social-agent
```

Keep it local and browser-driven first. Once the workflow is proven, harden it with official API publishing if browser automation becomes too brittle.
