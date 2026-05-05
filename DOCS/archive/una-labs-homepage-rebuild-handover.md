# Una Labs — Homepage & Core Pages Rebuild
## Developer Handover Document

**Project:** Una Labs site upgrade based on Ignition App audit
**Base repo:** `c:\FTC HOLDING\APPS\ftc-site`
**Framework:** Next.js 14 App Router, dark CSS design system, TypeScript
**Primary entry:** `app/components/HomePageExperience.tsx` → rendered by `app/page.tsx`
**Design reference:** Ignition App (pattern study only — no copy, no assets)
**Owner:** Mike Fejiro / Una Labs

---

## Context for the Developer

This is not a redesign from scratch. The site already has:

- A working dark design system in `styles/globals.css` (CSS variables, card system, container/section layout)
- A functional Header (`app/components/Header.tsx`) with dropdown nav already wired for Products
- A `HomePageExperience.tsx` with 7 sections already in production
- Real data in `lib/content.ts`, `lib/recentWork.ts`, `lib/engagementOffers.ts`
- Scroll reveal and animation components (`ScrollReveal.tsx`)

**What this sprint changes:**
The current homepage is clear and functional but does not communicate premium. It reads like an internal brief, not a business that clients want to hire. The audit of Ignition identified 10 specific patterns to borrow in principle — outcome-first headlines, feature carousels, quantified proof, low-friction entry, and asymmetric layout.

This document gives you exact file paths, component specs, copy direction, and a phased build order.

---

## Design System Reference (Do Not Change These)

All changes must stay within the existing CSS variable system. No new color palette.

```css
/* From styles/globals.css — existing tokens */
--bg: #0b0b0f;
--surface: #151823;
--surface-2: #1a1f2d;
--glass: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.15);
--text: #ffffff;
--muted: #b8b8c0;
--accent: #6c5ce7;      /* Purple — primary accent */
--accent-2: #00d4ff;    /* Cyan — secondary accent */
--radius: 16px;
--shadow-soft: 0 16px 40px rgba(0, 0, 0, 0.32);
```

**Typography:** Space Grotesk (headings) + Inter (body) — already loaded via `next/font`

**New tokens to add** (append to `:root` block in `globals.css`):
```css
--cta-bg: #6c5ce7;          /* Primary CTA button */
--cta-hover: #5a4dd6;       /* CTA on hover */
--accent-warm: #e07b39;     /* Warm orange — for headline accents only */
--surface-glow: rgba(108, 92, 231, 0.08);  /* Card hover glow */
```

---

## Phase 1 — Hero Upgrade + Feature Carousel (Week 1–2)

### Goal
Make the first 600px of the homepage communicate what Una Labs is, who it's for, and why it's worth trusting — without any copy from the user.

### Files to Edit

#### 1. `app/components/HomePageExperience.tsx`

**Section 1 — Hero:** Replace the current hero copy block.

Current H1:
```
Rough need in. Scoped digital and AI solutions out.
```

New H1 pattern — two-line split with accent word:
```
Rough request in.
Scoped delivery out.
```

- Line 1: `--text` color (white)
- Line 2: accent word "delivery" uses `--accent-2` (#00d4ff) or `--accent-warm` (#e07b39) — test both, pick the one that reads strongest on dark background
- H1 font size: `clamp(2.8rem, 7vw, 5rem)`
- Line height: 1.1
- Keep eyebrow label: `Una Labs · Digital and AI workflow systems`

**New subheadline** (replace current `<p className="lead">`):
```
Structured intake, scoped proposals, governed delivery.
Across digital, SEO, AI, and automation.
No fluff. No retainers. Outcomes with proof.
```

Each line is a separate `<span>` inside the `<p>` with `display: block` — creates breathing rhythm.

**Hero right column — replace the flow steps list:**

Currently shows a numbered list. Replace with **product mockup cards** (3 cards stacked at slight offset):

```tsx
// New component: app/components/HeroMockupStack.tsx
// Three 240px-wide cards showing:
// Card 1: "Intake" — icon + form fields (mocked)
// Card 2: "Proposal" — icon + pricing breakdown (mocked)
// Card 3: "Delivery proof" — icon + checkmarks + timestamp
```

Cards use `--surface` background, `--glass-border` border, `--radius` border-radius, stacked with `translateY` offset to create depth:
```css
.hero-mockup-stack { position: relative; width: 280px; }
.hero-mockup-card:nth-child(1) { transform: translateY(0); z-index: 3; }
.hero-mockup-card:nth-child(2) { transform: translateY(16px) translateX(12px); z-index: 2; opacity: 0.85; }
.hero-mockup-card:nth-child(3) { transform: translateY(32px) translateX(24px); z-index: 1; opacity: 0.65; }
```

**Organic wave shape behind mockup stack:**

Add a pseudo-element `::after` on the right column container:
```css
.premium-hero-right::after {
  content: '';
  position: absolute;
  right: -60px;
  top: -40px;
  width: 420px;
  height: 520px;
  background: radial-gradient(ellipse at 60% 40%, rgba(108, 92, 231, 0.18) 0%, transparent 70%);
  border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
  z-index: 0;
  pointer-events: none;
}
```

**CTA block** — add friction-killer text below the existing CTA row:
```tsx
<div className="hero-cta-row">
  <Link href="/work-with-ftc" className="btn btn-primary">Start with your request</Link>
  <Link href="/work" className="btn btn-secondary">See delivery proof</Link>
</div>
<p className="hero-friction-note">No account needed. No upfront commitment. We scope the next move.</p>
```

CSS for `.hero-friction-note`:
```css
.hero-friction-note {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 10px;
  letter-spacing: 0.02em;
}
```

**Trust strip** — add between subheadline and CTA row:
```tsx
// 3 inline trust signals (replace client logo strip with inline version)
<div className="hero-trust-inline">
  <span>⭐ 4.8 on Google</span>
  <span>·</span>
  <span>48h first response</span>
  <span>·</span>
  <span>Stripe-secured payments</span>
</div>
```

CSS:
```css
.hero-trust-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 16px;
  margin-bottom: 8px;
}
```

---

#### 2. New Component — `app/components/FeatureCarousel.tsx`

This replaces or supplements Section 3 (currently "Engagement Paths"). The carousel goes **between** the hero and engagement paths sections.

**Section header:**
```tsx
<p className="eyebrow">What ATEAM handles</p>
<h2>From rough request to paid delivery — all of it.</h2>
```

**8 feature cards in carousel:**

```ts
const FEATURES = [
  {
    icon: "📋",   // replace with SVG icon
    label: "Intake & Scoping",
    benefit: "Rough requests become structured briefs in 48 hours."
  },
  {
    icon: "📊",
    label: "Real-Time Dashboard",
    benefit: "Every project visible — status, gates, timeline."
  },
  {
    icon: "📄",
    label: "Proposals & Pricing",
    benefit: "One clear offer. No negotiation theatre."
  },
  {
    icon: "✅",
    label: "Approval Gates",
    benefit: "Client signs off before money or work moves forward."
  },
  {
    icon: "💳",
    label: "Stripe Payments",
    benefit: "Deposit collected upfront. No chasing invoices."
  },
  {
    icon: "🔗",
    label: "Delivery Proof",
    benefit: "Every output documented. Handoff-ready from day one."
  },
  {
    icon: "🤖",
    label: "AI Automation",
    benefit: "Intake, brief generation, and notifications automated."
  },
  {
    icon: "📈",
    label: "Reporting",
    benefit: "Impact documented. Reusable across engagements."
  }
];
```

**Carousel component spec:**

```tsx
"use client";
import { useState, useEffect } from "react";

export default function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const total = FEATURES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, 4500);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <section className="section feature-carousel-section">
      <div className="container">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">What ATEAM handles</p>
          <h2>From rough request to paid delivery — all of it.</h2>
        </div>
        <div className="feature-carousel-track">
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              className={`feature-card${i === active ? " feature-card--active" : ""}`}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
            >
              <span className="feature-card-icon">{f.icon}</span>
              <strong className="feature-card-label">{f.label}</strong>
              <p className="feature-card-benefit">{f.benefit}</p>
            </button>
          ))}
        </div>
        <div className="feature-carousel-dots" role="tablist" aria-label="Feature navigation">
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              className={`carousel-dot${i === active ? " carousel-dot--active" : ""}`}
              onClick={() => setActive(i)}
              aria-selected={i === active}
              aria-label={f.label}
              role="tab"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

**CSS for carousel** (add to a new `styles/feature-carousel.css` and import in `globals.css`):
```css
.feature-carousel-section { background: var(--bg); }

.feature-carousel-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .feature-carousel-track { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .feature-carousel-track { grid-template-columns: 1fr; }
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(108, 92, 231, 0.3), var(--shadow-soft);
  transform: translateY(-2px);
}

.feature-card--active {
  border-color: var(--accent);
  background: var(--surface-glow);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-glow);
}

.feature-card-icon { font-size: 2rem; display: block; }

.feature-card-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  display: block;
}

.feature-card-benefit {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
}

.feature-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--glass-border);
  border: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  padding: 0;
}

.carousel-dot--active {
  background: var(--accent);
  transform: scale(1.25);
}
```

---

## Phase 2 — Social Proof + Engagement Paths Upgrade (Week 3)

### Files to Edit

#### 3. `app/components/HomePageExperience.tsx` — Section 4 (ATEAM engine card)

**Replace the engine stats block** with quantified customer proof:

Current:
```tsx
<div className="home-engine-stat">
  <span className="home-engine-stat-value">3</span>
  <span className="home-engine-stat-label">Execution tracks</span>
</div>
```

New — 3 metric cards with customer tie-in:
```tsx
const PROOF_METRICS = [
  {
    metric: "48h",
    label: "Average first response",
    note: "From rough request to structured brief"
  },
  {
    metric: "4",
    label: "Approval gates per engagement",
    note: "Nothing moves without client sign-off"
  },
  {
    metric: "100%",
    label: "Delivery documented",
    note: "Every output handoff-ready from day one"
  }
];
```

CSS for metric cards — add `.proof-metric-card` class matching existing `.card` style.

#### 4. `lib/engagementOffers.ts` — Review and Sharpen Offer Copy

Each offer needs:
- A one-line outcome statement at the top (not just a description)
- A "best for" label that names a real job type or problem

Example pattern (edit the existing offer objects):
```ts
{
  value: "discovery",
  meta: "Starting point",
  title: "Discovery Sprint",
  price: "From $500",
  outcomeStatement: "Walk away with a scoped brief and recommended direction.",  // ADD THIS
  summary: "...",
  idealFor: "..."
}
```

Add `outcomeStatement` to the type in the file, render it as a bolded line above `summary` in the card.

#### 5. New Component — `app/components/SocialProofStrip.tsx`

Goes between the feature carousel and engagement paths. Shows 3 quantified wins + 1 floating testimonial.

```tsx
const WINS = [
  { metric: "$0", label: "AR outstanding", note: "for clients on upfront payment flow" },
  { metric: "3x", label: "faster scoping", note: "vs traditional agency intake processes" },
  { metric: "48h", label: "to first proposal", note: "from any incoming request" }
];
```

Layout: 3-column metric grid on desktop, 1-column on mobile. Light `--surface` background section. Metric number in `--accent-2` (cyan), large (48px bold). Label in `--text`, note in `--muted`.

Add floating testimonial quote card (positioned on the right on desktop):
```tsx
<blockquote className="proof-testimonial-card">
  <p>"Una Labs took a half-baked idea and turned it into a scoped proposal within two days.
     Paid a deposit. Work started. No ambiguity."</p>
  <footer>
    <strong>— Client, Dispatch project</strong>
  </footer>
</blockquote>
```

CSS:
```css
.proof-section { background: var(--surface); padding: 72px 0; }

.proof-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.proof-metric-card {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 32px;
}

.proof-metric-number {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent-2);
  display: block;
  line-height: 1;
}

.proof-metric-label {
  font-size: 1rem;
  color: var(--text);
  display: block;
  margin-top: 8px;
}

.proof-metric-note {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 4px;
}

.proof-testimonial-card {
  border-left: 3px solid var(--accent);
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 24px 28px;
  margin: 0;
  max-width: 480px;
}

.proof-testimonial-card p {
  font-style: italic;
  color: var(--copy);
  font-size: 0.95rem;
  line-height: 1.6;
}

.proof-testimonial-card footer {
  margin-top: 12px;
  font-size: 0.8rem;
  color: var(--muted);
}
```

---

## Phase 3 — Problem-Solution Sections + Industry Grid (Week 4)

### Goal

Add 2–3 below-fold problem-solution pairs (alternating layout) and a segmentation grid showing who Una Labs serves.

#### 6. New Component — `app/components/ProblemSolutionPairs.tsx`

3 sections, alternating left/right layout (odd = copy left + image right, even = image left + copy right).

```ts
const PAIRS = [
  {
    problem: "Clients arrive with half-formed ideas",
    headline: "Rough input becomes structured scope",
    copy: "Most agencies need a polished brief before they can start. Una Labs takes the rough request and structures it — turning vague language into a scoped brief, lane, and first recommendation within 48 hours.",
    bullets: [
      "No intake form templates to fill out",
      "No discovery call required to begin",
      "ATEAM generates the brief from your description",
      "You see the scope before committing budget"
    ],
    cta: { label: "Submit a rough request", href: "/work-with-ftc" },
    visual: "IntakeMockup"   // name of the mockup sub-component
  },
  {
    problem: "Proposals disappear into inboxes",
    headline: "Proposals with approvals built in",
    copy: "Proposals from Una Labs include approval gates. Before budget moves, before work starts, you see the scope, agree to the terms, and sign off. Everything tracked. Nothing assumed.",
    bullets: [
      "One clear proposal per engagement",
      "Deposit collected through Stripe on sign-off",
      "Approval trail documented",
      "No verbal commitments — everything written"
    ],
    cta: { label: "See how proposals work", href: "/how-it-works" },
    visual: "ProposalMockup"
  },
  {
    problem: "Delivery lacks proof",
    headline: "Every output documented and handoff-ready",
    copy: "Work isn't done until it's documented. Every Una Labs engagement ends with handoff-ready output — screenshots, writeups, and access details — so you have something durable, not just a delivered task.",
    bullets: [
      "Delivery documentation for every engagement",
      "Client portal access to delivery proof",
      "Reusable outputs across future projects",
      "Timestamped approval and completion records"
    ],
    cta: { label: "See delivery proof", href: "/work" },
    visual: "DeliveryMockup"
  }
];
```

**Layout pattern:**
```tsx
{PAIRS.map((pair, i) => (
  <div key={pair.headline} className={`problem-solution-pair${i % 2 === 0 ? "" : " problem-solution-pair--reverse"}`}>
    <div className="problem-solution-copy">
      <p className="eyebrow">{pair.problem}</p>
      <h2>{pair.headline}</h2>
      <p>{pair.copy}</p>
      <ul className="problem-solution-bullets">
        {pair.bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <Link href={pair.cta.href} className="btn btn-secondary">{pair.cta.label}</Link>
    </div>
    <div className="problem-solution-visual">
      {/* Render mockup sub-component based on pair.visual */}
    </div>
  </div>
))}
```

CSS:
```css
.problem-solution-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  padding: 72px 0;
}

.problem-solution-pair--reverse {
  direction: rtl;
}

.problem-solution-pair--reverse > * {
  direction: ltr;
}

@media (max-width: 768px) {
  .problem-solution-pair,
  .problem-solution-pair--reverse {
    grid-template-columns: 1fr;
    gap: 32px;
    direction: ltr;
  }
}

.problem-solution-bullets {
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.problem-solution-bullets li::before {
  content: "✓";
  color: var(--accent-2);
  margin-right: 10px;
  font-weight: 700;
}

.problem-solution-bullets li {
  font-size: 0.9rem;
  color: var(--copy);
}
```

#### 7. New Component — `app/components/IndustryGrid.tsx`

Horizontal 3-column card grid (scrollable on mobile) showing who the service is for.

```ts
const SEGMENTS = [
  {
    icon: "🏢",
    label: "Professional Services",
    benefit: "Consulting, strategy, and advisory firms that need scoped, documented delivery."
  },
  {
    icon: "🎨",
    label: "Digital Agencies",
    benefit: "Agencies and studios that want structured client intake without hiring a PM."
  },
  {
    icon: "⚙️",
    label: "SaaS Product Teams",
    benefit: "Early-stage teams that need AI and automation built fast without retaining an agency."
  },
  {
    icon: "📊",
    label: "Accounting & Tax",
    benefit: "Firms that need client-facing tools, automations, and operational systems."
  },
  {
    icon: "⚖️",
    label: "Law Firms",
    benefit: "Legal practices that need websites, intake systems, or document automation."
  },
  {
    icon: "🚀",
    label: "Founders & Operators",
    benefit: "Solo operators who need real deliverables with minimal back-and-forth."
  }
];
```

CSS: 3-column grid, 2-column on tablet, horizontal scroll on mobile.

---

## Phase 4 — Motion Polish + Help Widget (After Core Pages Stable)

### Files to Edit

#### 8. `app/components/ScrollReveal.tsx` — already exists

Audit current usage. Apply `ScrollReveal` wrapper to:
- Feature carousel cards (staggered entry, 50ms per card)
- Proof metrics (fade up on scroll)
- Problem-solution copy block (fade left/right depending on side)
- Industry grid cards (staggered cascade)

Ensure the component uses `IntersectionObserver` and `once: true` (doesn't re-trigger on scroll up).

#### 9. Button hover states — `styles/globals.css`

Add to existing `.btn-primary` and `.btn-secondary` rules:
```css
.btn-primary {
  /* existing styles... */
  transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.btn-primary:hover {
  background: var(--cta-hover);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.35);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn-secondary:hover {
  border-color: var(--accent-2);
  color: var(--accent-2);
}
```

#### 10. Help/chat widget — `app/layout.tsx`

Add Intercom or Crisp widget script tag (Mike to supply snippet). Wrap in `<Script strategy="lazyOnload">` so it doesn't block page load.

If not using a paid service, add a minimal help chip:
```tsx
// app/components/HelpChip.tsx
// Fixed bottom-right chip: "Questions? Talk to us"
// Links to /contact or opens a mailto:
```

---

## Supporting Pages to Build

### `/how-it-works` — `app/how-it-works/page.tsx`

**Does not exist yet.** Create it.

Page purpose: Show the full intake-to-delivery flow for a prospect who is skeptical about "how does this actually work?"

Structure:
1. Hero: "See how Una Labs works" + tab strip (by type: Digital, AI, Automation, SEO)
2. 4-step flow diagram (visual, not just text): Request → Scope → Proposal → Delivery
3. ATEAM section: What it is, what it does automatically, what the client sees
4. FAQ: 5-6 questions from a skeptical prospect
5. CTA: "Submit a request" + "See recent work"

Mark `export const runtime = "edge"` — required for Cloudflare Pages build.

### `/pricing` — `app/pricing/page.tsx`

**Already exists** but may need upgrade. Audit current page and ensure:
- Tier names match current engagement offers in `lib/engagementOffers.ts`
- Prices are shown (not "contact us" for base tiers)
- Monthly/annual toggle is present if applicable
- Feature comparison grid is present (not just text)
- CTA on each tier goes to `/work-with-ftc?offer=[tier]`

### `/work` — Audit `app/work/page.tsx`

This is the "delivery proof" page referenced in CTAs. Ensure:
- Each case study card shows: client type, service delivered, outcome metric, and link
- No internal project names or code names visible
- At least 3 entries before driving traffic here from the homepage

---

## Section Order in Final Homepage

```
1. Sticky Navigation (Header.tsx — existing, no change needed)
2. Hero — upgraded copy, mockup stack, trust strip
3. ClientLogoStrip (existing)
4. Feature Carousel (new: FeatureCarousel.tsx)
5. Social Proof Strip (new: SocialProofStrip.tsx)
6. Engagement Paths (existing — copy upgraded)
7. ATEAM Engine Card (existing — metric cards upgraded)
8. Problem-Solution Pairs (new: ProblemSolutionPairs.tsx)
9. Industry Grid (new: IndustryGrid.tsx)
10. Client Launches / Delivery Proof (existing)
11. Studio Products (existing)
12. Final CTA (existing — copy tightened)
13. Footer (existing)
```

---

## Copy Rules for the Developer

1. Never write "we" in headlines. Write "your request", "your scope", "your delivery".
2. Avoid "solution", "platform", "ecosystem" — too generic.
3. Outcomes before features. "Walk away with a scoped brief" beats "structured intake module".
4. Friction killers on every CTA block: "No account needed" / "No upfront commitment" / "No credit card required".
5. Numbers everywhere possible. "48h first response" beats "fast response".
6. Don't oversell ATEAM as a product. It's the engine. Una Labs is the brand the client hires.

---

## QA Checklist Before Deploy

- [ ] Lighthouse score ≥ 85 on mobile and desktop
- [ ] Feature carousel works without JS (graceful degradation: show static grid)
- [ ] All CTAs link to correct target (`/work-with-ftc`, `/work`, `/how-it-works`, `/pricing`)
- [ ] No broken images (all mockup components render correctly)
- [ ] `export const runtime = "edge"` on all new pages (Cloudflare Pages requirement)
- [ ] Mobile nav still functional (Header.tsx untouched)
- [ ] ScrollReveal triggers once only (not on scroll-up)
- [ ] All new sections use existing CSS variables — no hardcoded hex values
- [ ] Font weights match existing hierarchy (Space Grotesk headings, Inter body)
- [ ] Dark mode consistent — no white backgrounds except intentional contrast sections

---

## Developer Prompt (Copy-Paste Ready)

Use this prompt when handing off to a developer or AI coding tool:

---

```
You are building Phase 1 of the Una Labs homepage upgrade.
The codebase is at APPS/ftc-site — Next.js 14 App Router, TypeScript, dark CSS design system.

Primary file: app/components/HomePageExperience.tsx
Design tokens: styles/globals.css (use existing CSS variables only)
New tokens to add: --cta-hover: #5a4dd6; --accent-warm: #e07b39; --surface-glow: rgba(108,92,231,0.08)

Tasks for Phase 1:

1. In HomePageExperience.tsx, upgrade the hero section:
   - H1: "Rough request in. / Scoped delivery out." (two lines, second line accent word in --accent-2)
   - Subheadline: three lines as separate <span> elements with display:block
   - Add .hero-friction-note: "No account needed. No upfront commitment. We scope the next move."
   - Add .hero-trust-inline strip: 3 trust signals inline below subheadline
   - Replace right column (home-flow-visual) with HeroMockupStack component (3 stacked cards)

2. Create app/components/HeroMockupStack.tsx:
   - Three cards: Intake, Proposal, Delivery Proof
   - Stacked with translateY/translateX offset (see CSS spec)
   - Uses --surface background, --glass-border border, --radius

3. Create app/components/FeatureCarousel.tsx:
   - 8 feature cards in a 4-column grid
   - Active state highlights card with --accent border and --surface-glow background
   - Auto-rotates every 4500ms
   - Dot pagination below
   - Pause rotation on hover
   - All CSS uses existing variables

4. Insert FeatureCarousel between ClientLogoStrip and the Engagement Paths section in HomePageExperience.tsx.

5. Add new CSS to styles/globals.css for all new components.
   Do not modify existing CSS rules. Only add new rules.

6. All new pages must include: export const runtime = "edge"

Do not change Header.tsx, Footer.tsx, or any existing section CSS classes.
Do not introduce any new npm packages.
Test on mobile at 375px width.
```

---

## Phased Build Order Summary

| Phase | Target | Deliverable | Week |
|-------|--------|-------------|------|
| 1 | Hero + Feature Carousel | Upgraded hero copy, mockup stack, carousel | 1–2 |
| 2 | Social Proof + Engagement Paths | Metrics, testimonial, offer card upgrade | 3 |
| 3 | Problem-Solution + Industry Grid | 3 pairs, 6-segment grid | 4 |
| 4 | `/how-it-works` + `/pricing` pages | 2 new supporting pages | 5 |
| 5 | Motion polish + Help widget | Scroll reveal, button states, chat | 6 |

---

*Last updated: 2026-04-17. Source: Ignition App audit (pattern study). Una Labs repo: `c:\FTC HOLDING\APPS\ftc-site`.*
