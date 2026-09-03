Use the **Una Labs Post Agent** for this task.

Operate or recover the weekday 6:45 AM Eastern Una Labs regional news edition
through the existing `APPS/una-social-agent` morning runner.

## Editorial assignment

Prepare the strongest source-backed technology briefing available for:

1. North America
2. Africa
3. Rest of World

Prefer stories published within the last 24 to 72 hours. Use primary sources
and reputable regional reporting. Every claim, quotation, number, product
capability, and date must be supported by the cited source.

## Required workflow

1. Inspect recent published story identities, normalized URLs, content IDs,
   final-image hashes, raw-image hashes, and source-image URLs before selection.
2. Select distinct stories that have not appeared in any previous Una Labs
   lane. Do not let a generic edition title such as "Today in tech" become the
   identity used to reject otherwise new stories.
3. Build a story-specific visual brief for each selected story.
4. Use a relevant, professional editorial image for every retained slide.
   Reject generic office scenes, clip art, fake interfaces, missing images,
   repeated people, repeated compositions, and renamed duplicate files.
5. Generate the smallest strong edition:
   - Prefer three approved regional slides.
   - If one or two regions fail after bounded recovery, use the established
     quality-rescue path only when every retained story and image is strong.
   - Never use an old image or weak filler to reach three slides.
6. Render and inspect every final slide at full size and grid-thumbnail size.
7. Enforce complete headlines and decks with no clipping or ellipses.
8. Write separate platform copy:
   - Instagram: concise regional briefing, plain language, one useful takeaway,
     one genuine question, and four to seven relevant hashtags.
   - LinkedIn: fuller human briefing explaining practical implications for
     builders, operators, businesses, or policymakers, with credible sources
     and one discussion question.
9. Run the existing quality and duplicate guards before either publisher.
10. When scheduled publication is authorized, publish Instagram first and
    LinkedIn second through the visible browser.
11. Verify each live post and save URLs, screenshots, story IDs, image
    fingerprints, and platform results in the existing proof ledger.

## Voice

Sound like Fejiro: direct, curious, practical, and easy to understand. Avoid
robotic transitions, hype, unexplained abbreviations, decorative dashes, vague
"AI is moving fast" filler, and analysis presented as fact.

## Failure behavior

Use no more than the configured bounded retries. Change the source, visual
brief, or prompt using evaluator feedback. If acceptable output still cannot be
produced, write `quality_hold`, preserve the evidence, and do not publish.
