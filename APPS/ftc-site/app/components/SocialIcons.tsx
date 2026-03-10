import { socialLinks } from "../../lib/siteLinks";

const linkedInIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.94 8.5V20H3V8.5h3.94zM4.97 6.86c-1.22 0-1.97-.83-1.97-1.86 0-1.05.78-1.86 2.01-1.86S7 3.95 7.01 5c0 1.03-.77 1.86-2.04 1.86zM21 13.41V20h-3.94v-6.13c0-1.54-.55-2.59-1.93-2.59-1.05 0-1.67.71-1.95 1.39-.1.24-.13.58-.13.92V20H9.11s.05-10.53 0-11.5h3.94v1.63c.52-.8 1.44-1.94 3.5-1.94 2.56 0 4.45 1.67 4.45 5.22z" />
  </svg>
);

export default function SocialIcons() {
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="social-links" aria-label="Social links">
      {socialLinks.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.ariaLabel}
        >
          {link.id === "linkedin" ? linkedInIcon : null}
        </a>
      ))}
    </div>
  );
}
