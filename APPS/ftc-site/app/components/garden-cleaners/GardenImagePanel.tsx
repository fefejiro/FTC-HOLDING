import Image from "next/image";
import clsx from "clsx";
import type { GardenMediaAsset } from "../../../lib/gardenCleaners";

type GardenImagePanelProps = {
  asset: GardenMediaAsset;
  priority?: boolean;
  className?: string;
};

export default function GardenImagePanel({ asset, priority = false, className }: GardenImagePanelProps) {
  return (
    <figure className={clsx("garden-image-panel card", className)}>
      <div className="garden-image-shell">
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          data-garden-image-width={asset.intrinsicWidth}
          data-garden-image-height={asset.intrinsicHeight}
          sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 560px"
          priority={priority}
          className="garden-image"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      <figcaption className="garden-image-copy">
        <span className="garden-image-badge">{asset.badge}</span>
        <strong>{asset.title}</strong>
        <p>{asset.caption}</p>
      </figcaption>
    </figure>
  );
}
