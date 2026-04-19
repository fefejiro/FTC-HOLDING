# UNA LABS LIGHT REBRAND — VSCODE CLAUDE PROMPT
## Phased Build Prompts for Claude Code / Claude in VS Code

**Project:** Una Labs Website Phase 1
**Stack:** Next.js 14 + React 18 + TypeScript + Tailwind CSS
**Reference:** See `2-DEVELOPER-HANDOVER.md` for all specs, tokens, and component details

---

## HOW TO USE THIS DOCUMENT

1. Start a new Claude Code session in the project root
2. Execute prompts in order — each is self-contained and recoverable
3. After Prompt 8 (homepage assembly), you have a working prototype — test it before continuing
4. Use the checklist at the end to track progress
5. If Claude drifts, say: *"Stay focused on [component name]. Use specs from the developer handover doc."*

**Token strategy:** Each prompt is scoped to 1–2 components. Ask for scaffolding first, then fill data. No placeholder text — use the real copy from this document.

---

## MASTER CONTEXT PROMPT
*(Send this first in every new session to establish context)*

```
You are building the Una Labs website Phase 1 (light theme rebrand).

CONTEXT:
- Company: Una Labs — a professional service delivery platform
- Positioning: "Deliver with confidence" — outcomes-first, professional, not technical
- CRITICAL: Never mention "ATEAM" in any customer-facing copy or component
- ATEAM is the internal operating engine — customers only see "Una Labs"

TECH STACK:
- Next.js 14 (App Router, not Pages Router)
- React 18
- TypeScript (all components must be typed)
- Tailwind CSS with custom config (see tailwind.config.ts in this session)
- No external UI libraries (no shadcn/ui, no MUI, no Radix)
- Minimal dependencies: only add npm packages when truly necessary

DESIGN TOKENS (Light Theme):
- Brand teal: #4DB8A8
- Brand orange-red: #FF3D00 (CTAs, accent words)
- Background: #FFFFFF (white), #F8FAFB (off-white), #F5F7FA (subtle)
- Text heading: #0B0E11
- Text body: #3D424B
- Text secondary: #6B7280
- Text muted: #9CA3AF
- Border: #E5E7EB

COPY RULES:
1. Outcomes before features ("see project progress" not "real-time analytics")
2. No "we" in headlines — use "you", "your", "deliver"
3. Numbers in proof ("48h response" not "fast response")
4. Friction killer on every CTA block ("No credit card required")
5. Zero ATEAM mentions in any rendered output
6. Avoid: "solution", "ecosystem", "leverage", "streamline"

RESPONSIVE: Mobile-first Tailwind. Test at 320px, 768px, 1440px.
ACCESSIBILITY: Semantic HTML, ARIA labels, visible focus states.

I will give you one focused task at a time. Stay on that task only.
```

---

## PROMPT 1: PROJECT SETUP & CONFIGURATION

```
TASK 1: Project setup and configuration

Generate these 4 files exactly as specified:

FILE 1: tailwind.config.ts
Custom colors (brand.teal: #4DB8A8, brand.orange: #FF3D00, brand.orange-hover: #E63500,
brand.teal-light: #E6F7F5, brand.orange-light: #FFF0EC), bg (white, offwhite, subtle, hover),
tx (heading: #0B0E11, body: #3D424B, secondary: #6B7280, muted: #9CA3AF).
Custom font families: sans (Inter), display (Plus Jakarta Sans).
Custom fontSize tokens: display (48px/1.15/700), h2 (32px/1.25/700), h3 (24px/1.3/600),
h4 (18px/1.4/600), body-lg (18px/1.7), body (16px/1.6), body-sm (14px/1.5),
caption (12px/1.4), eyebrow (12px/1.4/600/0.08em tracking).
Custom boxShadow: xs, sm, md, lg, xl (escalating opacity 0.04→0.12), plus teal and orange glow variants.
maxWidth: content (1180px), narrow (720px), tight (540px).

FILE 2: app/globals.css
CSS custom properties for all color tokens, shadows, radii, spacing (8px base unit).
Base reset: box-sizing border-box, body margin 0, html/body min-height 100%.
No theme-specific styles here — Tailwind handles those.

FILE 3: app/layout.tsx
Imports Inter and Plus_Jakarta_Sans from next/font/google.
Includes <html lang="en"> with both font class variables.
Renders <Header />, <main>{children}</main>, <Footer />.
Includes basic metadata (title template, description, OG defaults).
No "ATEAM" in any metadata.

FILE 4: lib/constants.ts
Export NAV (product dropdown with 6 items, solutions with 4, resources with 3, plus Pricing and How It Works links).
Export FEATURES array (8 items with id, icon emoji, label, benefit — see handover doc for exact copy).
Export PROOF_METRICS (3 items: 48h, 4.8, 100%).
Export TESTIMONIALS (1 item minimum with quote, author, title, company, rating).
Export INDUSTRIES (6 items with icon, title, description, href, slug).
Export PROBLEM_SOLUTIONS (3 items with eyebrow, headline, body, bullets array, ctaLabel, ctaHref).
Export PRICING_TIERS (4 items: Starter $49, Professional $99 recommended, Agency $249, Enterprise $499).
Export FOOTER_LINKS (4 columns: Product, Solutions, Resources, Company).

Output all 4 files. Use the exact copy from the developer handover. No placeholder lorem ipsum.
```

---

## PROMPT 2: BUTTON & BADGE UI COMPONENTS

```
TASK 2: Build reusable UI components

FILE 1: components/ui/Button.tsx
Props: variant (primary | secondary | ghost | dark), size (sm | md | lg), href (optional), external (optional).
Primary: bg-brand-orange text-white rounded-lg hover:bg-brand-orange-hover shadow-orange active:scale-[0.98].
Secondary: border-2 border-brand-teal text-brand-teal bg-transparent hover:bg-brand-teal-light.
Ghost: text-brand-teal hover:underline underline-offset-2.
Dark: bg-tx-heading text-white hover:bg-tx-body.
Sizes: sm (px-4 py-2 text-body-sm), md (px-6 py-3 text-body), lg (px-8 py-4 text-body-lg).
When href provided, renders as <a> tag with optional target="_blank".
All variants: focus-visible:ring-2 ring-brand-teal ring-offset-2.
No cva dependency — use simple conditional string concatenation.

FILE 2: components/ui/Badge.tsx
Eyebrow badge for section labels.
Variants: teal (bg-brand-teal-light text-brand-teal), orange (bg-brand-orange-light text-brand-orange), muted (bg-bg-subtle text-tx-muted).
Text always uppercase, tracking-widest, text-eyebrow size.

FILE 3: lib/utils.ts
Export a cn() function that merges class names (simple string join with filter — no clsx dependency required).
Export formatPrice(cents: number): string — formats to "$X" or "$X,XXX".

Output all 3 files. TypeScript types required on all props.
```

---

## PROMPT 3: HEADER COMPONENT

```
TASK 3: Build the Header component

File: components/layout/Header.tsx
Mark as "use client" (needs useState, useEffect, useScrollPosition).

Requirements:
- Sticky top-0 z-50 bg-white
- On scroll > 8px: show shadow-sm + border-b border-border
- Desktop (lg+): Logo | Nav dropdowns | CTA buttons — all in one row, max-w-content centered
- Mobile (<lg): Logo | Hamburger toggle — menu slides in from top as full-width panel

Logo: "Una Labs" text in font-display font-bold. Links to "/". No ATEAM.

Desktop nav items (from NAV.main in lib/constants.ts):
- Product (dropdown, 6 children with descriptions)
- Solutions (dropdown, 4 children with descriptions)
- Resources (dropdown, 3 children)
- Pricing (direct link)
- How It Works (direct link)

Dropdown behavior:
- Opens on click (not hover — mobile-safe)
- Closes when clicking outside (add document click listener)
- Only one dropdown open at a time
- Panel: absolute, top-full, left-0, w-64, bg-white, border border-border, rounded-lg, shadow-lg, p-2
- Each item: Link with label (font-medium) + optional description (text-body-sm text-tx-secondary)
- Close on navigation (useEffect on pathname from next/navigation)

Desktop CTAs (right side):
- "Login" text link (text-tx-secondary, no button)
- "Start Free Trial" — Button variant=primary size=sm

Mobile panel:
- Full-width, bg-white, border-t border-border
- Each dropdown group shown as heading + indented links (no nested dropdown UI)
- Bottom: "Start Free Trial" full-width primary button + Login text link
- Dismiss on navigation

Accessible: aria-expanded on toggle, role="dialog" on mobile panel, aria-label on nav.
No external animation libraries.
```

---

## PROMPT 4: HERO SECTION

```
TASK 4: Build the HeroSection component

File: components/sections/HeroSection.tsx

Props interface:
- eyebrow?: string
- headline: string
- accentPhrase?: string (substring of headline to color brand-orange)
- subheadline: string
- ctaPrimaryLabel: string
- ctaPrimaryHref: string
- ctaSecondaryLabel: string
- ctaSecondaryHref: string
- frictionNote?: string (default: "No credit card required. 14 days free.")
- trustLogos?: Array<{ src: string; alt: string; width: number }>

Layout (desktop lg+): 2-column grid, 50/50, gap-16, items-center.
Left column: text content. Right column: visual mockups + wave shape.

Left column content order:
1. Eyebrow badge (if provided) — teal variant
2. H1 headline — text-display text-tx-heading. If accentPhrase provided, wrap that substring in span with text-brand-orange.
3. Subheadline — mt-6 text-body-lg text-tx-secondary leading-relaxed
4. Trust logos row (if provided) — mt-6 flex gap-4 flex-wrap. Logos: grayscale opacity-60, hover:grayscale-0 hover:opacity-100
5. CTA block — mt-8 flex flex-wrap items-center gap-4. Primary button + ghost link with "→"
6. Friction note — mt-3 text-caption text-tx-muted

Right column:
- Relative positioned container
- Behind the cards: absolute div with bg-brand-teal opacity-10, large organic blob shape using border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%
- 3 stacked mockup placeholder cards (use divs — images added later):
  Card 1: "Intake Form" — bg-bg-subtle
  Card 2: "Proposal" — bg-brand-teal-light
  Card 3: "Delivery Report" — bg-brand-orange-light
  Each: rounded-xl p-6 shadow-md border border-border, with a pulse placeholder div inside + label
  Offset each card: translateX(0, 12px, 24px) to create depth stack

Mobile (<lg): single column, right column hidden (hidden lg:block), cards not shown.
Section padding: pt-16 pb-24 bg-white overflow-hidden.
```

---

## PROMPT 5: FEATURE CAROUSEL

```
TASK 5: Build the FeatureCarousel component

File: components/sections/FeatureCarousel.tsx
Mark as "use client".

Data: Import FEATURES from lib/constants.ts (8 items).

Layout:
- Section: bg-bg-offwhite py-20
- Heading block centered: eyebrow badge + H2 "From rough request to paid delivery — all of it."
- Card grid: grid grid-cols-2 md:grid-cols-4 gap-4, below heading, mb-8
- Dot nav: flex justify-center gap-2 mt-4

Card behavior:
- All 8 cards always visible (not a sliding carousel)
- One card is "active" (highlighted)
- Active: border-brand-teal bg-white shadow-teal shadow-md
- Inactive: border-border bg-white hover:border-border-hover hover:shadow-sm
- Click any card → becomes active, resets auto-rotate timer

Card content:
- Icon emoji: text-3xl block mb-3 (aria-hidden)
- Label: text-h4 text-tx-heading font-semibold mb-1
- Benefit: text-body-sm text-tx-secondary leading-snug

Auto-rotate:
- Advances active card every 4500ms
- useRef for interval so restart on manual click doesn't create memory leak
- Pauses on hover (mouseenter/mouseleave on card grid)
- useEffect cleanup returns clearInterval

Dot navigation:
- 8 dots for 8 features
- Active dot: bg-brand-teal w-6 (pill shape via w-6 transition)
- Inactive: bg-border w-2 hover:bg-border-hover
- role="tablist", each dot role="tab" aria-selected aria-label

No sliding animation — just border/background state change. Keep it fast and clean.
```

---

## PROMPT 6: SOCIAL PROOF SECTION

```
TASK 6: Build the SocialProofSection component

File: components/sections/SocialProofSection.tsx

Data: Import PROOF_METRICS and TESTIMONIALS from lib/constants.ts.

Layout:
- Section: bg-bg-subtle py-20
- Centered heading block: eyebrow badge + H2 "Results teams can show their clients"
- Metrics grid: grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12
- Testimonial: max-w-narrow mx-auto

Metric card (bg-white border border-border rounded-xl p-8 shadow-sm):
- Large number: text-5xl font-bold text-brand-orange leading-none
- Label: mt-3 text-h4 text-tx-heading
- Note: mt-1 text-body-sm text-tx-secondary

Testimonial (blockquote):
- bg-white border-l-4 border-brand-teal rounded-xl p-8 shadow-md
- Quote: text-body-lg text-tx-body italic leading-relaxed, wrapped in quotes
- Footer: mt-6 flex items-center gap-4
  - Avatar placeholder: w-10 h-10 rounded-full bg-bg-subtle flex-shrink-0
  - Author name: text-body font-semibold text-tx-heading
  - Title + company: text-body-sm text-tx-secondary

Accessible: blockquote element, footer inside it, no decorative images with missing alt.
```

---

## PROMPT 7: PROBLEM-SOLUTION SECTION (REUSABLE)

```
TASK 7: Build the ProblemSolutionSection reusable component

File: components/sections/ProblemSolutionSection.tsx

Props interface:
- eyebrow: string
- headline: string
- body: string
- bullets: string[]
- ctaLabel: string
- ctaHref: string
- imagePosition: 'left' | 'right'
- imagePlaceholderLabel?: string
- background?: 'white' | 'subtle'

Layout: grid lg:grid-cols-2 gap-16 items-center. Direction determined by imagePosition prop.
When imagePosition='left': render [imageCol, textCol]. When 'right': [textCol, imageCol].
On mobile (<lg): always single column, text first then image.
Do NOT use CSS direction:rtl trick — it causes accessibility issues. Use conditional JSX ordering.

Text column:
- Eyebrow badge (teal variant)
- H2: text-h2 text-tx-heading mb-4
- Body: text-body-lg text-tx-secondary leading-relaxed mb-6
- Bullets: ul without list-style. Each li: flex gap-3, checkmark "✓" in text-brand-teal font-bold mt-0.5 flex-shrink-0, then text-body text-tx-body
- CTA: Link with inline-flex items-center gap-2 text-brand-teal font-semibold hover:underline

Image column:
- Placeholder div: rounded-2xl overflow-hidden shadow-lg bg-bg-subtle
- aspect-[4/3] — lets it size naturally
- Centered label text in text-body-sm text-tx-muted
- Add comment: // Replace with <Image src={...} alt={...} fill className="object-cover" />

Section backgrounds: white or bg-bg-subtle based on background prop.
Section padding: py-20.
Max-width container: max-w-content mx-auto px-6.
```

---

## PROMPT 8: INDUSTRY GRID

```
TASK 8: Build the IndustryGrid component

File: components/sections/IndustryGrid.tsx

Data: Import INDUSTRIES from lib/constants.ts (6 items).

Layout:
- Section: bg-bg-offwhite py-20
- Centered heading: eyebrow badge + H2 "Una Labs works for your team" + body copy (max-w-narrow)
- Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12

Each card is a Link (href from industry.href):
- group class for group-hover utilities
- bg-white border border-border rounded-xl p-8
- hover:border-border-hover hover:shadow-md transition-all duration-200
- Icon: text-4xl block mb-4 aria-hidden
- Title: text-h4 text-tx-heading mb-2 group-hover:text-brand-teal transition-colors
- Description: text-body-sm text-tx-secondary leading-relaxed mb-4
- "Learn more →": text-body-sm font-semibold text-brand-teal

Accessible: cards are <a> tags via Link, no separate "Learn more" button needed (whole card is clickable).
```

---

## PROMPT 9: FINAL CTA + HOMEPAGE ASSEMBLY

```
TASK 9A: Build FinalCTASection

File: components/sections/FinalCTASection.tsx

Layout: bg-brand-teal-light py-24, text-center.
Content: eyebrow badge + H2 "Deliver with confidence, starting today" (text-display-sm max-w-tight mx-auto) + body copy (text-body-lg text-tx-secondary max-w-narrow mx-auto mb-10).
CTA row: flex flex-wrap justify-center gap-4.
- Primary: "Start Free Trial" → /start
- Secondary: "See How It Works" → /how-it-works
- Ghost: "View Pricing" → /pricing
Friction note: text-caption text-tx-muted mt-6 "No credit card required. No account needed to get a scope."


TASK 9B: Assemble the homepage

File: app/page.tsx

Import and compose in this order:
1. HeroSection (with full props from COPY section below)
2. FeatureCarousel
3. SocialProofSection
4. ProblemSolutionSection × 3 (map over PROBLEM_SOLUTIONS from lib/constants.ts)
   - Index 0: imagePosition='right', background='white'
   - Index 1: imagePosition='left', background='subtle'
   - Index 2: imagePosition='right', background='white'
5. IndustryGrid
6. FinalCTASection

HeroSection props:
  eyebrow="Una Labs"
  headline="Deliver project insights into business value"
  accentPhrase="business value"
  subheadline="Structured intake, scoped proposals, governed delivery, and measurable proof. Everything your team needs to deliver with confidence."
  ctaPrimaryLabel="Start Free Trial"
  ctaPrimaryHref="/start"
  ctaSecondaryLabel="Watch a Demo"
  ctaSecondaryHref="/demo"
  frictionNote="No credit card required. 14 days free."

Page metadata:
  title: "Una Labs — The Professional Service Platform"
  description: "Structured intake, clear proposals, governed delivery, and measurable proof. The platform built for teams who deliver with confidence."
  No ATEAM in any metadata.

Keep app/page.tsx clean — only imports and component composition.
```

---

## PROMPT 10: TESTIMONIALS CAROUSEL

```
TASK 10: Build TestimonialsCarousel component

File: components/sections/TestimonialsCarousel.tsx
Mark as "use client".

Data: Extend TESTIMONIALS in lib/constants.ts to 3–5 entries.
Each: { id, quote, author, title, company, rating: number (1-5) }

Layout:
- Section: bg-white py-20
- Centered heading: eyebrow + H2 "What teams are saying"
- Carousel container: relative, max-w-narrow mx-auto mt-12
- One card visible at a time, centered

Card (bg-white border border-border rounded-xl p-10 shadow-sm):
- Stars: render rating number of "★" in text-brand-orange
- Quote: text-body-lg italic text-tx-body leading-relaxed, in quotes
- Footer: mt-8 flex items-center gap-4
  - Avatar placeholder: w-12 h-12 rounded-full bg-bg-subtle
  - Author name + title + company

Navigation:
- Prev / Next buttons on sides of card (absolute positioned, top-50%)
- Circular buttons: w-10 h-10 rounded-full border border-border bg-white hover:border-border-hover shadow-sm
- Arrows: ← → as text
- Dot pagination below: same pattern as FeatureCarousel

Auto-rotate: every 6000ms, pauses on hover.
Transition: opacity fade (opacity-0 → opacity-100) over 200ms on card swap.
No slide animation — just fade.
```

---

## PROMPT 11: FOOTER COMPONENT

```
TASK 11: Build the Footer component

File: components/layout/Footer.tsx

Data: Import FOOTER_LINKS from lib/constants.ts (4 columns).

Layout:
- footer: bg-bg-subtle border-t border-border
- Inner: max-w-content mx-auto px-6 py-16
- Newsletter block: mb-12 pb-12 border-b border-border, max-w-md
- Link columns: grid grid-cols-2 md:grid-cols-4 gap-8 mb-12
- Bottom bar: flex justify-between items-center, pt-8 border-t border-border

Newsletter block:
- H3: "Stay in the loop"
- Body: "Product updates, delivery insights, and professional service tips."
- Form: flex gap-3 — email input + submit button
- Input: flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-border-focus text-body
- Button: px-5 py-2 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90
- onSubmit: e.preventDefault() (actual submission wired up later)

Link columns:
- Column heading: text-eyebrow uppercase text-tx-muted tracking-widest mb-4
- Links: text-body-sm text-tx-secondary hover:text-brand-teal transition-colors

Bottom bar:
- Left: "© {year} Una Labs. All rights reserved." — text-caption text-tx-muted
- Right: Privacy, Terms, Contact links — text-caption text-tx-muted hover:text-tx-secondary

No "ATEAM" anywhere in footer.
```

---

## PROMPT 12: PRICING PAGE

```
TASK 12: Build the /pricing page

File: app/pricing/page.tsx

Data: Import PRICING_TIERS from lib/constants.ts.

Add metadata:
  title: "Pricing — Una Labs"
  description: "Simple, transparent pricing for professional service teams. Start free, upgrade when you're ready."

Page structure:

SECTION 1 — Hero (small):
bg-white pt-16 pb-12.
Centered H1: "The perfect plan for your business" (text-display-sm).
Subheading: "Simple, transparent pricing. No hidden fees." (text-body-lg text-tx-secondary).
Monthly/Annual toggle: two buttons, active shows bg-brand-teal text-white, inactive shows border.
"Save 20%" badge on Annual button (small orange badge).
Track toggle state with useState('monthly').

SECTION 2 — Pricing cards:
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-content mx-auto px-6.
Each card: bg-white border rounded-xl p-8.
Recommended: border-brand-teal (2px) shadow-teal shadow-md.
Others: border-border shadow-sm.
"RECOMMENDED" badge on recommended tier: small pill, bg-brand-orange text-white text-caption font-bold uppercase, positioned absolute top-4 right-4.

Card content:
- Tier name: text-h3 text-tx-heading
- Price: text-5xl font-bold text-tx-heading + "/mo" text-body-sm text-tx-secondary
- Show monthly or annual price based on toggle (annual = monthly × 10 to simulate 2 months free)
- Description: text-body-sm text-tx-secondary mb-6
- Features: ul with ✓ checkmarks in text-brand-teal, text-body-sm text-tx-body
- CTA button: primary for recommended tier, secondary for others
  Enterprise: CTA goes to /contact

SECTION 3 — FAQ (5 questions):
Simple accordion — click question to expand/collapse answer.
Questions:
1. "Is there a free trial?" — Yes, 14 days, no credit card required.
2. "Can I change plans later?" — Yes, upgrade or downgrade anytime.
3. "What payment methods do you accept?" — All major credit cards via Stripe.
4. "Is my data secure?" — Yes, encrypted at rest and in transit.
5. "What counts as a 'project'?" — Any active engagement with a client.

SECTION 4 — Final CTA: Import and render FinalCTASection.
```

---

## PROMPT 13: HOW IT WORKS PAGE

```
TASK 13: Build the /how-it-works page

File: app/how-it-works/page.tsx

Add metadata:
  title: "How It Works — Una Labs"
  description: "See how Una Labs turns rough requests into governed delivery. From intake through proposal to proof."

SECTION 1 — Hero:
bg-white pt-16 pb-8.
H1: "See how Una Labs works" (text-display text-tx-heading).
Subheading: "From a rough request to documented delivery — every step governed, every output professional."
Tab strip (useState): All | Professional Services | Agencies | SaaS Teams | Accounting
Active tab: border-b-2 border-brand-teal text-brand-teal font-semibold.
(Tabs are decorative at this stage — all show the same content. Wire up real content later.)

SECTION 2 — 4-Step Flow:
bg-bg-subtle py-16.
Heading: "How a request becomes delivery" (centered H2).
4 steps in a horizontal flow on desktop, vertical on mobile:
Step 1: Request → "Describe what you need. Rough is fine."
Step 2: Scope → "ATEAM structures it into a brief, lane, and direction." (Note: change "ATEAM" to "Una Labs" here — zero internal references)
  IMPORTANT: Change to "Una Labs structures your input into a scoped brief."
Step 3: Proposal → "One clear offer. Pay a deposit to confirm."
Step 4: Delivery → "Governed execution, approval gates, handoff-ready output."

Each step: circle number + label + description. Connected by a horizontal line on desktop (border-t border-border between steps).

SECTION 3 — Feature cards (3×3 grid):
grid grid-cols-1 md:grid-cols-3 gap-6 max-w-content mx-auto px-6 py-16.
9 cards showing key features (use FEATURES from lib/constants.ts + add 1 extra card for "Integrations").
Each card: bg-white border border-border rounded-xl p-8 shadow-sm.
- Icon: text-4xl mb-4
- Title: text-h4 text-tx-heading mb-2
- Description: text-body-sm text-tx-secondary leading-relaxed
- Link: "Learn more →" text-brand-teal text-body-sm font-semibold

SECTION 4 — FAQ (5 skeptic questions):
Q: "Do I need to know what I want before submitting?"
A: No. That's the point. Describe the problem or goal — we do the structuring.
Q: "How fast do I get a response?"
A: 48 hours or less for an initial scoped brief.
Q: "What if I don't like the proposal?"
A: You don't pay. We only collect a deposit after you agree on scope.
Q: "Is this just a freelancer marketplace?"
A: No. It's a governed delivery system. Every engagement has defined scope, approval gates, and documented output.
Q: "What kinds of work do you handle?"
A: Digital, SEO, AI systems, automation, web, and workflow tooling.

SECTION 5 — Final CTA.
```

---

## PROMPT 14: PRODUCT LANDING PAGE TEMPLATE

```
TASK 14: Build reusable product page template + 2 instances

FILE 1: components/templates/ProductPage.tsx

Props interface:
- featureTitle: string
- eyebrow: string
- headline: string
- accentPhrase?: string
- subheadline: string
- problemStatement: string
- solutionBody: string
- keyFeatures: Array<{ icon: string; title: string; description: string }>
- testimonialQuote: string
- testimonialAuthor: string
- testimonialTitle: string
- testimonialCompany: string
- ctaPrimaryLabel: string
- ctaPrimaryHref: string

Page structure:
1. Hero: Same as HeroSection but simpler (no trust logos, no right column visual — just centered text + CTA)
2. Problem + Solution: bg-bg-subtle py-16, max-w-narrow mx-auto, centered text
3. Key features: grid grid-cols-1 md:grid-cols-3 gap-6, 3 columns of feature cards (icon + title + description)
4. Testimonial: blockquote, same style as SocialProofSection
5. FinalCTASection

FILE 2: app/product/intake-scoping/page.tsx
Use ProductPage template with:
  featureTitle: "Intake & Scoping"
  eyebrow: "Start right"
  headline: "Turn rough requests into structured scope"
  accentPhrase: "structured scope"
  subheadline: "No polished brief required. Describe the problem or goal — Una Labs structures it into a scoped brief, recommended direction, and clear proposal within 48 hours."
  problemStatement: "Most agencies need a polished brief before work can start. Most clients don't have one. That gap costs time, money, and relationships."
  solutionBody: "Una Labs intake handles the structure for you. Submit rough input. Get a brief back. Agree on scope. Move forward."
  keyFeatures:
    1. icon: "📋", title: "Smart intake forms", description: "Customizable forms that capture context without overwhelming."
    2. icon: "⚡", title: "48h turnaround", description: "Structured brief in your inbox within two business days."
    3. icon: "✅", title: "Scope before spend", description: "You see the scope and agree before any deposit is collected."
  testimonialQuote: "I submitted a half-formed idea and got back a real scoped brief with options. First time I've ever felt like the intake process added value."
  testimonialAuthor: "James Park"
  testimonialTitle: "Operations Manager"
  testimonialCompany: "Fortis Consulting"
  ctaPrimaryLabel: "Start with your request"
  ctaPrimaryHref: "/start"

FILE 3: app/product/dashboard/page.tsx
Use ProductPage template with:
  featureTitle: "Real-Time Dashboard"
  eyebrow: "Stay informed"
  headline: "See every project at a glance"
  accentPhrase: "at a glance"
  subheadline: "One dashboard. Every project. Real-time status, progress tracking, and risk signals — for your team and your clients."
  (fill remaining props with contextually appropriate copy about visibility, no hidden status, client confidence)
```

---

## PROMPT 15: QA & PERFORMANCE SWEEP

```
TASK 15: QA sweep before final build check

Perform these checks and fix any issues found:

1. ATEAM AUDIT
   Search every .tsx and .ts file for the string "ATEAM" (case-insensitive).
   Report any customer-facing occurrences. Fix by replacing with "Una Labs" or removing.

2. ACCESSIBILITY AUDIT
   - Every <img> and <Image> has alt text (or alt="" with aria-hidden="true" for decorative)
   - Every form input has a visible <label> (not just placeholder)
   - All interactive elements have visible :focus-visible styles
   - Nav has aria-label="Main navigation"
   - Mobile menu has role="dialog" and aria-modal="true"
   - Carousel dots have role="tablist" / role="tab"

3. RESPONSIVE SPOT CHECK
   Describe the layout at:
   - 320px: all single-column, no horizontal scroll
   - 768px: 2-column grids where specified
   - 1440px: max-w-content kicks in, side margins visible

4. CTA AUDIT
   Every section with a primary CTA must have friction-killer text nearby:
   "No credit card required" OR "No account needed" OR "14 days free"
   Report any CTA blocks missing this.

5. METADATA AUDIT
   Every page.tsx must have:
   - title (no "ATEAM")
   - description (no "ATEAM")
   Report any missing.

6. LINK AUDIT
   Check all Link href values resolve to valid routes in the app structure.
   Report any broken or placeholder (#) links.

Output: A checklist of issues found + fixes applied.
```

---

## EXECUTION CHECKLIST

| # | Prompt | Component | Status |
|---|--------|-----------|--------|
| 1 | Setup | tailwind.config, globals.css, layout.tsx, constants.ts | [ ] |
| 2 | UI | Button.tsx, Badge.tsx, utils.ts | [ ] |
| 3 | Layout | Header.tsx | [ ] |
| 4 | Section | HeroSection.tsx | [ ] |
| 5 | Section | FeatureCarousel.tsx | [ ] |
| 6 | Section | SocialProofSection.tsx | [ ] |
| 7 | Section | ProblemSolutionSection.tsx | [ ] |
| 8 | Section | IndustryGrid.tsx | [ ] |
| 9 | Section + Page | FinalCTASection.tsx + app/page.tsx | [ ] |
| 10 | Section | TestimonialsCarousel.tsx | [ ] |
| 11 | Layout | Footer.tsx | [ ] |
| 12 | Page | app/pricing/page.tsx | [ ] |
| 13 | Page | app/how-it-works/page.tsx | [ ] |
| 14 | Template + Pages | ProductPage.tsx + 2 product pages | [ ] |
| 15 | QA | Full audit sweep | [ ] |

**Prototype checkpoint:** After Prompt 9, run `npm run dev` and verify the homepage renders correctly at all 3 breakpoints before continuing.

**Final check before deploy:**
- [ ] `npm run build` passes with zero errors
- [ ] Zero ATEAM mentions in any rendered output
- [ ] All CTAs functional
- [ ] Lighthouse ≥ 90 on homepage
- [ ] Mobile nav works at 320px

---

*Version 1.0 | April 2026 | Una Labs Light Rebrand | Phase 1 VSCode Build Prompts*
