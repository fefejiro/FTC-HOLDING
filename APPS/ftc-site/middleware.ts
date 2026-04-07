import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { LEGACY_CANONICAL_HOSTS, OPS_SITE_HOST, SITE_HOST } from "./lib/site";

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/services": "/capabilities",
  "/drone-services": "/services/drone",
  "/case-studies": "/work",
  "/contact": "/work-with-ftc",
  "/c": "/connect"
};

function resolveRequestHost(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.toLowerCase();
}

function truthy(value?: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isLocalHost(host: string): boolean {
  return host === "localhost:3001" || host === "localhost" || host === "127.0.0.1:3001" || host === "127.0.0.1";
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
    return withRuntimePageHeaders(req, NextResponse.next());
  }

  if (!shouldRedirectToCanonical(host)) {
    return withRuntimePageHeaders(req, NextResponse.next());
  }

  const url = req.nextUrl.clone();
  url.protocol = "https";
  url.host = SITE_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
