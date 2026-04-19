# UNA LABS LIGHT REBRAND — DEVELOPER HANDOVER
## Complete Technical Specification

**Phase 1:** Website Light Rebrand (6 weeks)
**Framework:** Next.js 14 + React 18 + TypeScript + Tailwind CSS
**Deployment:** Vercel (recommended) or Cloudflare Pages
**Status:** READY FOR BUILD

---

## TABLE OF CONTENTS

1. Tech Stack & Setup
2. Design System (Light Palette)
3. Project Structure
4. Component Specifications
5. Page Specifications
6. Copy Guidelines
7. Responsive Design Requirements
8. Accessibility Requirements
9. Performance Targets
10. Deployment Checklist

---

## SECTION 1: TECH STACK & SETUP

### Core Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | No Pages Router |
| Language | TypeScript (strict) | All components typed |
| Styling | Tailwind CSS 3.x | Custom config, no inline styles |
| UI Components | Custom React components | No shadcn/ui, no MUI |
| Forms | React Hook Form (if complex) or native | Minimize dependencies |
| Analytics | Google Analytics 4 (gtag.js) | Via Next.js Script tag |
| Deployment | Vercel | Auto-scales, zero-config |
| Package Manager | npm or pnpm | Either works |

### Bootstrap Commands

```bash
# Create project
npx create-next-app@latest una-labs-site \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd una-labs-site

# Install minimal additional dependencies
npm install react-hook-form        # Only if contact/signup forms needed
npm install -D @types/node

# Confirm Tailwind installed (should be auto-installed)
npx tailwindcss --version
```

### Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://unalabs.cloud

# .env.example (commit this)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SITE_URL=
```

---

## SECTION 2: DESIGN SYSTEM — LIGHT PALETTE

### CSS Variables (globals.css)

```css
/* app/globals.css */
:root {
  /* Brand Colors */
  --color-brand-teal: #4DB8A8;
  --color-brand-orange: #FF3D00;
  --color-brand-teal-light: #E6F7F5;
  --color-brand-orange-light: #FFF0EC;

  /* Backgrounds */
  --color-bg-white: #FFFFFF;
  --color-bg-offwhite: #F8FAFB;
  --color-bg-subtle: #F5F7FA;
  --color-bg-hover: #F0F2F5;

  /* Text */
  --color-text-heading: #0B0E11;
  --color-text-body: #3D424B;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-text-disabled: #D1D5DB;

  /* Borders */
  --color-border: #E5E7EB;
  --color-border-hover: #D1D5DB;
  --color-border-focus: #4DB8A8;

  /* Status */
  --color-error: #DC2626;
  --color-success: #059669;
  --color-warning: #D97706;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.10);
  --shadow-xl: 0 20px 48px rgba(0, 0, 0, 0.12);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Spacing (8px base) */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-8: 64px;
  --space-10: 80px;
  --space-12: 96px;
}
```

### Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#4DB8A8',
          'teal-light': '#E6F7F5',
          orange: '#FF3D00',
          'orange-light': '#FFF0EC',
          'orange-hover': '#E63500',
        },
        bg: {
          white: '#FFFFFF',
          offwhite: '#F8FAFB',
          subtle: '#F5F7FA',
          hover: '#F0F2F5',
        },
        tx: {
          heading: '#0B0E11',
          body: '#3D424B',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          hover: '#D1D5DB',
          focus: '#4DB8A8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['64px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display': ['48px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-sm': ['40px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.7', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'eyebrow': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
        '26': '104px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.04)',
        'sm': '0 2px 8px rgba(0,0,0,0.06)',
        'md': '0 4px 16px rgba(0,0,0,0.08)',
        'lg': '0 8px 32px rgba(0,0,0,0.10)',
        'xl': '0 20px 48px rgba(0,0,0,0.12)',
        'teal': '0 4px 16px rgba(77,184,168,0.25)',
        'orange': '0 4px 16px rgba(255,61,0,0.25)',
      },
      maxWidth: {
        'content': '1180px',
        'narrow': '720px',
        'tight': '540px',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Typography — Font Loading

```tsx
// app/layout.tsx
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

// Apply both: className={`${inter.variable} ${plusJakarta.variable}`}
```

---

## SECTION 3: PROJECT STRUCTURE

```
una-labs-site/
├── app/
│   ├── globals.css                        # CSS variables + base reset
│   ├── layout.tsx                         # Root: fonts, Header, Footer
│   ├── page.tsx                           # Homepage
│   ├── how-it-works/
│   │   └── page.tsx
│   ├── pricing/
│   │   └── page.tsx
│   ├── product/
│   │   ├── intake-scoping/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── client-portal/page.tsx
│   │   ├── reporting/page.tsx
│   │   └── approval-sign-off/page.tsx
│   └── api/
│       └── contact/route.ts               # If contact form needs API
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx                     # Sticky nav
│   │   └── Footer.tsx                     # Footer with links
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── FeatureCarousel.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── ProblemSolutionSection.tsx     # Reusable, prop-driven
│   │   ├── TestimonialsCarousel.tsx
│   │   ├── IndustryGrid.tsx
│   │   ├── FeaturedArticles.tsx
│   │   └── FinalCTASection.tsx
│   └── ui/
│       ├── Button.tsx                     # Primary / secondary / text variants
│       ├── Badge.tsx                      # Eyebrow tags
│       ├── Card.tsx                       # Reusable card wrapper
│       ├── FeatureCard.tsx
│       ├── MetricCard.tsx
│       └── WaveShape.tsx                  # Decorative SVG wave
│
├── lib/
│   ├── constants.ts                       # All copy, nav data, feature data
│   ├── types.ts                           # TypeScript interfaces
│   └── utils.ts                           # cn() class merge helper
│
├── public/
│   ├── images/
│   │   ├── mockups/                       # Product mockup PNGs
│   │   ├── logos/                         # Customer logos
│   │   └── og/                            # OG images
│   └── icons/                             # SVG icons
│
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## SECTION 4: COMPONENT SPECIFICATIONS

### 4.1 Button Component

```tsx
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-orange text-white rounded-lg hover:bg-brand-orange-hover shadow-orange active:scale-[0.98]',
        secondary:
          'border-2 border-brand-teal text-brand-teal bg-transparent rounded-lg hover:bg-brand-teal-light active:scale-[0.98]',
        ghost:
          'text-brand-teal hover:underline underline-offset-2',
        dark:
          'bg-tx-heading text-white rounded-lg hover:bg-tx-body active:scale-[0.98]',
      },
      size: {
        sm: 'px-4 py-2 text-body-sm',
        md: 'px-6 py-3 text-body',
        lg: 'px-8 py-4 text-body-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  href?: string;
  external?: boolean;
}

export function Button({ variant, size, href, external, className, children, ...props }: ButtonProps) {
  const classes = buttonVariants({ variant, size, className });

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
```

**Note:** `cva` requires `npm install class-variance-authority`. Alternative: just use conditional Tailwind classes if you want to avoid the dependency.

---

### 4.2 Header Component

```tsx
// components/layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { NAV } from '@/lib/constants';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
        scrolled ? 'shadow-sm border-b border-border' : ''
      }`}
    >
      <div className="max-w-content mx-auto px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-tx-heading">
          Una Labs
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {NAV.main.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  className="px-4 py-2 text-body text-tx-body hover:text-tx-heading rounded-md hover:bg-bg-subtle transition-colors"
                  onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                  aria-expanded={activeDropdown === item.label}
                >
                  {item.label} ▾
                </button>
                {activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg p-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-3 rounded-md hover:bg-bg-subtle"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="block text-body font-medium text-tx-heading">{child.label}</span>
                        {child.description && (
                          <span className="block text-body-sm text-tx-secondary mt-0.5">{child.description}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className="px-4 py-2 text-body text-tx-body hover:text-tx-heading rounded-md hover:bg-bg-subtle transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="text-body text-tx-secondary hover:text-tx-heading transition-colors">
            Login
          </Link>
          <Button href="/start" variant="primary" size="sm">
            Start Free Trial
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden p-2 text-tx-body"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white" role="dialog" aria-label="Mobile navigation">
          <div className="px-6 py-4 flex flex-col gap-2">
            {NAV.main.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <p className="px-3 py-2 text-eyebrow uppercase text-tx-muted">{item.label}</p>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-body text-tx-body hover:text-tx-heading"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link
                    href={item.href!}
                    className="block px-3 py-2 text-body text-tx-body hover:text-tx-heading"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <Button href="/start" variant="primary" size="md" className="w-full">
                Start Free Trial
              </Button>
              <Link href="/login" className="text-center text-body text-tx-secondary">
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
```

---

### 4.3 Hero Section Component

```tsx
// components/sections/HeroSection.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

interface TrustLogo {
  src: string;
  alt: string;
  width: number;
}

interface HeroSectionProps {
  eyebrow?: string;
  headline: string;
  accentPhrase?: string;       // Phrase inside headline to color orange
  subheadline: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  frictionNote?: string;
  trustLogos?: TrustLogo[];
}

export function HeroSection({
  eyebrow,
  headline,
  accentPhrase,
  subheadline,
  ctaPrimaryLabel,
  ctaPrimaryHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  frictionNote = 'No credit card required. 14 days free.',
  trustLogos,
}: HeroSectionProps) {
  const renderHeadline = () => {
    if (!accentPhrase || !headline.includes(accentPhrase)) {
      return <h1 className="text-display text-tx-heading">{headline}</h1>;
    }
    const parts = headline.split(accentPhrase);
    return (
      <h1 className="text-display text-tx-heading">
        {parts[0]}
        <span className="text-brand-orange">{accentPhrase}</span>
        {parts[1]}
      </h1>
    );
  };

  return (
    <section className="bg-bg-white pt-16 pb-24 overflow-hidden">
      <div className="max-w-content mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <div className="max-w-xl">
            {eyebrow && (
              <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">
                {eyebrow}
              </p>
            )}

            {renderHeadline()}

            <p className="mt-6 text-body-lg text-tx-secondary leading-relaxed">
              {subheadline}
            </p>

            {/* Trust Logos */}
            {trustLogos && (
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                {trustLogos.map((logo) => (
                  <Image
                    key={logo.alt}
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={32}
                    className="opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                  />
                ))}
              </div>
            )}

            {/* CTA Block */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href={ctaPrimaryHref} variant="primary" size="lg">
                {ctaPrimaryLabel}
              </Button>
              <Button href={ctaSecondaryHref} variant="ghost" size="lg">
                {ctaSecondaryLabel} →
              </Button>
            </div>

            {frictionNote && (
              <p className="mt-3 text-caption text-tx-muted">{frictionNote}</p>
            )}
          </div>

          {/* Right: Visual */}
          <div className="relative hidden lg:block">
            {/* Organic wave background */}
            <div
              className="absolute inset-0 -right-16 top-[-10%]"
              aria-hidden="true"
            >
              <div
                className="w-full h-full bg-brand-teal opacity-10 rounded-[60%_40%_70%_30%/50%_60%_40%_50%]"
              />
            </div>

            {/* Mockup stack */}
            <div className="relative flex flex-col gap-4 pl-8">
              {[
                { label: 'Intake Form', bg: 'bg-bg-subtle' },
                { label: 'Proposal', bg: 'bg-brand-teal-light' },
                { label: 'Delivery Report', bg: 'bg-brand-orange-light' },
              ].map((card, i) => (
                <div
                  key={card.label}
                  className={`${card.bg} rounded-xl p-6 shadow-md border border-border`}
                  style={{ transform: `translateX(${i * 12}px)` }}
                >
                  <div className="w-full h-24 bg-bg-hover rounded-md animate-pulse" aria-hidden="true" />
                  <p className="mt-3 text-body-sm font-medium text-tx-secondary">{card.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
```

---

### 4.4 Feature Carousel Component

```tsx
// components/sections/FeatureCarousel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { FEATURES } from '@/lib/constants';

export function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % FEATURES.length);
    }, 4500);
  };

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const goTo = (idx: number) => {
    setActive(idx);
    startInterval(); // Reset timer on manual navigation
  };

  return (
    <section className="bg-bg-offwhite py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-3">
            What gets handled
          </p>
          <h2 className="text-h2 text-tx-heading">
            From rough request to paid delivery — all of it.
          </h2>
        </div>

        {/* Card Grid — show all, highlight active */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <button
              key={feature.id}
              onClick={() => goTo(i)}
              aria-pressed={i === active}
              className={`text-left p-6 rounded-xl border transition-all duration-200 ${
                i === active
                  ? 'border-brand-teal bg-white shadow-teal shadow-md'
                  : 'border-border bg-white hover:border-border-hover hover:shadow-sm'
              }`}
            >
              <span className="text-3xl block mb-3" aria-hidden="true">
                {feature.icon}
              </span>
              <strong className="block text-h4 text-tx-heading mb-1">
                {feature.label}
              </strong>
              <p className="text-body-sm text-tx-secondary leading-snug">
                {feature.benefit}
              </p>
            </button>
          ))}
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Feature selection">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Feature ${i + 1}`}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === active ? 'bg-brand-teal w-6' : 'bg-border hover:bg-border-hover'
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
```

---

### 4.5 Social Proof Section

```tsx
// components/sections/SocialProofSection.tsx
import { PROOF_METRICS, TESTIMONIALS } from '@/lib/constants';

export function SocialProofSection() {
  return (
    <section className="bg-bg-subtle py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-3">
            Trusted outcomes
          </p>
          <h2 className="text-h2 text-tx-heading">Results teams can show their clients</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {PROOF_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="bg-white border border-border rounded-xl p-8 shadow-sm"
            >
              <span className="block text-5xl font-bold text-brand-orange leading-none">
                {metric.value}
              </span>
              <strong className="block mt-3 text-h4 text-tx-heading">{metric.label}</strong>
              <p className="mt-1 text-body-sm text-tx-secondary">{metric.note}</p>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="max-w-narrow mx-auto">
          <blockquote className="bg-white border-l-4 border-brand-teal rounded-xl p-8 shadow-md">
            <p className="text-body-lg text-tx-body italic leading-relaxed">
              "{TESTIMONIALS[0].quote}"
            </p>
            <footer className="mt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-bg-subtle flex-shrink-0" aria-hidden="true" />
              <div>
                <strong className="block text-body text-tx-heading">{TESTIMONIALS[0].author}</strong>
                <span className="text-body-sm text-tx-secondary">
                  {TESTIMONIALS[0].title}, {TESTIMONIALS[0].company}
                </span>
              </div>
            </footer>
          </blockquote>
        </div>

      </div>
    </section>
  );
}
```

---

### 4.6 Problem-Solution Section (Reusable)

```tsx
// components/sections/ProblemSolutionSection.tsx
import Link from 'next/link';

interface ProblemSolutionProps {
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  imagePosition: 'left' | 'right';
  imagePlaceholderLabel?: string;
  background?: 'white' | 'subtle';
}

export function ProblemSolutionSection({
  eyebrow,
  headline,
  body,
  bullets,
  ctaLabel,
  ctaHref,
  imagePosition,
  imagePlaceholderLabel = 'Product view',
  background = 'white',
}: ProblemSolutionProps) {
  const bgClass = background === 'subtle' ? 'bg-bg-subtle' : 'bg-white';

  const textCol = (
    <div className="flex flex-col justify-center">
      <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">{eyebrow}</p>
      <h2 className="text-h2 text-tx-heading mb-4">{headline}</h2>
      <p className="text-body-lg text-tx-secondary leading-relaxed mb-6">{body}</p>
      <ul className="flex flex-col gap-3 mb-8">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span className="text-brand-teal font-bold mt-0.5 flex-shrink-0">✓</span>
            <span className="text-body text-tx-body">{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 text-brand-teal font-semibold hover:underline underline-offset-2"
      >
        {ctaLabel} →
      </Link>
    </div>
  );

  const imageCol = (
    <div className="rounded-2xl overflow-hidden shadow-lg bg-bg-subtle aspect-[4/3] flex items-center justify-center">
      <span className="text-body-sm text-tx-muted">{imagePlaceholderLabel}</span>
      {/* Replace with: <Image src={...} alt={...} fill className="object-cover" /> */}
    </div>
  );

  return (
    <section className={`${bgClass} py-20`}>
      <div className="max-w-content mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {imagePosition === 'left' ? (
            <>
              {imageCol}
              {textCol}
            </>
          ) : (
            <>
              {textCol}
              {imageCol}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
```

---

### 4.7 Industry Grid

```tsx
// components/sections/IndustryGrid.tsx
import Link from 'next/link';
import { INDUSTRIES } from '@/lib/constants';

export function IndustryGrid() {
  return (
    <section className="bg-bg-offwhite py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-3">
            Built for your work
          </p>
          <h2 className="text-h2 text-tx-heading">Una Labs works for your team</h2>
          <p className="mt-4 text-body-lg text-tx-secondary max-w-narrow mx-auto">
            Whether you're a consulting firm, a digital agency, or an accounting practice,
            the platform adapts to how you deliver.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={industry.href}
              className="group bg-white border border-border rounded-xl p-8 hover:border-border-hover hover:shadow-md transition-all duration-200"
            >
              <span className="text-4xl block mb-4" aria-hidden="true">{industry.icon}</span>
              <h3 className="text-h4 text-tx-heading mb-2 group-hover:text-brand-teal transition-colors">
                {industry.title}
              </h3>
              <p className="text-body-sm text-tx-secondary leading-relaxed mb-4">
                {industry.description}
              </p>
              <span className="text-body-sm font-semibold text-brand-teal">
                Learn more →
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
```

---

### 4.8 Final CTA Section

```tsx
// components/sections/FinalCTASection.tsx
import { Button } from '@/components/ui/Button';

export function FinalCTASection() {
  return (
    <section className="bg-brand-teal-light py-24">
      <div className="max-w-content mx-auto px-6 text-center">

        <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">
          Start here
        </p>
        <h2 className="text-display-sm text-tx-heading mb-6 max-w-tight mx-auto">
          Deliver with confidence, starting today
        </h2>
        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          Submit a request. Get a scoped brief. Agree on terms. Deliver with proof.
          No retainers, no ambiguity.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">
            Start Free Trial
          </Button>
          <Button href="/how-it-works" variant="secondary" size="lg">
            See How It Works
          </Button>
          <Button href="/pricing" variant="ghost" size="lg">
            View Pricing
          </Button>
        </div>

        <p className="mt-6 text-caption text-tx-muted">
          No credit card required. No account needed to get a scope.
        </p>

      </div>
    </section>
  );
}
```

---

### 4.9 Footer Component

```tsx
// components/layout/Footer.tsx
import Link from 'next/link';
import { FOOTER_LINKS } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="bg-bg-subtle border-t border-border">
      <div className="max-w-content mx-auto px-6 py-16">

        {/* Newsletter */}
        <div className="mb-12 pb-12 border-b border-border">
          <div className="max-w-md">
            <h3 className="text-h4 text-tx-heading mb-2">Stay in the loop</h3>
            <p className="text-body-sm text-tx-secondary mb-4">
              Product updates, delivery insights, and professional service tips.
            </p>
            <form className="flex gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 px-4 py-2 text-body border border-border rounded-lg focus:outline-none focus:border-border-focus"
                required
              />
              <button
                type="submit"
                className="px-5 py-2 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Link Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading}>
              <p className="text-eyebrow uppercase text-tx-muted tracking-widest mb-4">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-tx-secondary hover:text-brand-teal transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border">
          <p className="text-caption text-tx-muted">
            © {new Date().getFullYear()} Una Labs. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-caption text-tx-muted hover:text-tx-secondary">Privacy</Link>
            <Link href="/terms" className="text-caption text-tx-muted hover:text-tx-secondary">Terms</Link>
            <Link href="/contact" className="text-caption text-tx-muted hover:text-tx-secondary">Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
```

---

## SECTION 5: DATA CONSTANTS (lib/constants.ts)

```typescript
// lib/constants.ts

export const NAV = {
  main: [
    {
      label: 'Product',
      children: [
        { label: 'Platform Overview', href: '/product', description: 'See the full Una Labs system' },
        { label: 'Intake & Scoping', href: '/product/intake-scoping', description: 'Turn rough requests into structured briefs' },
        { label: 'Real-Time Dashboard', href: '/product/dashboard', description: 'See every project at a glance' },
        { label: 'Client Portal', href: '/product/client-portal', description: 'Give clients a window into progress' },
        { label: 'Automated Reporting', href: '/product/reporting', description: 'Impact reports, generated automatically' },
        { label: 'Approval & Sign-Off', href: '/product/approval-sign-off', description: 'Formalize delivery completion' },
      ],
    },
    {
      label: 'Solutions',
      children: [
        { label: 'For Professional Services', href: '/solutions/professional-services', description: 'Consulting and advisory firms' },
        { label: 'For Digital Agencies', href: '/solutions/agencies', description: 'Creative and digital studios' },
        { label: 'For SaaS Product Teams', href: '/solutions/saas', description: 'Early-stage and scaling teams' },
        { label: 'For Accounting & Tax', href: '/solutions/accounting', description: 'Accounting and bookkeeping firms' },
      ],
    },
    {
      label: 'Resources',
      children: [
        { label: 'Blog', href: '/blog', description: undefined },
        { label: 'Help Center', href: '/help', description: undefined },
        { label: 'Community', href: '/community', description: undefined },
      ],
    },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/how-it-works' },
  ],
};

export const FEATURES = [
  { id: 1, icon: '📋', label: 'Intake & Scoping', benefit: 'Turn rough requests into structured briefs in 48 hours.' },
  { id: 2, icon: '📊', label: 'Real-Time Dashboard', benefit: 'Every project visible — status, gates, timeline, risks.' },
  { id: 3, icon: '📄', label: 'Proposals & Pricing', benefit: 'One clear offer. No negotiation theatre.' },
  { id: 4, icon: '✅', label: 'Approval Gates', benefit: 'Client signs off before money or work moves forward.' },
  { id: 5, icon: '💳', label: 'Payments', benefit: 'Deposit collected upfront via Stripe. No chasing invoices.' },
  { id: 6, icon: '🔗', label: 'Delivery Proof', benefit: 'Every output documented. Handoff-ready from day one.' },
  { id: 7, icon: '🤖', label: 'AI Automation', benefit: 'Intake, brief generation, and notifications automated.' },
  { id: 8, icon: '📈', label: 'Reporting', benefit: 'Impact documented. Reusable across every engagement.' },
];

export const PROOF_METRICS = [
  { value: '48h', label: 'Average first response', note: 'From rough request to structured brief' },
  { value: '4.8', label: 'Client satisfaction average', note: 'Across all active engagements' },
  { value: '100%', label: 'Delivery documented', note: 'Every output handoff-ready from day one' },
];

export const TESTIMONIALS = [
  {
    quote: 'Una Labs took a half-baked idea and turned it into a scoped proposal within two days. Paid a deposit. Work started. No ambiguity.',
    author: 'Sarah Chen',
    title: 'Project Director',
    company: 'Meridian Consulting',
    rating: 5,
  },
  // Add more testimonials here
];

export const INDUSTRIES = [
  {
    icon: '🏢',
    title: 'Professional Services',
    description: 'Consulting, strategy, and advisory firms that need scoped, documented delivery without hiring a PM.',
    href: '/solutions/professional-services',
    slug: 'professional-services',
  },
  {
    icon: '🎨',
    title: 'Digital Agencies',
    description: 'Studios and agencies that need structured client intake and delivery proof without the overhead.',
    href: '/solutions/agencies',
    slug: 'agencies',
  },
  {
    icon: '⚙️',
    title: 'SaaS Product Teams',
    description: 'Early-stage teams that need AI and automation delivered fast without retaining a full agency.',
    href: '/solutions/saas',
    slug: 'saas',
  },
  {
    icon: '📊',
    title: 'Accounting & Tax',
    description: 'Firms that need client-facing tools, intake automation, and operational systems that work.',
    href: '/solutions/accounting',
    slug: 'accounting',
  },
  {
    icon: '⚖️',
    title: 'Law Firms',
    description: 'Legal practices that need document automation, intake systems, and professional delivery.',
    href: '/solutions/law',
    slug: 'law',
  },
  {
    icon: '🚀',
    title: 'Founders & Operators',
    description: 'Solo operators who need real deliverables with minimal back-and-forth and clear outcomes.',
    href: '/solutions/founders',
    slug: 'founders',
  },
];

export const PROBLEM_SOLUTIONS = [
  {
    eyebrow: 'The visibility problem',
    headline: 'Clients need to see progress — not just results',
    body: 'When clients lack visibility into project progress, they get anxious. They send update emails. They interrupt the team. They doubt the timeline. Real-time visibility builds trust and reduces the cost of communication.',
    bullets: [
      'Real-time progress tracking visible to clients',
      'Automated milestone notifications',
      'Shared dashboard view — no login required for clients',
      'No more "where's my project?" emails',
    ],
    ctaLabel: 'See dashboard in action',
    ctaHref: '/product/dashboard',
  },
  {
    eyebrow: 'The reporting problem',
    headline: 'Reporting shouldn\'t take weeks to assemble',
    body: 'Manual report assembly consumes hours that should go to delivery. Clients want impact quantified. Automated insights cut reporting time while making every engagement look more professional.',
    bullets: [
      'Auto-generated from project data — no copy-paste',
      'Customizable metrics and KPIs per client',
      'Client-branded PDF or portal delivery',
      'Trend analysis across engagements',
    ],
    ctaLabel: 'Explore reporting',
    ctaHref: '/product/reporting',
  },
  {
    eyebrow: 'The handoff problem',
    headline: 'Delivery without proof isn\'t done',
    body: 'Work isn\'t done until it\'s documented. Every Una Labs engagement ends with handoff-ready output — access details, evidence, and a completion record — so clients have something durable.',
    bullets: [
      'Structured sign-off workflow with client approval',
      'Timestamped completion and approval records',
      'Reusable delivery documentation templates',
      'Handoff package ready for every engagement',
    ],
    ctaLabel: 'See how sign-off works',
    ctaHref: '/product/approval-sign-off',
  },
];

export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Intake & Scoping', href: '/product/intake-scoping' },
      { label: 'Dashboard', href: '/product/dashboard' },
      { label: 'Client Portal', href: '/product/client-portal' },
      { label: 'Reporting', href: '/product/reporting' },
      { label: 'Approval & Sign-Off', href: '/product/approval-sign-off' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Professional Services', href: '/solutions/professional-services' },
      { label: 'Digital Agencies', href: '/solutions/agencies' },
      { label: 'SaaS Teams', href: '/solutions/saas' },
      { label: 'Accounting & Tax', href: '/solutions/accounting' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Blog', href: '/blog' },
      { label: 'Help Center', href: '/help' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];
```

---

## SECTION 6: PAGE SPECIFICATIONS

### 6.1 Homepage (app/page.tsx)

```tsx
// app/page.tsx
import { HeroSection } from '@/components/sections/HeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { SocialProofSection } from '@/components/sections/SocialProofSection';
import { ProblemSolutionSection } from '@/components/sections/ProblemSolutionSection';
import { IndustryGrid } from '@/components/sections/IndustryGrid';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { PROBLEM_SOLUTIONS } from '@/lib/constants';

export const metadata = {
  title: 'Una Labs — The Professional Service Platform',
  description: 'Structured intake, clear proposals, governed delivery, and measurable proof. The platform built for teams who deliver with confidence.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection
        eyebrow="Una Labs"
        headline="Deliver project insights into business value"
        accentPhrase="business value"
        subheadline="Structured intake, scoped proposals, governed delivery, and measurable proof. Everything your team needs to deliver with confidence."
        ctaPrimaryLabel="Start Free Trial"
        ctaPrimaryHref="/start"
        ctaSecondaryLabel="Watch a Demo"
        ctaSecondaryHref="/demo"
        frictionNote="No credit card required. 14 days free."
      />

      <FeatureCarousel />

      <SocialProofSection />

      {PROBLEM_SOLUTIONS.map((ps, i) => (
        <ProblemSolutionSection
          key={ps.headline}
          {...ps}
          imagePosition={i % 2 === 0 ? 'right' : 'left'}
          background={i % 2 === 0 ? 'white' : 'subtle'}
        />
      ))}

      <IndustryGrid />

      <FinalCTASection />
    </>
  );
}
```

### 6.2 Pricing Page (app/pricing/page.tsx)

Structure:
1. Small hero: "The perfect plan for your business" + Monthly/Annual toggle
2. 4 pricing cards (Starter, Professional [recommended], Agency, Enterprise)
3. Add-ons section below cards
4. FAQ accordion (5–6 questions)
5. Final CTA

Pricing data (in `lib/constants.ts`):
```typescript
export const PRICING_TIERS = [
  {
    name: 'Starter',
    monthlyPrice: 49,
    description: 'For freelancers and solo practitioners',
    features: ['1 user', 'Up to 3 active projects', 'Intake forms', 'Basic proposals', 'Email support'],
    recommended: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    monthlyPrice: 99,
    description: 'For growing teams that deliver regularly',
    features: ['5 users', 'Unlimited projects', 'Full proposal suite', 'Payment collection', 'Dashboard & reporting', 'Priority support'],
    recommended: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Agency',
    monthlyPrice: 249,
    description: 'For agencies with multiple clients and teams',
    features: ['20 users', 'Unlimited projects', 'Client portal', 'White-label reports', 'Workflow automation', 'Dedicated support'],
    recommended: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 499,
    description: 'For large organizations with complex needs',
    features: ['Unlimited users', 'Custom integrations', 'SLA guarantee', 'Custom contracts', 'Onboarding support', 'Account manager'],
    recommended: false,
    cta: 'Contact Sales',
  },
];
```

### 6.3 How It Works (app/how-it-works/page.tsx)

Structure:
1. Hero: "See how Una Labs works" + role tab filter
2. 4-step flow diagram (Request → Scope → Proposal → Delivery)
3. 9 feature detail cards (3×3 grid)
4. FAQ (5 skeptic questions)
5. Final CTA

### 6.4 Product Landing Pages (app/product/[slug]/page.tsx)

Each page follows this template:
1. Hero (feature headline + proof stack + CTA)
2. Problem statement + solution overview
3. 3–4 key feature callouts (icons + descriptions)
4. One customer testimonial
5. Final CTA back to trial

---

## SECTION 7: COPY RULES FOR THE DEVELOPER

**Rule 1 — Outcomes before features**
Wrong: "Real-time analytics dashboard"
Right: "See your project progress the moment it changes"

**Rule 2 — No "we" in headlines**
Wrong: "We help you deliver better"
Right: "Deliver with confidence, starting today"

**Rule 3 — Numbers in proof**
Wrong: "Faster delivery for clients"
Right: "48h average from rough request to structured brief"

**Rule 4 — Friction killer on every CTA**
Every primary button must be followed by: "No credit card required" or "No account needed"

**Rule 5 — Zero ATEAM mentions**
Never render "ATEAM" on any customer-facing page. Use "Una Labs" everywhere.

**Rule 6 — Avoid these words**
- "Solution" (too generic)
- "Platform" (use only if contextually earned)
- "Ecosystem" (enterprise bloat)
- "Leverage" (corporate speak)
- "Streamline" (meaningless)

---

## SECTION 8: RESPONSIVE DESIGN

| Breakpoint | Width | Layout changes |
|-----------|-------|----------------|
| Mobile | 320px+ | Single column, stacked sections, full-width buttons |
| Tablet | 768px+ | 2-column grids, show nav links, collapse some visuals |
| Desktop | 1024px+ | Full layout, all columns visible |
| Wide | 1440px+ | Max-width container kicks in, no changes |

**Touch targets:** All interactive elements ≥ 48px in height on mobile

**Mobile-first Tailwind approach:**
```tsx
// Mobile first: no prefix = mobile, then md:, lg:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## SECTION 9: ACCESSIBILITY REQUIREMENTS

- Semantic HTML: `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`
- All images: `alt` text (decorative = `alt=""` + `aria-hidden="true"`)
- Form inputs: visible `<label>` elements, not just placeholder text
- Color contrast: ≥ 4.5:1 (normal text), ≥ 3:1 (large text) — verify with WebAIM checker
- Focus states: Visible on all interactive elements (`focus-visible:ring-2`)
- Keyboard navigation: Tab through all interactive elements in logical order
- ARIA labels on icon-only buttons and carousel controls
- Skip-to-content link at top of page

---

## SECTION 10: PERFORMANCE TARGETS & DEPLOYMENT

### Performance Targets (Lighthouse)

| Metric | Target |
|--------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 90 |
| SEO | ≥ 90 |
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |

### Image Optimization Checklist

- All `<img>` uses Next.js `<Image />` component
- Hero images: `priority` prop (preloads above fold)
- Below-fold images: default lazy loading
- Formats: WebP with PNG/JPG fallback
- `sizes` prop set correctly for responsive images

### Deployment — Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set env variables
vercel env add NEXT_PUBLIC_GA_ID
vercel env add NEXT_PUBLIC_SITE_URL
```

### Cloudflare Pages (Alternative)

**Important:** Every `page.tsx` that uses server features must include:
```typescript
export const runtime = 'edge';
```

### Pre-Launch QA Checklist

- [ ] All internal links resolve (no 404s)
- [ ] "ATEAM" appears zero times in any rendered page source
- [ ] All CTA buttons link to correct targets
- [ ] Mobile nav opens and closes correctly
- [ ] Carousel auto-rotates and manual controls work
- [ ] Contact/signup form submits without errors
- [ ] 301 redirects from old site routes configured
- [ ] `robots.txt` and `sitemap.xml` present
- [ ] OG images set for all pages (social preview)
- [ ] Google Analytics tracking verified
- [ ] Sentry error tracking configured
- [ ] Lighthouse ≥ 90 on all main pages

---

*Version 1.0 | April 2026 | Una Labs Light Rebrand | Phase 1 Developer Handover*
