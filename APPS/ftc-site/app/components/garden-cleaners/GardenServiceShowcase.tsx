import Link from "next/link";
import type { GardenMediaAsset } from "../../../lib/gardenCleaners";
import GardenImagePanel from "./GardenImagePanel";

type GardenServiceShowcaseProps = {
  eyebrow: string;
  title: string;
  body: string;
  linkHref: string;
  linkLabel: string;
  asset: GardenMediaAsset;
};

export default function GardenServiceShowcase({
  eyebrow,
  title,
  body,
  linkHref,
  linkLabel,
  asset
}: GardenServiceShowcaseProps) {
  return (
    <section className="section garden-section garden-showcase-section">
      <div className="garden-showcase-grid">
        <GardenImagePanel asset={asset} className="garden-showcase-media" />
        <article className="card garden-showcase-copy">
          <p className="garden-panel-kicker">{eyebrow}</p>
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
