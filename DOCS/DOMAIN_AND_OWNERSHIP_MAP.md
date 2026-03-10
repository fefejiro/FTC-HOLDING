# Domain and Ownership Map

Last updated: 2026-03-10
Canonical repo root: `C:\FTC HOLDING`

## Purpose

This document separates four kinds of ownership so future work does not mix them together:
- brand ownership
- repo ownership
- deployment ownership
- domain ownership

## 1. Brand Ownership

### FTC HOLDING
- Role: legal, holding, consulting, and operating entity
- Use when discussing company ownership, consulting engagements, and organizational control

### Unalabs
- Role: public-facing umbrella brand and product lab
- Use when presenting the studio, product portfolio, and cross-product capability narrative

### Product brands under Unalabs
- PeacePad
- Saywetin
- ATEAM
- future extension surfaces and new products

## 2. Repo Ownership

Canonical root:
- `C:\FTC HOLDING`

Current root repo already organizes active code into:
- `APPS/`
- `PACKAGES/`
- `DOCS/`
- `workers/`
- `scripts/`

Important ownership notes from existing local docs:
- `C:\FTC HOLDING\FTC-HOLDING` is a nested duplicate tree and is not canonical for the root repo.
- `APPS/ATEAM` exists locally and is documented as an ownership/tracking decision point.

## 3. Deployment Ownership

### Unalabs site / studio site
- Current code location: `APPS/ftc-site`
- Current brand role: umbrella studio site
- Local docs indicate the target canonical host is `https://unalabs.cloud`
- This repo pass does not assume more than what local docs already state

### PeacePad
- Frontend owner: Cloudflare Pages
- API owner: Railway
- Mobile owner: platform store release process separate from web deploys

### Saywetin
- Frontend owner: Cloudflare Pages
- API owner: Railway
- Mobile owner: platform store release process separate from web deploys

### PeacePad extension
- Package/runtime owner: browser extension bundle
- Service dependency: PeacePad API
- No separate extension backend is documented in this pass

### ATEAM
- Local or decision-pending surface
- Not part of the active root production pipeline according to current root docs

## 4. Domain Ownership Map

### Confirmed or locally documented product/brand domains

#### `peacepad.ca`
- Product brand domain for PeacePad frontend
- Related API host: `api.peacepad.ca`
- Ownership model: product-specific, not umbrella-wide

#### `saywetin.app`
- Product brand domain for Saywetin frontend
- Related API host: `api.saywetin.app`
- Ownership model: product-specific, not umbrella-wide

#### `unalabs.cloud`
- Umbrella / studio / public portfolio domain
- Current local docs indicate this is the intended canonical Una Labs site host

#### `ftc.peacepad.ca`
- Treat as transitional or legacy linkage only where current local docs mention it
- Do not treat it as the primary umbrella domain going forward

## 5. Ownership Boundaries To Preserve

### Brand boundary
- Unalabs should explain and unify products
- Product brands should keep their own identities and domains where useful

### Repo boundary
- Shared code belongs in `PACKAGES/`
- Product code belongs in `APPS/`
- Cross-cutting structure and policy documentation belongs in `DOCS/`

### Deployment boundary
- Each product should have explicit frontend and API ownership where relevant
- Extension surfaces should depend on product APIs rather than silently becoming their own infrastructure stack

### Domain boundary
- Umbrella brand domain should explain the portfolio
- Product domains should serve product experiences directly
- API subdomains should remain operational, not marketing-facing

## 6. Recommended Operating Rule

When evaluating a new initiative, decide ownership in this order:
1. Is it a brand surface, product surface, platform capability, or deploy component?
2. Does it belong under Unalabs umbrella narrative or as a direct product brand?
3. Does it require its own domain, or can it live under an existing umbrella/product domain?
4. Does it need its own runtime, or should it attach to an existing product API?

## 7. Assumptions and Limits

- This map only documents ownership visible from local repo evidence and existing docs.
- It does not invent hidden vendors, domains, or runtime contracts.
- It does not lock future branding permanently; it establishes a sane current operating model.
