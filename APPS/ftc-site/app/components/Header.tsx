import Link from "next/link";
import Logo from "./Logo";
import { siteNav } from "../../lib/content";

export default function Header() {
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
          {siteNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="nav-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <details className="mobile-menu">
          <summary aria-label="Toggle menu" className="mobile-toggle">
            Menu
          </summary>
          <div className="mobile-panel" role="dialog" aria-modal="true">
            {siteNav.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className="nav-link">
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
