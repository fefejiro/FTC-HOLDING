import type { MetadataRoute } from "next";
import { isOgTradesCustomHost, OG_TRADES_SITE_URL } from "../lib/ogTradesAcademy";
import { getRequestHost } from "../lib/requestHost";
import { SITE_URL } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  const requestHost = getRequestHost();
  if (isOgTradesCustomHost(requestHost)) {
    return {
      rules: {
        userAgent: "*",
        allow: "/"
      },
      sitemap: `${OG_TRADES_SITE_URL}/sitemap.xml`,
      host: OG_TRADES_SITE_URL
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
