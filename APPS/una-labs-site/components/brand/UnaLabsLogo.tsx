import Link from 'next/link';

type UnaLabsLogoProps = {
  href?: string;
  className?: string;
};

export function UnaLabsLogo({ href = '/', className = '' }: UnaLabsLogoProps) {
  return (
    <Link
      href={href}
      aria-label="Una Labs home"
      className={`group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 ${className}`}
    >
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="2" y="2" width="30" height="30" rx="10" fill="#0B0E11" />
        <path d="M10 10.5V18.2C10 22.1 12.55 24.5 17 24.5C21.45 24.5 24 22.1 24 18.2V10.5H20.3V18C20.3 20.2 19.15 21.3 17 21.3C14.85 21.3 13.7 20.2 13.7 18V10.5H10Z" fill="white" />
        <circle cx="25.5" cy="8.5" r="3.5" fill="#4DB8A8" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[17px] font-bold tracking-[-0.03em] text-tx-heading transition-colors group-hover:text-brand-teal">Una Labs</span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-tx-muted">An FTC studio</span>
      </span>
    </Link>
  );
}
