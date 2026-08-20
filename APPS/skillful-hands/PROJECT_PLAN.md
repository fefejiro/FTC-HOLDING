# Skillful Hands CIC Website Execution Plan

## Project

- Brand: Skillful Hands CIC
- Domain: https://skillfulhandscic.uk
- Repository: fefejiro/FTC-HOLDING
- App path: APPS/skillful-hands
- Delivery target: production-ready premium static multi-page website
- Hosting target: Cloudflare Pages
- DNS registrar: Namecheap, with DNS to be moved or delegated to Cloudflare when ready

## Product Goal

Create a credible, warm, modern website that helps schools, funders, councils, community organisations, corporate partners, parents, and participants understand Skillful Hands CIC and take the next step.

The site must feel established and trustworthy without inventing impact statistics, partner relationships, accreditations, or outcomes.

## Recommended Stack

Use Astro 5, TypeScript, Tailwind CSS, and Cloudflare Pages.

Reasoning:

- The FTC-HOLDING monorepo already contains an Astro and Cloudflare Pages implementation in APPS/gardencleaners-site.
- A content-led static website does not need a database or server-rendered application at launch.
- Astro provides strong performance, SEO, accessibility, and a simple expansion path.
- Cloudflare Pages matches the existing FTC infrastructure.

## Information Architecture

1. Home: hero, overview, compact programme pathways and contact call to action
2. About: purpose and founder
3. Programmes: programme details and enquiry routes
4. Partner with us: partnership audiences and enquiry routes
5. Contact: prefilled and blank email actions
6. Shared sticky navigation and footer

## Confirmed Content

### Tagline

Creating Skills. Building Futures.

### Core proposition

Skillful Hands CIC empowers young people and adults through practical hair education, confidence-building, employability, wellbeing, and entrepreneurship.

### About

Skillful Hands CIC is a Community Interest Company dedicated to helping people build confidence, practical skills, and brighter futures through hair education and personal development.

Its programmes combine technical hair training with life skills, employability, wellbeing, and entrepreneurship, creating pathways into education, employment, and self-employment.

### Founder

Monique Hughes is the founder of Skillful Hands CIC. Her background includes community development, youth engagement, event management, and social impact work across Canada and the United Kingdom.

She created Skillful Hands to use hair as a practical tool for confidence, connection, creativity, and opportunity.

### Programmes

- Hair for Youth: Hair education, confidence, creativity, and life skills for young people.
- Growing & Glowing: School-based practical hair activities, personal development and relationship education.
- Rejesha Crown: Confidence, employability and personal development programme for women rebuilding and moving forward.
- Beyond the Chair: Hair, wellbeing, creativity and social connection for adults.
- Roots & Rhythms: Hair, music, culture and conversation for creative and cultural programmes.

### Contact

skillfulhandcic@gmail.com

## Content Rules

- Do not fabricate participant totals, success rates, partner logos, testimonials, awards, accreditations, or funding relationships.
- Use language that is clear to schools, funders, councils, community organisations, and families.
- Avoid framing the organisation as a salon.
- Keep the tone warm, credible, empowering, and practical.
- Use UK spelling throughout.
- Avoid inflated claims such as leading, award-winning, best, or proven unless verified.

## Design Direction

### Brand qualities

- Warm
- Modern
- Community-centred
- Credible
- Hopeful
- Inclusive
- Practical
- Premium without feeling corporate

### Suggested palette

- Deep Brown `#2B120B` for primary text, navigation and footer
- Warm Cream `#FFF8EE` for the main background
- Soft Beige `#F3E5D3` for alternate surfaces
- Burnt Orange `#D94F00` for primary actions and highlights
- Deep Red `#A90F16`, Olive Green `#4E5D16` and Warm Gold `#D99A00` for controlled programme and wellbeing accents

Final colours should meet WCAG AA contrast requirements.

### Typography

Use Barlow Condensed for headings, Barlow for body text and Caveat sparingly for short accents. Serve fonts locally.

### Imagery

Prioritise authentic photographs of hands, hair education, teaching, tools, community activity, and Monique. The approved illustrative workshop scene is used only as the homepage hero image and is labelled accurately in alt text.

## Functional Requirements

- Fully responsive from 320px upwards
- Keyboard-accessible navigation and controls
- Semantic HTML landmarks and heading structure
- Skip link
- Reduced-motion support
- Optimised images with explicit dimensions
- Contact email link and clear partnership call to action
- Working mobile navigation
- Anchor navigation with sensible focus behaviour
- No database for version one
- No unnecessary JavaScript

## SEO Requirements

- Canonical domain: https://skillfulhandscic.uk
- Metadata title and description
- Open Graph metadata
- Social sharing image placeholder
- Organisation structured data using JSON-LD
- robots.txt
- sitemap.xml
- favicon and web manifest
- Meaningful alt text
- UK-focused copy without keyword stuffing

## Cloudflare Deployment

Expected app-level commands:

- npm run dev
- npm run build
- npm run preview
- npm run deploy

Expected output directory:

- dist

The Cloudflare Pages project should build from APPS/skillful-hands or use the monorepo workspace command from the repository root.

## Domain Plan

The domain is registered at Namecheap.

Preferred production flow:

1. Create the Cloudflare Pages project.
2. Add skillfulhandscic.uk and www.skillfulhandscic.uk as custom domains.
3. Move DNS management to Cloudflare nameservers or create the required DNS records at Namecheap.
4. Make skillfulhandscic.uk canonical.
5. Redirect www to the apex domain.
6. Remove the current Namecheap parking CNAME and URL redirect only when Cloudflare provides the replacement records.
7. Confirm HTTPS, redirects, canonical tags, and DNS propagation before launch.

## Build Phases

### Phase 1: Foundation

- Scaffold Astro app in APPS/skillful-hands
- Add TypeScript and Tailwind
- Add workspace-compatible package name
- Add README and environment example
- Confirm local build

### Phase 2: Content and Design System

- Centralise site content in src/content/site.ts
- Create design tokens
- Build shared Section, Container, Button, ProgrammeCard, and CTA components
- Create navigation and footer

### Phase 3: Page Build

- Implement the home route and focused supporting routes
- Add responsive behaviour
- Add subtle, reduced-motion-safe transitions
- Add real or clearly labelled placeholder assets

### Final visual QA lessons

- Keep programme detail cards wide enough for the photograph and copy to read as
  separate editorial columns on desktop. Stack the image above the copy on
  smaller screens.
- Avoid decorative braid or ribbon artwork when it competes with community copy
  or creates an apparent page edge. Brand elements should support hierarchy,
  not become a second subject.
- Use the complete supplied logo artwork with responsive dimensions in both
  header and footer. Do not substitute a text approximation or a tiny mark.
- Keep the homepage compact: use static programme links for orientation and
  reserve detailed descriptions for `/programmes/`.

### Phase 4: Quality

- Run build and lint checks
- Test mobile navigation and all links
- Perform accessibility review
- Check metadata and structured data
- Check layout at common mobile, tablet, and desktop widths
- Verify that no claims were invented

### Phase 5: Deployment

- Deploy to Cloudflare Pages
- Connect custom domain
- Verify apex and www behaviour
- Run final production smoke test
- Record deployment instructions in README

## Definition of Done

The first release is complete when:

- skillfulhandscic.uk loads over HTTPS
- all five routes are polished on mobile and desktop
- all navigation and contact actions work
- all content is truthful and approved
- the site has valid metadata, sitemap, robots, and structured data
- the build is reproducible from the repository
- deployment and content-editing instructions are documented
- no database, authentication, or unnecessary backend has been introduced

## Release record

The final layout polish was released in commit `b8a0ea9` on
`feat/skillful-hands-foundation` and deployed to the `skillful-hands-cic`
Cloudflare Pages project. It removed the community ribbon, widened programme
image-and-copy cards, enlarged the footer logo, and preserved the static
homepage pathways. Production verification completed 20/20 checks after the
deployment.

## Operational close-out

The delivery handover is recorded in `HANDOVER-2026-08-20.md`. Una Labs Stripe
invoice `D9Z0S4PG-0001` was sent on 20 August 2026 for CAD 3,600.00, after the
CAD 100.00 deposit reported for 14 August 2026, and is due 3 September 2026.
Its operational record lives in `docs/billing/`; it is deliberately separate
from public site content. Any reminder configuration must be invoice-specific
or explicitly approved as an account-wide Stripe policy.
