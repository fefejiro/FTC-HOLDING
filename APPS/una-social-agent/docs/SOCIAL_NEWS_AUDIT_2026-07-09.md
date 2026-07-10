# Una Labs Social News Audit - 2026-07-09

## Current State

- The existing agent can discover a story, generate a caption, render one square image, open the visible browser, and post to Instagram or LinkedIn.
- The prior visual output was too close to an internal dashboard card: small figures, too much explanatory copy on the cover, no 4:5 carousel, and no strong editorial hero image.
- Verification was partially honest but incomplete: the workflow could capture visible proof, but public post URL extraction was not reliable.

## Tool Audit

- OpenAI API access: missing in environment.
- Built-in image-generation capability: available through Codex, but not wired into repo automation.
- Playwright: available.
- Chromium or Chrome fallback: available through Playwright/Chrome.
- Sharp: available.
- Canvas: available.
- Python: available.
- Instagram authenticated browser session: available in visible Chrome during the last run.
- LinkedIn authenticated browser session: available in visible Chrome during the last run.
- Scheduling infrastructure: present.
- Content database or file store: file-based content tree exists.

## Main Gaps

- No structured story package.
- No reusable carousel template.
- No 1080 x 1350 output.
- No nine-post grid preview.
- No source and asset manifests per story.
- No rendered-image QA for slide dimensions and thumbnail readability.
- No clear separation between artwork, headline typography, caption, source proof, and publishing proof.

## First-Pass Fix

This pass adds a local publication renderer that creates:

- visual tokens
- structured story directories
- five-slide Instagram carousel
- Instagram and LinkedIn captions
- source and asset manifests
- QA report
- 3 x 3 grid preview
- contact sheet
- before-and-after comparison preview

The first implementation uses local editorial illustrations rather than downloaded public-figure photos. That keeps rights clean while the asset rights module is expanded.
