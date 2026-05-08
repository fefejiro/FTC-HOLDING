import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getOgTradesInternalPath,
  isOgTradesCustomHost,
  isOgTradesPublicPath,
  isOgTradesRedirectHost,
  OG_TRADES_SITE_HOST,
  stripOgTradesBasePath
} from "./lib/ogTradesAcademy";
import {
  getGardenCleanersInternalPath,
  isGardenCleanersCustomHost,
  isGardenCleanersPublicPath,
  stripGardenCleanersBasePath
} from "./lib/gardenCleaners";
import { ATEAM_SITE_HOST, ATEAM_SITE_URL, LEGACY_CANONICAL_HOSTS, OPS_SITE_HOST, SITE_HOST } from "./lib/site";

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/services": "/capabilities",
  "/drone-services": "/services/drone",
  "/case-studies": "/work",
  "/contact": "/work-with-ftc",
  "/c": "/connect"
};

const CLIENT_DOMAIN_ROOT_REWRITES: Record<string, string> = {
  "ogtradesacademy.com": "/og-trades-academy",
  "www.ogtradesacademy.com": "/og-trades-academy",
  "ogtradesacademy.ca": "/og-trades-academy",
  "www.ogtradesacademy.ca": "/og-trades-academy",
  "gardencleaners.ca": "/garden-cleaners",
  "www.gardencleaners.ca": "/garden-cleaners",
  "polaranchor.ca": "/polar-anchor",
  "www.polaranchor.ca": "/polar-anchor"
};

const DISPATCH_PUBLIC_HOST = "dispatch.unalabs.cloud";
const DISPATCH_ADMIN_HOST = "dispatch-admin.unalabs.cloud";

const OG_TRADES_ROOT_LANDING_PATH = "/og-trades-academy";
const OG_TRADES_STABLE_ALIAS_PATH = "/og-trades-academy-home";

function resolveRequestHost(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return String(host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}
function buildRequestHeaders(req: NextRequest, host: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-host", host);
  return requestHeaders;
}

function nextWithRequestHost(req: NextRequest, host: string) {
  return NextResponse.next({
    request: {
      headers: buildRequestHeaders(req, host)
    }
  });
}

function rewriteWithRequestHost(req: NextRequest, host: string, url: URL) {
  return NextResponse.rewrite(url, {
    request: {
      headers: buildRequestHeaders(req, host)
    }
  });
}

function truthy(value?: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isLocalHost(host: string): boolean {
  const normalized = String(host || "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.startsWith("localhost:") ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.0.0.1:")
  );
}

function isAteamOperatorEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    truthy(process.env.ATEAM_OPERATOR_PROXY_ENABLED) ||
    truthy(process.env.NEXT_PUBLIC_ATEAM_OPERATOR_ENABLED)
  );
}

function shouldRedirectToCanonical(host: string): boolean {
  if (!host) return false;
  if (host === SITE_HOST) return false;
  if (host === OPS_SITE_HOST) return false;
  if (host === "localhost:3001" || host === "localhost") return false;
  if (LEGACY_CANONICAL_HOSTS.includes(host)) return true;
  return host.endsWith(".pages.dev");
}

function allowPagesPreviewBypass(req: NextRequest, host: string): boolean {
  if (!host.endsWith(".pages.dev")) return false;
  const preview = req.nextUrl.searchParams.get("preview");
  return truthy(preview || "");
}

function shouldDisableEdgeHtmlCache(req: NextRequest, pathname: string): boolean {
  const accept = String(req.headers.get("accept") || "").toLowerCase();
  if (!accept.includes("text/html")) return false;
  return pathname === "/" || pathname === "/ateam" || pathname.startsWith("/ateam/");
}

function withRuntimePageHeaders(req: NextRequest, response: NextResponse): NextResponse {
  if (!shouldDisableEdgeHtmlCache(req, req.nextUrl.pathname)) {
    return response;
  }
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  response.headers.set("Vary", "Accept");
  return response;
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const host = resolveRequestHost(req);
  const hostWithoutPort = host.replace(/:\d+$/, "");
  const urlHost = String(req.nextUrl.hostname || "").toLowerCase().replace(/:\d+$/, "");
  const effectiveHost = hostWithoutPort || urlHost;

  // Hard-lock Garden Cleaners host before any OG/domain inference logic.
  // This prevents accidental OG route rewrites when environment host config is mis-set.
  if (isGardenCleanersCustomHost(effectiveHost)) {
    const brandedPath = stripGardenCleanersBasePath(pathname);
    if (brandedPath) {
      const url = req.nextUrl.clone();
      url.pathname = brandedPath;
      return NextResponse.redirect(url, 308);
    }

    if (
      pathname.startsWith("/og-trades-academy") ||
      pathname === "/work/og-trades-academy" ||
      pathname === "/og-trades-academy-home"
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url, 308);
    }

    if (isGardenCleanersPublicPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = getGardenCleanersInternalPath(pathname);
      return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
    }

    return withRuntimePageHeaders(req, nextWithRequestHost(req, effectiveHost));
  }

  if (pathname === "/work/og-trades-academy") {
    const url = req.nextUrl.clone();
    url.pathname = OG_TRADES_STABLE_ALIAS_PATH;
    return withRuntimePageHeaders(req, rewriteWithRequestHost(req, hostWithoutPort || host, url));
  }

  // OG Trades custom domain handling
  if (isOgTradesCustomHost(effectiveHost)) {
    // Root or landing paths: rewrite to premium page (no redirect)
    if (pathname === "/" || pathname === OG_TRADES_ROOT_LANDING_PATH || pathname === "/work/og-trades-academy") {
      const url = req.nextUrl.clone();
      url.pathname = OG_TRADES_STABLE_ALIAS_PATH;
      return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
    }
  }

  const clientRootRewrite = CLIENT_DOMAIN_ROOT_REWRITES[effectiveHost];
  if (clientRootRewrite && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = clientRootRewrite;
    return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
  }

  // ATEAM custom host fallback routing.
  // Map legacy/operator host entry routes to the in-app ATEAM surface to prevent 404s.
  if (effectiveHost === ATEAM_SITE_HOST) {
    const url = req.nextUrl.clone();
    if (pathname === "/" || pathname === "/office") {
      url.pathname = "/ateam";
      return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
    }
    if (pathname === "/memory" || pathname === "/team" || pathname === "/factory" || pathname === "/pipeline") {
      url.pathname = "/ateam";
      url.searchParams.set("surface", pathname.slice(1));
      return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
    }
  }

  // Dispatch custom host fallback routing.
  // The canonical product page remains on unalabs.cloud; keep subdomains alive by forwarding there.
  if (effectiveHost === DISPATCH_PUBLIC_HOST || effectiveHost === DISPATCH_ADMIN_HOST) {
    const url = req.nextUrl.clone();
    url.pathname = "/products/dispatch";
    return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
  }

  if (isOgTradesRedirectHost(effectiveHost)) {
    const url = req.nextUrl.clone();
    url.protocol = "https";
    url.host = OG_TRADES_SITE_HOST;
    return NextResponse.redirect(url, 308);
  }

  if (isOgTradesCustomHost(effectiveHost)) {
    const brandedPath = stripOgTradesBasePath(pathname);
    if (brandedPath) {
      const url = req.nextUrl.clone();
      url.pathname = brandedPath;
      return NextResponse.redirect(url, 308);
    }

    if (isOgTradesPublicPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = getOgTradesInternalPath(pathname);
      return withRuntimePageHeaders(req, rewriteWithRequestHost(req, effectiveHost, url));
    }

    return nextWithRequestHost(req, effectiveHost);
  }

  if (pathname === "/ateam" || pathname === "/ateam/" || pathname.startsWith("/ateam/")) {
    if (!isLocalHost(host) && host !== ATEAM_SITE_HOST && ATEAM_SITE_HOST !== SITE_HOST) {
      const destination = new URL(ATEAM_SITE_URL);
      destination.pathname = "/";
      destination.search = req.nextUrl.search;
      return NextResponse.redirect(destination, 308);
    }
  }

  if ((pathname === "/ateam/operator" || pathname.startsWith("/ateam/operator/")) && !isLocalHost(host) && !isAteamOperatorEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const redirectPath = LEGACY_ROUTE_REDIRECTS[pathname];
  if (redirectPath) {
    const url = req.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url, 308);
  }

  if (allowPagesPreviewBypass(req, host)) {
    return withRuntimePageHeaders(req, nextWithRequestHost(req, effectiveHost || host));
  }

  if (!shouldRedirectToCanonical(host)) {
    return withRuntimePageHeaders(req, nextWithRequestHost(req, effectiveHost || host));
  }

  const url = req.nextUrl.clone();
  url.protocol = "https";
  url.host = SITE_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
