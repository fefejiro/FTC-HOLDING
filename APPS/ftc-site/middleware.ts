import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { LEGACY_CANONICAL_HOSTS, SITE_HOST } from "./lib/site";

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/services": "/capabilities",
  "/services/drone": "/drone-services",
  "/case-studies": "/work",
  "/contact": "/work-with-ftc",
  "/c": "/connect"
};

function resolveRequestHost(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.toLowerCase();
}

function shouldRedirectToCanonical(host: string): boolean {
  if (!host) return false;
  if (host === SITE_HOST) return false;
  if (host === "localhost:3001" || host === "localhost") return false;
  if (LEGACY_CANONICAL_HOSTS.includes(host)) return true;
  return host.endsWith(".pages.dev");
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const redirectPath = LEGACY_ROUTE_REDIRECTS[pathname];
  if (redirectPath) {
    const url = req.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url, 308);
  }

  const host = resolveRequestHost(req);
  if (!shouldRedirectToCanonical(host)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.protocol = "https";
  url.host = SITE_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
