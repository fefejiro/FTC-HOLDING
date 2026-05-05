"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GA_MEASUREMENT_ID, analyticsEnabled, trackEvent } from "../../lib/analytics";

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!analyticsEnabled()) return;
    if (typeof window.gtag !== "function") return;
    const pagePath = `${pathname}${window.location.search || ""}`;
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: pagePath
    });
  }, [pathname]);

  useEffect(() => {
    if (!analyticsEnabled()) return;

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const el = target.closest<HTMLElement>("[data-analytics-event]");
      if (!el) return;

      const eventName = el.dataset.analyticsEvent;
      if (!eventName) return;

      trackEvent(eventName, {
        location: el.dataset.analyticsLocation || "unknown",
        label: el.dataset.analyticsLabel || el.textContent?.trim() || "unknown",
        href:
          el instanceof HTMLAnchorElement
            ? el.href
            : (el.getAttribute("href") || undefined)
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!analyticsEnabled()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
