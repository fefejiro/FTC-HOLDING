# Una Labs LinkedIn Page Edit Log - 2026-07-16

## Status

Partially completed and proof-backed.

The Una Labs LinkedIn page foundation was improved through the visible Chrome session.

## Completed Live Edits

### Tagline

Old:

```text
Fast websites, lead automation, and practical AI systems
```

New:

```text
AI workflow systems, automation, and source-backed tech briefings for small teams.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-tagline-saved.png
content/proof/2026-07-16/linkedin-page/linkedin-page-member_view.png
```

### Overview

Old opening:

```text
Una Labs builds practical AI systems, fast-launch websites, and workflow automation tools for businesses that need execution, not endless complexity.
```

New:

```text
Una Labs helps small teams understand and use AI in practical work.

We focus on the places where work actually gets stuck: repeated admin tasks, messy handoffs, reporting, customer workflows, forms, spreadsheets, CRM steps, approvals, and tools that do not talk to each other.

Our work is simple: map the workflow, find the friction, test where AI or automation can help, and keep proof before trusting the output.

We also publish plain-language AI and technology briefings for operators, founders, builders, and small teams who want useful signal without hype.

Based in Canada. Building practical AI systems with a strong focus on workflow, reliability, and real business use.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-about-saved.png
content/proof/2026-07-16/linkedin-page/linkedin-page-member_view.png
```

### Specialties

Added:

```text
AI Workflow Automation
Business Process Automation
AI Readiness
CRM Workflow Support
Business Systems
Operational AI
AI Tool Evaluation
Technology Briefings
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-specialties-saved.png
```

## Verified Public Member View

The member view proof shows:

```text
Una Labs
AI workflow systems, automation, and source-backed tech briefings for small teams.
IT Services and IT Consulting
Toronto, Ontario
4 followers
2-10 employees
```

It also shows the updated Overview opening:

```text
Una Labs helps small teams understand and use AI in practical work.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-member_view.png
content/proof/2026-07-16/linkedin-page/linkedin-page-member_view.txt
```

## Helper Added

New proof helper:

```text
scripts/linkedin-page-proof.py
```

Package command:

```powershell
npm run linkedin:page-proof
```

Purpose:

```text
Capture LinkedIn page admin/member-view proof through visible Chrome.
```

Important lesson:

```text
Do not navigate directly to the public company URL for member proof from the admin account. LinkedIn redirects the admin profile back to admin mode. Use the visible "View as member" control.
```

## Still Pending

### Buttons

Checked the `Buttons` tab.

Current state:

```text
Message button is available on the page.
Custom URL button appears tied to LinkedIn Premium.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-buttons-tab.png
```

Recommendation:

```text
Do not start LinkedIn Premium just to add a custom button. Keep using the visible Message button and the public website link for now.
```

### Services Page

The initial screenshot showed LinkedIn prompting:

```text
Add services to your company page
```

However, after interacting with the dashboard, that card disappeared and the proof helper could no longer click `Add services`.

A later dashboard proof showed:

```text
Done for now
Check back for more actions later
```

Clicking `Enhance your Page` did not expose service setup. It opened a LinkedIn Premium upsell:

```text
Stand out with enhanced credibility
Highlight a client testimonial on your Page
Add a dynamic cover image slideshow
```

Current state:

```text
Services setup not verified complete.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-dashboard.png
content/proof/2026-07-16/linkedin-page/linkedin-page-dashboard.txt
content/proof/2026-07-16/linkedin-page/linkedin-page-enhance-click.png
```

Next attempt:

1. Reopen the LinkedIn page dashboard.
2. Look for `Enhance your Page`, `Add services`, or another services setup entry point.
3. If the services entry point appears, use `docs/LINKEDIN_PAGE_COPY_PACKET_2026-07-16.md`.
4. Save proof as:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-services-saved.png
```

### Banner

Generated a clean Una Labs LinkedIn banner candidate.

Asset:

```text
content/assets/linkedin-page/unalabs-linkedin-banner-2026-07-16.png
```

Regenerate with:

```powershell
npm run linkedin:banner
```

Design direction:

```text
Una Labs
AI workflow systems + source-backed tech briefings
Practical automation. Clear signals. Proof before trust.
```

Upload attempt:

```text
Blocked. LinkedIn opened the cover-image menu, but clicking `Edit cover image` did not open a usable Windows file picker in this visible session.
```

Proof:

```text
content/proof/2026-07-16/linkedin-page/linkedin-page-banner-upload-attempt.png
content/proof/2026-07-16/linkedin-page/linkedin-page-banner-menu-after-click.png
```

Current state:

```text
Banner generated, not uploaded.
```

## Current Recommendation

Do not boost yet.

The page is now stronger, but the next improvement should be:

1. Services setup.
2. Banner upload if LinkedIn exposes a reliable file picker.
3. Continue daily 6:45 AM AI/tech posting.
4. Review analytics after two weeks of consistent posts.
