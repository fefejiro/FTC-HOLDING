import Link from "next/link";

interface CTABannerProps {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function CTABanner({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref
}: CTABannerProps) {
  return (
    <section className="cta-banner">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="hero-actions">
        <Link href={primaryHref} className="btn btn-primary">
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link href={secondaryHref} className="btn btn-secondary">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

