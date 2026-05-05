import { NextResponse } from "next/server";
import { handleAteamEdgeFallback, shouldUseAteamEdgeFallback } from "./ateamWorkflowEdgeFallback";

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

const ATEAM_UPSTREAM_FALLBACKS = [
  "https://ateam-api.unalabs.cloud",
  "https://ateam-platform-production.up.railway.app",
];

export function getAteamUpstreamOrigin() {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  if (configuredOrigin) return configuredOrigin;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:3000";
  return ATEAM_UPSTREAM_FALLBACKS[0];
}

function getAteamUpstreamCandidates() {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  const candidates = [
    configuredOrigin,
    ...ATEAM_UPSTREAM_FALLBACKS.map((origin) => trimTrailingSlash(origin)),
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

function joinOrigin(origin: string, path: string) {
  const cleanOrigin = trimTrailingSlash(origin);
  const cleanPath = String(path || "").startsWith("/") ? String(path || "") : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}

export async function proxyAteamJson(path: string, init: RequestInit = {}) {
  const origins = getAteamUpstreamCandidates();
  if (!origins.length) {
    return NextResponse.json(
      {
        ok: false,
        message: "ATEAM workflow service is not connected yet."
      },
      { status: 503 }
    );
  }

  let lastFailure: NextResponse | null = null;

  for (const origin of origins) {
    try {
      const response = await fetch(joinOrigin(origin, path), {
        method: init.method || "GET",
        headers: {
          "content-type": "application/json",
          ...(init.headers || {})
        },
        body: init.body,
        cache: "no-store"
      });
      const bodyText = await response.text();
      const contentType = response.headers.get("content-type") || "application/json";
      const looksLikeHtml = /^\s*</.test(bodyText);
      const railwayFallback = response.headers.get("x-railway-fallback") === "true";
      const appNotFound = /application not found/i.test(bodyText);

      if (railwayFallback || appNotFound) {
        lastFailure = NextResponse.json(
          {
            ok: false,
            message: "ATEAM upstream route is not attached yet."
          },
          { status: 502 }
        );
        continue;
      }

      if (!contentType.toLowerCase().includes("application/json") || looksLikeHtml) {
        lastFailure = NextResponse.json(
          {
            ok: false,
            message: "ATEAM returned an unexpected response instead of the workflow API."
          },
          { status: 502 }
        );
        continue;
      }

      return new NextResponse(bodyText, {
        status: response.status,
        headers: {
          "content-type": contentType,
          "cache-control": "no-store",
          "x-ateam-upstream-origin": origin,
        }
      });
    } catch (error) {
      lastFailure = NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to reach the ATEAM workflow service."
        },
        { status: 502 }
      );
    }
  }

  if (lastFailure) {
    return lastFailure;
  }

  return NextResponse.json(
    {
      ok: false,
      message: "ATEAM workflow service is unreachable."
    },
    { status: 502 }
  );
}

export async function proxyOrFallbackAteamJson(request: Request, path: string, init: RequestInit = {}) {
  const upstream = await proxyAteamJson(path, init);
  if (!(await shouldUseAteamEdgeFallback(upstream))) {
    return upstream;
  }
  return handleAteamEdgeFallback(request, path, init);
}
