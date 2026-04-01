"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface AteamProductPreviewProps {
  title: string;
  posterSrc: string;
  webmSrc?: string;
  mp4Src?: string;
  hasVideo?: boolean;
}

const workflowSteps = ["Narrative intake", "Routing", "Visible work", "Structured output"];

export default function AteamProductPreview({
  title,
  posterSrc,
  webmSrc,
  mp4Src,
  hasVideo = false
}: AteamProductPreviewProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "160px 0px"
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const shouldRenderVideo =
    hasVideo && isVisible && !prefersReducedMotion && !videoFailed && Boolean(webmSrc || mp4Src);

  return (
    <div className="product-ateam-preview-shell">
      <div ref={frameRef} className="product-ateam-preview-frame">
        {shouldRenderVideo ? (
          <video
            className="product-ateam-preview-media"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={posterSrc}
            aria-label={title}
            onError={() => setVideoFailed(true)}
          >
            {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
            {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
          </video>
        ) : (
          <Image
            src={posterSrc}
            alt={title}
            fill
            sizes="(max-width: 980px) 100vw, 34vw"
            className="product-ateam-preview-media"
          />
        )}
        <div className="product-ateam-preview-chrome" aria-hidden="true">
          <div className="product-ateam-preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="product-ateam-preview-state">
            <span>Live workflow</span>
            <strong>Operator flow visible</strong>
          </div>
        </div>
      </div>
      <div className="product-ateam-preview-flow" aria-hidden="true">
        {workflowSteps.map((step, index) => (
          <span
            key={step}
            className="product-ateam-preview-flow-step"
            style={{ animationDelay: `${index * 0.35}s` }}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}
