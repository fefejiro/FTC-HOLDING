"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { gardenCleanersConfig } from "../../lib/gardenCleaners";
import { ogTradesAcademyConfig } from "../../lib/ogTradesAcademy";
import { polarAnchorConfig } from "../../lib/polarAnchor";
import { siteNav } from "../../lib/content";
import GardenBrandMark from "./garden-cleaners/GardenBrandMark";
import OgTradesBrandMark from "./og-trades/OgTradesBrandMark";
import PolarBrandMark from "./polar-anchor/PolarBrandMark";
import Logo from "./Logo";

const productMenuItems = [
  {
    label: "PeacePad",
    href: "/products/peacepad",
    description: "Pre-send communication safety."
  },
  {
    label: "SayWetin",
    href: "/saywetin",
    description: "Nigerian music and context intelligence."
  },
  {
    label: "Dispatch",
    href: "/products/dispatch",
    description: "Roadside intake, routing, and incident watch."
  },
  {
    label: "ATEAM",
    href: "/ateam",
    description: "AI-assisted scoping and delivery workflow."
  }
] as const;

function isPathActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isProductsPath(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return (
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/peacepad") ||
    pathname.startsWith("/saywetin")
  );
}

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isGardenSite = pathname?.startsWith("/garden-cleaners") ?? false;
  const isOgTradesSite = pathname?.startsWith("/og-trades-academy") ?? false;
  const isPolarSite = pathname?.startsWith("/polar-anchor") ?? false;
  const isDefaultUnaSite = !isGardenSite && !isOgTradesSite && !isPolarSite;

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

  const navLinks = useMemo(() => {
    if (isGardenSite) {
      return gardenCleanersConfig.nav;
    }
    if (isOgTradesSite) {
      return ogTradesAcademyConfig.nav;
    }
    if (isPolarSite) {
      return polarAnchorConfig.nav;
    }
    return siteNav
      .filter((link) => link.label !== "Start a Project")
      .map((link) => ({ label: link.label, href: link.href }));
  }, [isGardenSite, isOgTradesSite, isPolarSite]);

  const homeHref = isGardenSite
    ? "/garden-cleaners"
    : isOgTradesSite
      ? "/og-trades-academy"
      : isPolarSite
        ? "/polar-anchor"
        : "/";
  const brandName = isGardenSite
    ? gardenCleanersConfig.companyName
    : isOgTradesSite
      ? ogTradesAcademyConfig.companyName
      : isPolarSite
        ? polarAnchorConfig.companyName
        : "Una Labs";
  const brandSubtitle = isGardenSite
    ? "Professional cleaning services"
    : isOgTradesSite
      ? ogTradesAcademyConfig.tagline
      : isPolarSite
        ? polarAnchorConfig.tagline
        : "Trusted AI workflows | lead systems | delivery";
  const ogHeaderCta = (
    <a
      href={ogTradesAcademyConfig.coursePurchaseUrl}
      target="_blank"
      rel="noreferrer"
      className="og-header-cta"
    >
      Enroll Now
    </a>
  );

  return (
    <header className={isGardenSite ? "garden-site-header" : isOgTradesSite ? "og-site-header" : undefined}>
      <div className="container site-header">
        <div className="logo-row">
          <Link href={homeHref} className="logo-link" aria-label={`${brandName} homepage`}>
            {isGardenSite ? <GardenBrandMark /> : isOgTradesSite ? <OgTradesBrandMark /> : isPolarSite ? <PolarBrandMark /> : <Logo />}
          </Link>
          <div>
            <p className="brand">{brandName}</p>
            <p className="brand-subtitle">{brandSubtitle}</p>
          </div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          {navLinks.map((link) => {
            if (isDefaultUnaSite && link.label === "Products") {
              const productsActive = isProductsPath(pathname);
              return (
                <div key="products-nav-dropdown" className="nav-dropdown">
                  <Link
                    href={link.href}
                    prefetch={false}
                    className={`nav-link nav-link--dropdown${productsActive ? " active" : ""}`}
                    aria-current={productsActive ? "page" : undefined}
                  >
                    Products
                  </Link>
                  <div className="nav-dropdown-panel" role="menu" aria-label="Products menu">
                    {productMenuItems.map((item) => (
                      <Link key={item.href} href={item.href} prefetch={false} className="nav-dropdown-item" role="menuitem">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            const isActive = isPathActive(pathname, link.href);
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

        {isDefaultUnaSite ? (
          <div className="header-actions">
            <a href="tel:+14164732732" className="header-call-chip">
              Talk to an Expert
              <strong>+1 (416) 473-2732</strong>
            </a>
            <Link href="/work-with-ftc" prefetch={false} className="header-contact-btn">
              Contact Us
            </Link>
          </div>
        ) : null}

        {isOgTradesSite ? <div className="header-actions">{ogHeaderCta}</div> : null}

        <div className="mobile-shell">
          <button
            type="button"
            className="mobile-toggle"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
            aria-label={isOpen ? "Close menu" : "Menu"}
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? "Close" : "Menu"}
          </button>

          {isOpen ? <button type="button" className="mobile-backdrop" aria-label="Close menu" onClick={closeMenu} /> : null}

          <div
            id="mobile-nav-panel"
            className={`mobile-panel${isOpen ? " is-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="mobile-panel-header">
              <span>{brandName}</span>
              <button type="button" className="mobile-panel-close" onClick={closeMenu}>
                Close
              </button>
            </div>

            <nav className="mobile-panel-nav" aria-label="Mobile navigation links">
              {navLinks.map((link) => {
                const isActive = link.label === "Products" && isDefaultUnaSite
                  ? isProductsPath(pathname)
                  : isPathActive(pathname, link.href);
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

            {isOgTradesSite ? (
              <div className="mobile-products-group" aria-label="Primary action">
                <a
                  href={ogTradesAcademyConfig.coursePurchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mobile-project-btn"
                  onClick={closeMenu}
                >
                  Enroll Now
                </a>
              </div>
            ) : null}

            {isDefaultUnaSite ? (
              <div className="mobile-products-group" aria-label="Products">
                <p className="mobile-products-title">Products</p>
                {productMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className="mobile-product-link"
                    onClick={closeMenu}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                ))}
                <Link href="/work-with-ftc" prefetch={false} className="mobile-project-btn" onClick={closeMenu}>
                  Start a Project
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

