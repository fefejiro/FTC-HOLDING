# Code Citations

## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```


## License: unknown
https://github.com/gazjosef/toolbox/blob/9b960a9d696f25fec0c5e629a52ae6f60ff17035/frontend/boilerplate/sunderland-accounting/components/Layout/Navbar.tsx

```
I'll upgrade the FTC site to a premium executive aesthetic, integrate the brand logo, and ensure all quality gates pass.

Let me start by assessing the current state and then systematically implement the upgrades.

```powershell
cd 'C:\Users\mikef\FTC Website\ftc-site'
Get-ChildItem -Recurse app/ -Filter "*.tsx" | Select-Object FullName
```

Now I'll implement all the upgrades:

### 1. Update styles/globals.css with refined design system

````css
/* filepath: styles/globals.css */
:root {
  --color-navy-dark: #0f1419;
  --color-navy-medium: #1a202c;
  --color-charcoal: #2d3748;
  --color-gray-muted: #718096;
  --color-gray-light: #edf2f7;
  --color-white: #ffffff;
  --color-gold-accent: #d4a574;
  --color-gold-light: #e8c9a0;
  
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-section-desktop: 5rem;
  --spacing-section-mobile: 3rem;
  
  --max-width-container: 1200px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-navy-dark);
  color: var(--color-gray-light);
  line-height: 1.6;
  font-size: 16px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-white);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
}

h3 {
  font-size: 1.75rem;
  font-weight: 600;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-light);
  line-height: 1.8;
}

a {
  color: var(--color-gold-accent);
  text-decoration: none;
  transition: var(--transition-smooth);
}

a:hover, a:focus {
  color: var(--color-gold-light);
  outline: none;
}

.container {
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.section {
  padding: var(--spacing-section-desktop) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section:last-of-type {
  border-bottom: none;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-navy-dark);
  color: var(--color-gold-accent);
  border: 2px solid var(--color-gold-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
}

.btn:hover, .btn:focus {
  background-color: var(--color-gold-accent);
  color: var(--color-navy-dark);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-gray-muted);
  color: var(--color-gray-light);
}

.btn-secondary:hover, .btn-secondary:focus {
  border-color: var(--color-gold-accent);
  color: var(--color-gold-accent);
}

/* Card styles */
.card {
  background-color: var(--color-navy-medium);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: var(--spacing-xl);
  transition: var(--transition-smooth);
}

.card:hover {
  border-color: var(--color-gold-accent);
  background-color: rgba(212, 165, 116, 0.05);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--spacing-lg);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* Utility */
.text-muted {
  color: var(--color-gray-muted);
}

.text-center {
  text-align: center;
}

.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  
  .section {
    padding: var(--spacing-section-mobile) 0;
  }
  
  .grid-2, .grid-3 {
    grid-template-columns: 1fr;
  }
}
````

### 2. Create Logo component

````tsx
// filepath: app/components/Logo.tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <Image
          src="/brand/ftc-logo.png"
          alt="Fejiro Technology Consultancy Inc."
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
}
````

### 3. Update Header component

````tsx
// filepath: app/components/Header.tsx
'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-navy-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none' }}>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold-accent)',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{
            background: 'var(--color-navy-medium)',
            padding: '1.5rem',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none' }}>
            <li><Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link></li>
            <li><Link href="/services" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li><Link href="/case-studies" onClick={() => setMobileMenuOpen(false)}>Case Studies</Link></li>
            <li><Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }} />
            <li><a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a></li>
            <li><a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a></li>
          </ul>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
          header button { display: none !important; }
        }
      `}</style>
    </header>
  );
}
````

### 4. Create/Update Hero component

````tsx
// filepath: app/components/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section style={{ background: 'linear-gradient(135deg, var(--color-navy-dark) 0%, var(--color-navy-medium) 100%)', padding: '5rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Text */}
          <div>
            <h1>From Manual Complexity to Intelligent Systems</h1>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
              Fejiro Technology Consultancy Inc. helps enterprises modernise operational
              ecosystems through enterprise systems integration, intelligent automation, and
              applied artificial intelligence, with governance and long-term scalability
              built in.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Link href="/contact" className="btn">
                Schedule Consultation
              </Link>
              <Link href="/services" className="btn btn-secondary">
                View Services
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(212, 165, 116, 0.05) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 116, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>↗️</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
````

### 5. Create OverviewCards component

````tsx
// filepath: app/components/OverviewCards.tsx
import Link from 'next/link';

export default function OverviewCards() {
  const pillars = [
    {
      title: 'Enterprise Systems & Infrastructure Consulting',
      description: 'Systems integration, infrastructure advisory and operational modernisation.',
      href: '/services/enterprise-systems-infrastructure',
    },
    {
      title: 'Intelligent Systems & Automation Engineering',
      description: 'Automation design, operational dashboards and workflow orchestration.',
      href: '/services/intelligent-systems-automation',
    },
    {
      title: 'Product & Technical Architecture Advisory',
      description: 'MVP architecture, API strategy and technical roadmap planning.',
      href: '/services/product-technical-architecture',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Our Service Pillars</h2>
        <div className="grid grid-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>{pillar.title}</h3>
                <p style={{ flex: 1 }}>{pillar.description}</p>
                <div style={{ marginTop: '1rem', color: 'var(--color-gold-accent)', fontWeight: '500' }}>
                  Explore →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
````

### 6. Create CredibilityStrip component

````tsx
// filepath: app/components/CredibilityStrip.tsx
export default function CredibilityStrip() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--color-navy-medium)',
        padding: '3rem 0',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="container">
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-light)', margin: 0 }}>
          <span style={{ color: 'var(--color-gold-accent)', fontWeight: '600' }}>Incorporated 2019</span>, Ontario, Canada.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-muted)', margin: '0.5rem 0 0 0' }}>
          Experience includes LCBO, Canadian Tire, Home Depot and the Ontario Ministry.
        </p>
      </div>
    </section>
  );
}
````

### 7. Create DifferentiatorSection component

````tsx
// filepath: app/components/DifferentiatorSection.tsx
export default function DifferentiatorSection() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h2>Why Fejiro Technology Consultancy Inc.</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.9' }}>
          The founder's journey from operations through systems analysis to enterprise architecture
          brings operational reality to every strategic recommendation. Governance-aware, founder-led
          delivery means boardroom clarity and technical accountability in equal measure. Every engagement
          is grounded in the principle that intelligent systems serve people, not the reverse.
        </p>
      </div>
    </section>
  );
}
````

### 8. Create Ventures section component

````tsx
// filepath: app/components/VenturesSection.tsx
export default function VenturesSection() {
  return (
    <section className="section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Founder-Led Ventures</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>PeacePad</h3>
            <p>
              A structured co-parenting and family mediation platform focused on clarity,
              documentation and collaborative resolution. Built on principles of transparent
              communication and institutional governance.
            </p>
            <a
              href="https://peacepad.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit PeacePad
            </a>
          </div>

          <div className="card">
            <h3>SayWetin</h3>
            <p>
              A language and culture platform connecting Nigerian creatives and audiences.
              Designed to preserve and amplify authentic voices in digital spaces with
              governance-aware community standards.
            </p>
            <a
              href="https://saywetin.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1.5rem' }}
            >
              Visit SayWetin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
````

### 9. Create CallToAction component

````tsx
// filepath: app/components/CallToAction.tsx
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(135deg, var(--color-navy-medium) 0%, rgba(212, 165, 116, 0.1) 100%)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <h2>Ready to modernise your operations?</h2>
        <p style={{ marginBottom: '2rem' }}>
          Schedule a strategic consultation with our team to explore how we can help
          move your organisation from manual complexity to intelligent systems.
        </p>
        <Link href="/contact" className="btn">
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
````

### 10. Update Footer component

````tsx
// filepath: app/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-charcoal)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
          {/* Left */}
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Fejiro Technology Consultancy Inc.</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-muted)', margin: 0 }}>
              Incorporated 2019, Ontario, Canada.
            </p>
          </div>

          {/* Right */}
          <nav>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link
```

