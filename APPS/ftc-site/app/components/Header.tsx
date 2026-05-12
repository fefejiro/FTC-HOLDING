"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  gardenCleanersConfig,
  getGardenCleanersBrandedPath,
  getGardenCleanersPortalUrl,
  getGardenCleanersNavLinks,
  isGardenCleanersCustomHost
} from "../../lib/gardenCleaners";
import { getOgTradesBrandedPath, getOgTradesNavLinks, isOgTradesCustomHost, ogTradesAcademyConfig } from "../../lib/ogTradesAcademy";
import { polarAnchorConfig } from "../../lib/polarAnchor";
import GardenBrandMark from "./garden-cleaners/GardenBrandMark";
import OgTradesBrandMark from "./og-trades/OgTradesBrandMark";
import PolarBrandMark from "./polar-anchor/PolarBrandMark";

const productMenuItems = [
  {
    label: "Dispatch",
    href: "/products/dispatch",
    description: "Roadside intake, routing, and incident watch."
  },
  {
    label: "SayWetin",
    href: "/saywetin",
    description: "Nigerian music and context intelligence."
  },
  {
    label: "PeacePad",
    href: "/products/peacepad",
    description: "Pre-send communication safety."
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

export default function Header({ initialHost = "" }: { initialHost?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [runtimeHost, setRuntimeHost] = useState(initialHost.toLowerCase());
  const isGardenHost = isGardenCleanersCustomHost(runtimeHost);
  const isGardenSite = (pathname?.startsWith("/garden-cleaners") ?? false) || isGardenHost;
  const isOgTradesHost = isOgTradesCustomHost(runtimeHost);
  const isOgTradesSite = (pathname?.startsWith("/og-trades-academy") ?? false) || isOgTradesHost;
  const isPolarSite = pathname?.startsWith("/polar-anchor") ?? false;
  const isDefaultUnaSite = !isGardenSite && !isOgTradesSite && !isPolarSite;
  const gardenPortalHref = getGardenCleanersPortalUrl("#portal-access");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setRuntimeHost(window.location.host.toLowerCase());
  }, []);

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
      return getGardenCleanersNavLinks({ host: runtimeHost });
    }
    if (isOgTradesSite) {
      return getOgTradesNavLinks({ host: runtimeHost });
    }
    if (isPolarSite) {
      return polarAnchorConfig.nav;
    }
    return [
      { label: "Product", href: "/products" },
      { label: "Solutions", href: "/services" },
      { label: "Resources", href: "/work" },
      { label: "ATEAM", href: "/ateam" },
      { label: "Pricing", href: "/pricing" },
      { label: "How It Works", href: "/how-it-works" }
    ];
  }, [isGardenSite, isOgTradesSite, isPolarSite, runtimeHost]);

  const homeHref = isGardenSite
    ? getGardenCleanersBrandedPath("/", { host: runtimeHost })
    : isOgTradesSite
      ? getOgTradesBrandedPath("/", { host: runtimeHost })
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
        : "";
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
            {isGardenSite ? <GardenBrandMark /> : isOgTradesSite ? <OgTradesBrandMark /> : isPolarSite ? <PolarBrandMark /> : null}
          </Link>
          <div>
            <p className="brand">{brandName}</p>
            {brandSubtitle ? <p className="brand-subtitle">{brandSubtitle}</p> : null}
          </div>
        </div>

        <nav className="primary" aria-label="Main navigation">
          {navLinks.map((link) => {
            if (isDefaultUnaSite && (link.label === "Products" || link.label === "Product")) {
              const productsActive = isProductsPath(pathname);
              return (
                <div key="products-nav-dropdown" className="nav-dropdown">
                  <Link
                    href={link.href}
                    prefetch={false}
                    className={`nav-link nav-link--dropdown${productsActive ? " active" : ""}`}
                    aria-current={productsActive ? "page" : undefined}
                  >
                    Product
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

            // --- GARDEN CLEANERS: Insert Portal Login CTA ---
            if (isGardenSite && link.label === "Get a Quote") {
              // Always show portal login; disable if auth not ready
              return [
                <Link
                  key="portal-login"
                  href={gardenPortalHref}
                  prefetch={false}
                  className="garden-portal-login-cta"
                  aria-label="Sign In to client portal"
                >
                  Sign In
                </Link>,
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className={`nav-link${isPathActive(pathname, link.href) ? " active" : ""}`}
                  aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ];
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
          <div className="header-actions header-actions--classic">
            <Link href="/login" prefetch={false} className="header-login-link">
              Login
            </Link>
            <Link href="/start" prefetch={false} className="header-start-btn">
              Start Your Project
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
                // Insert Portal Login before Get a Quote in mobile nav
                if (isGardenSite && link.label === "Get a Quote") {
                  // Always show portal login; disable if auth not ready
                  return [
                    <Link
                      key="portal-login-mobile"
                      href={gardenPortalHref}
                      prefetch={false}
                      className="mobile-panel-link garden-portal-login-cta"
                      aria-label="Portal Login"
                      onClick={closeMenu}
                    >
                      Portal Login
                    </Link>,
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      className={`mobile-panel-link${isPathActive(pathname, link.href) ? " active" : ""}`}
                      aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  ];
                }
                const isActive = (link.label === "Products" || link.label === "Product") && isDefaultUnaSite
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
                <Link href="/start" prefetch={false} className="mobile-project-btn" onClick={closeMenu}>
                  Start Your Project
                </Link>
                <Link href="/login" prefetch={false} className="mobile-project-btn" onClick={closeMenu}>
                  Login
                </Link>
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

