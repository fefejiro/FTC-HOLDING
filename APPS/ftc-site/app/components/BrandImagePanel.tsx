import Image from "next/image";
import type { ReactNode } from "react";

type MediaAspect = "hero" | "landscape" | "wide" | "portrait";

interface BrandImagePanelProps {
  src: string;
  alt: string;
  className?: string;
  frameClassName?: string;
  caption?: ReactNode;
  overlay?: ReactNode;
  priority?: boolean;
  sizes?: string;
  aspect?: MediaAspect;
  fit?: "cover" | "contain";
}

export default function BrandImagePanel({
  src,
  alt,
  className,
  frameClassName,
  caption,
  overlay,
  priority = false,
  sizes = "(max-width: 980px) 100vw, 50vw",
  aspect = "landscape",
  fit = "cover"
}: BrandImagePanelProps) {
  const panelClassName = ["brand-media-panel", className].filter(Boolean).join(" ");
  const resolvedFrameClassName = [
    "brand-media-frame",
    `brand-media-frame-${aspect}`,
    frameClassName
  ]
    .filter(Boolean)
    .join(" ");
  const mediaClassName = ["brand-media-image", fit === "contain" ? "brand-media-fit-contain" : "brand-media-fit-cover"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClassName}>
      <div className={resolvedFrameClassName}>
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={mediaClassName} />
        <div className="brand-media-tint" aria-hidden="true" />
        {overlay ? <div className="brand-media-overlay-content">{overlay}</div> : null}
      </div>
      {caption ? <div className="brand-media-caption">{caption}</div> : null}
    </div>
  );
}
