"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { siteNav } from "../../lib/content";

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
          <div>
            <p className="brand">FTC</p>
            <p className="brand-subtitle">Creative AI Technology Studio</p>
          </div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          {siteNav.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/work-with-ftc"
            className="cta-btn"
            data-analytics-event="start_project_click"
            data-analytics-location="header_desktop"
          >
            Start a Project
          </Link>
        </nav>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          className="mobile-toggle"
          onClick={() => setOpen(v => !v)}
        >
          Menu
        </button>

        <div className={`mobile-panel ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
          {siteNav.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: 12 }}>
            <Link
              href="/work-with-ftc"
              className="cta-btn"
              data-analytics-event="start_project_click"
              data-analytics-location="header_mobile"
            >
              Start a Project
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
