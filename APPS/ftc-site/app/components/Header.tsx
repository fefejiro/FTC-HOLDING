"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header>
      <div className="container site-header">
        <div className="logo-row">
          <Link href="/" className="logo-link">
            <Logo />
          </Link>
          <div className="brand">Fejiro Technology Consultancy Inc.</div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/case-studies">Case Studies</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/contact" className="cta-btn">Contact</Link>
        </nav>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          className="mobile-toggle"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>

        <div className={`mobile-panel ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/case-studies">Case Studies</Link>
          <Link href="/contact">Contact</Link>
          <div style={{ marginTop: 12 }}>
            <Link href="/contact" className="cta-btn">Contact</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
