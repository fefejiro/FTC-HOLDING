# UNA LABS LIGHT REBRAND — STRATEGIC BRIEF
## Executive Leadership Guide

**Version:** 1.0
**Date:** April 2026
**Status:** READY FOR EXECUTION
**Decision:** OPTION A (ATEAM Infrastructure Only)

---

## EXECUTIVE SUMMARY

Una Labs is executing a strategic light theme rebrand across website and product UI.

### What's Changing
- **Website:** Dark theme → Light theme (professional, Ignition-tier aesthetic)
- **Product UI:** Dark theme → Light theme (customer-facing, polished)
- **Messaging:** Technical/feature-focused → Outcomes-first, conversational
- **Brand positioning:** "Technical delivery tool" → "Professional service platform"
- **ATEAM visibility:** Hidden (customers never see it exists)

### What's NOT Changing
- Core product functionality
- Customer data or integrations
- Pricing model
- Feature set
- Customer commitments

### Timeline: 4 Months Total
- **Phase 1 (Website):** 6 weeks
- **Phase 2 (Product UI):** Weeks 7–18 concurrent
- **Phase 3 (Dark mode option):** Weeks 20–24 silent build

### Resource Requirement
~640 hours (~4 weeks full-time eng + design)

### Success Metrics
- 3–5% homepage → trial conversion (baseline)
- Maintain 20%+ trial → paid conversion
- No NPS decrease post-launch

### Risk Level
**LOW** — dark site remains accessible, rollback available within 2 hours

---

## WHY LIGHT THEME NOW

### Market Context

**Competitor Analysis (Ignition, HubSpot, Salesforce):**
- All light theme
- All positioning as "professional service platform"
- All emphasizing trust, clarity, maturity
- Light theme = enterprise-ready perception in the market

**Current Una Labs Perception:**
- Dark theme reads as "technical/engineering-first"
- Limits market to technical buyers (CTOs, developers)
- Excludes: Account managers, operations, non-technical stakeholders
- Product mockups don't photograph well — dark UI in client screenshots reads as "internal tool"
- Doesn't match customer expectations for a "professional deliverable platform"

### Customer Feedback (Anecdotal)

- "Your platform is powerful, but feels technical"
- "Will my clients see this as professional?"
- "Can I show this to stakeholders without looking like a dev tool?"
- "Your dashboard is impressive, but when I screenshot it for clients, it looks dark and internal"

*(Add quantitative survey data here post-launch if collected)*

### Strategic Shift

**From:** "ATEAM-powered delivery infrastructure" — confusing dual brand, technical framing

**To:** "Una Labs: The professional service platform" — single clear brand, outcome-first

**Result:** One brand. Clear market position. No confusion about ATEAM. Broader buyer appeal.

---

## THE THREE PHASES

### PHASE 1: Website Light Rebrand (Weeks 1–6)

#### What We're Building

**Marketing Website (unalabs.cloud):**
- Homepage: hero, features, social proof, CTAs
- `/pricing` — 4 tiers, transparent pricing, no "contact us" for base tiers
- `/how-it-works` — product walkthrough with 9 feature cards
- `/product/[slug]` landing pages:
  - `intake-scoping`
  - `dashboard`
  - `client-portal`
  - `reporting`
  - `approval-sign-off`
- Login page: "Una Labs Dashboard" — never mentions ATEAM
- All copy: conversational, outcomes-first, zero technical jargon

#### Visual Design Specifications

| Property | Value |
|----------|-------|
| Background | White (`#FFFFFF`), off-white (`#F8FAFB`) |
| Primary accent | Teal (`#4DB8A8`) |
| Secondary accent | Orange-red (`#FF3D00`) |
| Body text | Dark gray (`#3D424B`) |
| H1 size | 48px desktop / 32px mobile |
| Body size | 16px, 1.6 line-height |
| Layout | Asymmetric — right-aligned images, organic wave shapes |
| Motion | Subtle — carousel auto-rotate, hover states only |
| Responsive | 320px / 768px / 1440px breakpoints |
| Accessibility | WCAG AA compliant |

#### Deliverables

- Production-ready website (Next.js 14 + React 18 + Tailwind CSS)
- 301 redirects from old dark site routes
- All pages tested (performance, accessibility, mobile)
- Deployment-ready on Vercel or Cloudflare Pages
- Performance: <3s desktop, <4s mobile
- Lighthouse score: ≥90

#### Team & Hours

| Role | Hours | Deliverables |
|------|-------|--------------|
| Frontend Engineer | 200 | Component build, responsive, deployment |
| Designer | 80 | Design specs, component library, QA |
| QA | 60 | Testing, accessibility, performance |
| Content/Copy | 40 | Copy review, CMS setup, publish |
| **Total** | **380** | |

#### Timeline

- **Week 1–2:** Design finalization, component spec lock
- **Week 3–5:** Development (90% complete by end of Week 5)
- **Week 6:** QA, final testing, launch prep

#### Launch Date
**End of Week 6** — Thursday or Friday for weekend monitoring window

---

### PHASE 2: Product UI Light Transition (Weeks 7–18, Concurrent)

#### What We're Building

**Product Dashboard — ATEAM UI → Light Theme:**
- All customer-facing screens updated to light palette
- Navigation, modals, forms refactored
- Reporting UI light theme
- Login screen: "Welcome to Una Labs Dashboard"

#### Rollout Strategy (Phased)

| Week | Action |
|------|--------|
| Week 10 | Beta: 10% of users — gather feedback |
| Week 12 | Expand: 50% of users |
| Week 14 | Full rollout: 100% of users |
| Week 18 | Dark theme removed from customer view entirely |

#### Contingency Plan

- Dark theme CSS remains available for 2-week rollback window
- Quick revert: toggle CSS variable root values
- Support team briefed on rollback procedure
- Rollback SLA: <2 hours from decision to execution

#### Team & Hours

| Role | Hours | Deliverables |
|------|-------|--------------|
| Product Design | 80 | Component audit, light specs, QA |
| Frontend Engineer | 120 | CSS variable refactor, component updates |
| Backend Support | 20 | ATEAM API compatibility check, theme toggle |
| Product Manager | Ongoing | Monitoring, rollout decisions, comms |
| **Total** | **220+** | |

#### Timeline

- **Week 7–8:** Product UI audit, component refactor plan
- **Week 9:** CSS variable system update, theme toggle infrastructure
- **Week 10:** Beta deployment (10%)
- **Week 11–14:** Phased rollout (50% → 100%)
- **Week 15–18:** Stabilization, dark theme removal, final QA

---

### PHASE 3: Dark Mode Option (Weeks 20–24, Silent Build)

#### What We're Building

- Dark mode toggle in product Settings → Theme
- System-level dark mode detection (respects OS preference)
- CSS variable switch — teal/orange-red work in both themes

#### Why Silent (Not Announced at Launch)

- No announcement = no expectation management burden
- Users who want dark mode find it as a pleasant discovery
- Avoids "we didn't get light theme right" narrative
- Gives Phase 1 and 2 time to stabilize before adding complexity

#### Team & Hours

| Role | Hours | Deliverables |
|------|-------|--------------|
| Frontend Engineer | 60 | Dark mode CSS, theme toggle, testing |
| Designer | 20 | Dark mode specs, QA |

#### Timeline

- **Week 20–22:** Build + internal test
- **Week 23:** Internal beta
- **Week 24:** Quiet release — available in Settings, no email, no blog post

#### User Discovery Path

In-product tooltip (shown once): "Prefer dark? Settings → Theme → Dark Mode"

---

## ATEAM POSITIONING (LOCKED DECISION: OPTION A)

### What Customers See

| Surface | Correct Text |
|---------|-------------|
| Login page | "Welcome to Una Labs Dashboard" |
| Navigation | "Una Labs" |
| Marketing | "Una Labs" brand only |
| Support replies | "Una Labs platform" |
| Help docs | "Una Labs" — never "ATEAM" |
| Product UI | "Una Labs" — never "ATEAM" |

### What Engineers Know (Internal Only)

- ATEAM = operating system powering Una Labs
- ATEAM handles: intake workflows, approvals, integrations, reporting, billing automation
- ATEAM remains dark theme — internal team only, no customer-facing UI
- Internal engineering docs may reference ATEAM freely
- Customer-facing docs: zero ATEAM mentions — enforce in QA checklist

### If a Customer Asks "What's ATEAM?"

**Support Response Template:**

> "That's our internal operating engine — the technology powering Una Labs. You interact with Una Labs, which sits on top of our ATEAM infrastructure. Think of it like AWS for your delivery workflows. You don't need to know about it, but it's there making everything work reliably and securely."

**Key framing points for support team:**
- Infrastructure, not a separate product
- AWS analogy makes it relatable ("you use S3 without knowing it's S3")
- Reassure: they don't need to learn it
- Reinforce: it's our advantage, not their complexity

### Phase 4+ Consideration (Decision Point: Q4 2026)

- Monitor demand signal: agencies requesting "ATEAM API access" or "workflow engine licensing"
- If meaningful traction by Q4 2026, revisit Option B (expose ATEAM as a product tier)
- Until then: ATEAM stays hidden, Una Labs is the only visible brand

---

## CUSTOMER COMMUNICATION PLAN

### Email 1: Launch Day

**Subject:** "Introducing the new Una Labs — Cleaner, faster, built for you"

**Send time:** 9 AM recipient timezone, launch day (not a weekend)

**Tone:** Excited, professional, reassuring

---

Hi [First Name],

We're thrilled to introduce the redesigned Una Labs.

Our new look reflects who we are: a modern, professional platform built for teams who deliver with confidence. You'll notice a cleaner interface, faster performance, and a fresh visual identity that matches the quality of your work.

**What's staying the same:**

✓ Your projects and data — unchanged
✓ Your integrations — all still connected
✓ Your workflows — nothing new to learn
✓ Your billing — no changes

This is a design refresh, not a migration. Log in and start using it immediately.

→ [Access the new Una Labs dashboard](#)
→ [See what changed](#) *(blog post)*
→ [Questions? Contact support](#)

Welcome to the next chapter of Una Labs.

The Una Labs Team

---

### In-App Banner (2 Weeks, Dismissible)

**Placement:** Top of dashboard, dismissible after reading

👋 **Welcome to the new Una Labs!**
We've redesigned for you — cleaner, faster, same powerful features.
[Learn more →] [Dismiss]

**A/B copy options:**
- Option A: "We've redesigned for you"
- Option B: "New look, same power"
- Option C: "Fresh design, full power"

### Blog Post: "Why We Redesigned Una Labs"

**Published:** Launch day
**Length:** 1,000–1,500 words
**Tone:** Conversational, design-thinking, customer-focused

---

**Why We Redesigned Una Labs**

We spent the last few months listening to you.

One thing kept coming up: *"Your platform is powerful, but it feels technical. My clients don't see it as part of my professional brand."*

So we redesigned. Not just a paint job — a complete rethinking of how Una Labs looks and feels.

**What Changed (And Why)**

**1. Light Theme = Professional Trust**

Your clients see your dashboards, your reports, your work through Una Labs. They should see something polished, professional, and trustworthy. Light theme signals maturity. That's what we built.

**2. Conversational, Not Corporate**

We changed how we talk about Una Labs. Less feature-speak, more outcomes. Instead of "real-time analytics dashboard," we say "see your project progress instantly." Instead of "workflow automation," we say "get your team on the same page." Clarity wins.

**3. Faster. Built for Speed.**

The new site loads 40% faster. Reports render instantly. You focus on your work, not waiting for the platform.

**What Didn't Change**

Your data. Your integrations. Your workflows. Everything you depend on is exactly where you left it. This is a design upgrade, not a migration.

**The Bigger Picture**

We're committed to one thing: making you look great to your clients. Una Labs is your professional operating system. We're here to support your best work.

[Log in now →](#) | [Questions? We're here →](#)

---

### Phase 2 Email: Product UI Update

**Subject:** "Your Una Labs dashboard just got lighter"

**Send timing:** When Phase 2 reaches 100% rollout (approximately Week 14)

**Tone:** Matter-of-fact, reassuring, brief

---

Hi [First Name],

We've updated your Una Labs dashboard to match our new site design.

Same features. Same data. Now with a cleaner, professional look throughout.

Nothing to do — you'll see the update next time you log in.

[Open your dashboard →](#)

The Una Labs Team

---

## ROLLOUT CALENDAR

```
WEEK 1–2
├── Design finalization
├── Component specifications locked
├── Content/copy finalization
└── QA test plan created

WEEK 3–5
├── Frontend development (90% complete by end of Week 5)
├── Phase 2 product audit running concurrently
└── Internal testing begins (Week 5)

WEEK 6
├── QA + final testing
├── 301 redirects configured
├── Email templates approved + scheduled
├── Blog post approved and ready to publish
├── Support team trained on rebrand FAQ
└── Launch readiness check completed

🚀 END OF WEEK 6: LAUNCH
├── unalabs.cloud goes live (light theme)
├── Email 1 deployed (9 AM)
├── In-app banner activated
└── Blog post published

WEEK 7–9
├── Monitor: Sentry, DataDog, GA daily
├── Gather user feedback (support tickets, survey)
└── Phase 2 product UI audit complete

WEEK 10
└── Phase 2 beta: 10% of users (product light theme)

WEEK 11–14
├── Phase 2: 50% → 100% rollout
├── In-app banner dismissed/removed (2 weeks complete)
└── Monitor churn/retention daily

WEEK 15–18
├── Phase 2: 100% complete
├── Dark theme removed from customer view
└── Stability check + final feedback collection

WEEK 20–22
└── Phase 3: Dark mode development + internal testing

WEEK 23
└── Phase 3: Internal beta

WEEK 24
└── Phase 3: Quiet release (Settings → Theme)

POST-LAUNCH MONITORING CADENCE
├── Week 1–4: Daily monitoring (conversion, errors, performance)
├── Week 5–8: Weekly checks (retention, NPS, feedback)
└── Week 9+: Bi-weekly (standard monitoring cadence)
```

---

## SUCCESS METRICS

### Website Launch (Week 1–4 Post-Go-Live)

| Metric | Target | Tool |
|--------|--------|------|
| Page load (desktop) | < 3 seconds | Lighthouse, PageSpeed |
| Page load (mobile) | < 4 seconds | Lighthouse |
| Homepage → trial conversion | 3–5% | Google Analytics |
| Mobile engagement | ≥50% of desktop rate | GA |
| Bounce rate | < 40% | GA |
| Error rate | < 0.1% | Sentry |
| Lighthouse score | ≥ 90 | Lighthouse |
| Accessibility | 0 critical issues | axe DevTools |

### Product Phase 2 (Week 7–18)

| Metric | Target | Tool |
|--------|--------|------|
| User satisfaction (light theme) | ≥ 4.0/5 | In-app survey |
| Theme-related support tickets | < 10% of daily volume | Zendesk |
| Product churn | No increase vs baseline | Mixpanel |
| Time-to-first-action | No increase | Product analytics |

### Brand Perception (Week 1–12)

| Metric | Target | Tool |
|--------|--------|------|
| "Professional" perception | +15% vs baseline | Customer survey |
| "Modern/current" perception | +20% vs baseline | Survey |
| NPS | No decrease | Annual NPS |
| Time on page (homepage) | 2+ minutes average | GA |

---

## RISK ASSESSMENT & MITIGATION

### Risk 1: Users Dislike Light Theme
**Probability:** 20% | **Impact:** Complaints, support tickets, potential churn

**Mitigation:**
- Dark mode toggle available in Phase 3 (within 8 weeks of launch)
- User feedback channels open immediately at launch
- Old dark site accessible for 30 days if critical issues force rollback
- Proactive message: "Prefer dark? We're working on it" if volume warrants

### Risk 2: Performance Issues at Launch
**Probability:** 10% | **Impact:** Slow site, conversion drop, negative first impression

**Mitigation:**
- Full load testing before launch (10K concurrent users)
- CDN on Vercel (auto-scaling) or Cloudflare
- Rollback SLA: old site restored within 2 hours
- Sentry + DataDog alerts configured before go-live

### Risk 3: Phase 2 Timeline Slips
**Probability:** 30% | **Impact:** Delayed rollout, inconsistent experience

**Mitigation:**
- Phase 2 starts immediately in Week 7 (no wait)
- MVP approach: dashboard + core pages first, secondary pages Week 2
- Feature freeze during Phase 2 (no new features Weeks 7–18)
- Contingency: add one engineer if Phase 2 is >1 week behind

### Risk 4: ATEAM Terminology Leaks Into Marketing
**Probability:** 15% | **Impact:** Customer confusion, brand positioning undermined

**Mitigation:**
- Content audit before launch — search all public copy for "ATEAM"
- QA checklist item: "Zero internal terminology visible to users"
- Support team training completed before launch day
- Help center docs reviewed and updated

### Risk 5: Signup Flow Broken at Launch
**Probability:** 10% | **Impact:** CTA buttons dead, zero conversion

**Mitigation:**
- Signup backend confirmed production-ready in Week 6 QA
- Full "Start Free Trial" flow tested end-to-end
- Fallback: contact form available if signup system goes down
- Monitored in Sentry with immediate alert on errors

---

## GO / NO-GO CHECKLIST

### Phase 1 Website Launch

- [ ] Zero critical accessibility issues (WCAG AA)
- [ ] Lighthouse score ≥ 90
- [ ] Page load < 3s desktop, < 4s mobile
- [ ] Zero ATEAM mentions in any public-facing copy
- [ ] All CTAs functional (signup, demo, pricing, contact)
- [ ] Mobile tested at 320px, 768px, 1440px
- [ ] Email 1 template approved and scheduled
- [ ] Blog post approved and ready to publish
- [ ] Support team trained — FAQ drafted, on standby
- [ ] Rollback plan documented and tested
- [ ] Sentry + DataDog alerts configured
- [ ] Stakeholders briefed and aligned

### Phase 2 Product Beta (10%)

- [ ] Light theme renders without visual bugs on all screens
- [ ] No performance degradation vs dark theme
- [ ] User feedback: < 5% critical complaints
- [ ] Support FAQ updated for light theme questions
- [ ] Dark theme rollback tested and confirmed working

### Phase 3 Dark Mode Launch

- [ ] Toggle functional on all pages
- [ ] OS-level dark mode detection working
- [ ] No color contrast failures in dark mode
- [ ] No performance hit from theme switching
- [ ] In-product tooltip shows once on settings page

---

## COMMUNICATION CHECKLIST

- [ ] Email 1: Launch day — drafted, approved, scheduled
- [ ] Blog post: "Why We Redesigned" — written, approved, ready to publish
- [ ] In-app banner: Copy + design finalized
- [ ] Support FAQ: Top 20 Q&A about the redesign
- [ ] Support team: Training call completed
- [ ] Product team: Talking points for customer calls
- [ ] Help center: Screenshots updated to light theme
- [ ] Phase 2 email: Drafted (sends at 100% rollout)
- [ ] Phase 3 email: Not needed (silent release)
- [ ] Social media: LinkedIn announcement optional (day of launch)

---

## BUDGET & RESOURCE ALLOCATION

| Phase | Task | Hours | Est. Cost |
|-------|------|-------|-----------|
| Phase 1 | Website design | 80 | $4,000 |
| Phase 1 | Website development | 200 | $10,000 |
| Phase 1 | QA + testing | 60 | $3,000 |
| Phase 1 | Content review | 40 | $2,000 |
| Phase 2 | Product UI audit | 60 | $3,000 |
| Phase 2 | Component refactor | 80 | $4,000 |
| Phase 2 | Backend support | 20 | $1,000 |
| Phase 2 | Product management | 40 | $2,000 |
| Phase 3 | Dark mode development | 60 | $3,000 |
| Phase 3 | Dark mode design | 20 | $1,000 |
| **Total** | | **660 hrs** | **~$33,000** |

*Alternative: Internal team build = salary burn only (~4 weeks full-time)*

---

## ATEAM INTERNAL REFERENCE (ENGINEERS ONLY)

**What ATEAM Is:**
The operating system powering Una Labs. Handles form intake, approval workflows, integrations, reporting, and billing automation. Customers interact only with the Una Labs layer — they never see or interact with ATEAM directly.

**What Customers See:**
"Una Labs" everywhere. Zero ATEAM mentions in any customer-facing surface.

**Internal Use:**
Engineering docs, database schemas, API documentation, and internal meetings may reference ATEAM freely. This is architecture terminology — keep it inside the team.

**If a Customer Mentions ATEAM:**
- Acknowledge briefly: "That's our internal engine"
- Redirect to Una Labs: "You're working with Una Labs, which runs on that infrastructure"
- AWS analogy closes the loop without over-explaining

---

## FINAL APPROVAL SIGN-OFF

| Role | Name | Status |
|------|------|--------|
| Project Owner | Mike Fejiro | [ ] Approved |
| Design Lead | TBD | [ ] Approved |
| Engineering Lead | TBD | [ ] Approved |
| Marketing | TBD | [ ] Approved |

**Next step after all approvals:** Proceed to Document 2 (Developer Handover)

---

*Version 1.0 | April 2026 | Status: LOCKED FOR BUILD*
