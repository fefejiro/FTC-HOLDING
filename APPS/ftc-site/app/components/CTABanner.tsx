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
        <Link
          href={primaryHref}
          className="btn btn-primary"
          data-analytics-event="start_project_click"
          data-analytics-location="final_cta"
        >
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="btn btn-secondary"
            data-analytics-event="view_work_click"
            data-analytics-location="final_cta"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
