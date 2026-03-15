import Link from "next/link";
import PolarImagePanel from "./PolarImagePanel";
import type { PolarMediaAsset } from "../../../lib/polarAnchor";

type PolarServiceShowcaseProps = {
  eyebrow: string;
  title: string;
  body: string;
  linkHref: string;
  linkLabel: string;
  asset: PolarMediaAsset;
  reverse?: boolean;
};

export default function PolarServiceShowcase({
  eyebrow,
  title,
  body,
  linkHref,
  linkLabel,
  asset,
  reverse = false
}: PolarServiceShowcaseProps) {
  return (
    <section className="section polar-section polar-showcase-section">
      <div className={`polar-showcase-grid${reverse ? " polar-showcase-grid-reverse" : ""}`}>
        <PolarImagePanel asset={asset} className="polar-showcase-media" />
        <article className="card polar-showcase-copy">
          <p className="polar-panel-kicker">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{body}</p>
          <Link href={linkHref} prefetch={false} className="inline-link">
            {linkLabel}
          </Link>
        </article>
      </div>
    </section>
  );
}
