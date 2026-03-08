import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SITE_HOST } from "./lib/site";

function resolveRequestHost(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return host.toLowerCase();
}

function shouldRedirectToCanonical(host: string): boolean {
  if (!host) return false;
  if (host === SITE_HOST) return false;
  if (host === "localhost:3001" || host === "localhost") return false;
  return host.endsWith(".pages.dev");
}

export function middleware(req: NextRequest) {
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

