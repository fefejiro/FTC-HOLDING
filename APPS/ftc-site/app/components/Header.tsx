"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { siteNav } from "../../lib/content";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActivePath(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

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
            <p className="brand">Una Labs</p>
            <p className="brand-subtitle">Creative AI Studio</p>
          </div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          {siteNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActivePath(link.href) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
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
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActivePath(link.href) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
