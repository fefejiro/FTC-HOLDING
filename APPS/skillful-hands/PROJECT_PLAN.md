# Skillful Hands CIC Website Execution Plan

## Project

- Brand: Skillful Hands CIC
- Domain: https://skillfulhandscic.uk
- Repository: fefejiro/FTC-HOLDING
- App path: APPS/skillful-hands
- Delivery target: production-ready premium one-page website
- Hosting target: Cloudflare Pages
- DNS registrar: Namecheap, with DNS to be moved or delegated to Cloudflare when ready

## Product Goal

Create a credible, warm, modern website that helps schools, funders, councils, community organisations, corporate partners, parents, and participants understand Skillful Hands CIC and take the next step.

The site must feel established and trustworthy without inventing impact statistics, partner relationships, accreditations, or outcomes.

## Recommended Stack

Use Astro 5, TypeScript, Tailwind CSS, and Cloudflare Pages.

Reasoning:

- The FTC-HOLDING monorepo already contains an Astro and Cloudflare Pages implementation in APPS/gardencleaners-site.
- A content-led one-page site does not need a database or server-rendered application at launch.
- Astro provides strong performance, SEO, accessibility, and a simple expansion path.
- Cloudflare Pages matches the existing FTC infrastructure.

## Information Architecture

1. Sticky navigation
2. Hero
3. Trust and outcomes strip
4. About Skillful Hands
5. Programmes
6. How the programmes create change
7. Meet the Founder
8. Partnership audiences
9. Vision and future direction
10. Contact call to action
11. Footer

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
- Rejesha Crown: Confidence, employability, and personal development programme for women. Confirm final spelling before launch.
- Beyond the Chair: Hair, wellbeing, entrepreneurship, and economic opportunity for adults.

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

- Deep plum or deep forest for primary brand colour
- Warm ivory for backgrounds
- Terracotta for warmth and human energy
- Muted gold for highlights
- Charcoal for body text

Final colours should meet WCAG AA contrast requirements.

### Typography

Use a modern display typeface for headings and a highly legible sans-serif for body text. Prefer locally optimised or privacy-friendly font delivery.

### Imagery

Prioritise authentic photographs of hands, hair education, teaching, tools, community activity, and Monique. If authentic assets are unavailable, use carefully selected temporary imagery and document every placeholder for later replacement.

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

- Implement all one-page sections
- Add responsive behaviour
- Add subtle, reduced-motion-safe transitions
- Add real or clearly labelled placeholder assets

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
- the page is polished on mobile and desktop
- all navigation and contact actions work
- all content is truthful and approved
- the site has valid metadata, sitemap, robots, and structured data
- the build is reproducible from the repository
- deployment and content-editing instructions are documented
- no database, authentication, or unnecessary backend has been introduced
