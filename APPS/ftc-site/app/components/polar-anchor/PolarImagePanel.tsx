import Image from "next/image";
import clsx from "clsx";
import type { PolarMediaAsset } from "../../../lib/polarAnchor";

type PolarImagePanelProps = {
  asset: PolarMediaAsset;
  priority?: boolean;
  className?: string;
};

export default function PolarImagePanel({
  asset,
  priority = false,
  className
}: PolarImagePanelProps) {
  return (
    <figure className={clsx("polar-image-panel card", className)}>
      <div className="polar-image-shell">
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 560px"
          priority={priority}
          className="polar-image"
        />
      </div>
      <figcaption className="polar-image-copy">
        <span className="polar-image-badge">{asset.badge}</span>
        <strong>{asset.title}</strong>
        <p>{asset.caption}</p>
      </figcaption>
    </figure>
  );
}
