# Una Labs Social News Handover - 2026-07-15

## Current Goal

Una Labs should publish one source-backed AI and technology news package each weekday morning at 6:45 AM Eastern.

The normal package is:

- Instagram: three-slide carousel, one story each for North America, Africa, and Rest of World.
- LinkedIn: one visual plus a fuller, human, operator-focused write-up.
- Proof: visible browser verification screenshots and a JSONL ledger entry.

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

## Quality Rules

- Do not publish if the story set is weak, stale, sponsored, generic, or not source-backed.
- Do not publish if visual generation falls back to deterministic template art.
- Do not publish if Instagram caption is not visible before Share.
- Do not count LinkedIn or Instagram as done until the post is visible after publishing.
- LinkedIn copy should be more detailed than Instagram and should sound like a practical human briefing, not a short caption.

Run the gate with:

```powershell
npm run quality:today
```

## Browser Lessons

- Start Instagram posting from `https://www.instagram.com/unalabs.cloud/`.
- Do not rely on direct `/create/select/` navigation. It can open the wrong modal.
- Use the real Create control, then the blue `Select from computer` button.
- Upload the three `regional-news-preview-YYYY-MM-DD-slide-*.png` files as a carousel.
- LinkedIn should use the Page post composer and the Photo route for the visual.
- Avoid raw source URLs inside the LinkedIn body when attaching a photo. Raw URLs can create link previews that interfere with image attachment.

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
