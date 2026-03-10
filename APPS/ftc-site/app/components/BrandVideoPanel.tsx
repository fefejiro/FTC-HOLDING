import type { ReactNode } from "react";

type MediaAspect = "hero" | "landscape" | "wide" | "portrait";

interface BrandVideoPanelProps {
  src: string;
  title: string;
  className?: string;
  frameClassName?: string;
  caption?: ReactNode;
  overlay?: ReactNode;
  preload?: "none" | "metadata" | "auto";
  aspect?: MediaAspect;
}

export default function BrandVideoPanel({
  src,
  title,
  className,
  frameClassName,
  caption,
  overlay,
  preload = "metadata",
  aspect = "landscape"
}: BrandVideoPanelProps) {
  const panelClassName = ["brand-media-panel", className].filter(Boolean).join(" ");
  const resolvedFrameClassName = [
    "brand-media-frame",
    "brand-video-frame",
    `brand-media-frame-${aspect}`,
    frameClassName
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClassName}>
      <div className={resolvedFrameClassName}>
        <video
          className="brand-media-video"
          autoPlay
          muted
          loop
          playsInline
          preload={preload}
          aria-label={title}
        >
          <source src={src} type="video/mp4" />
          {title}
        </video>
        <div className="brand-media-tint" aria-hidden="true" />
        {overlay ? <div className="brand-media-overlay-content">{overlay}</div> : null}
      </div>
      {caption ? <div className="brand-media-caption">{caption}</div> : null}
    </div>
  );
}
