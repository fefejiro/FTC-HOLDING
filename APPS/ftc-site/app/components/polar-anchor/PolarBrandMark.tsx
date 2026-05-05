export default function PolarBrandMark() {
  return (
    <span className="logo-mark polar-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" aria-label="Polar Anchor logo">
        <defs>
          <linearGradient id="polar-anchor-mark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="52%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="18" fill="#081525" />
        <circle cx="32" cy="15" r="4.8" fill="#eef4ff" />
        <path
          d="M32 21v20m-12 0c0 6.8 5.5 12.3 12 12.3S44 47.8 44 41m-24 0h24m-15.5 0c0 3.5-2.8 6.4-6.5 6.4m14.5-6.4c0 3.5 2.8 6.4 6.5 6.4"
          fill="none"
          stroke="url(#polar-anchor-mark)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.3"
        />
      </svg>
    </span>
  );
}
