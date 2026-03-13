interface GooglePlayBadgeProps {
  href: string;
  title: string;
}

export default function GooglePlayBadge({ href, title }: GooglePlayBadgeProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="play-badge"
      aria-label={`Get ${title} on Google Play`}
    >
      <span className="play-badge-mark" aria-hidden="true">
        Play
      </span>
      <span className="play-badge-copy">
        <span>Available on</span>
        <strong>Google Play</strong>
      </span>
    </a>
  );
}
