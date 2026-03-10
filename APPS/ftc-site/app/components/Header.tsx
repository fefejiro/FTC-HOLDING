"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { siteNav } from "../../lib/content";

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header>
      <div className="container site-header">
        <div className="logo-row">
          <Link href="/" className="logo-link" aria-label="Una Labs homepage">
            <Logo />
          </Link>
          <div>
            <p className="brand">Una Labs</p>
            <p className="brand-subtitle">Creative AI Studio</p>
          </div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          {siteNav.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mobile-shell">
          <button
            type="button"
            className="mobile-toggle"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setIsOpen((current) => !current)}
          >
            Menu
          </button>

          {isOpen ? (
            <button
              type="button"
              className="mobile-backdrop"
              aria-label="Close menu"
              onClick={closeMenu}
            />
          ) : null}

          <div
            id="mobile-nav-panel"
            className={`mobile-panel${isOpen ? " is-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="mobile-panel-header">
              <span>Navigation</span>
              <button type="button" className="mobile-panel-close" onClick={closeMenu}>
                Close
              </button>
            </div>

            <nav className="mobile-panel-nav" aria-label="Mobile navigation links">
              {siteNav.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    className={`mobile-panel-link${isActive ? " active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
