import { NextResponse } from "next/server";
import { handleAteamEdgeFallback, shouldUseAteamEdgeFallback } from "./ateamWorkflowEdgeFallback";

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

const ATEAM_UPSTREAM_FALLBACK = "https://ateam-platform-production.up.railway.app";

export function getAteamUpstreamOrigin() {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  if (configuredOrigin) return configuredOrigin;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:3000";
  return ATEAM_UPSTREAM_FALLBACK;
}

function joinOrigin(origin: string, path: string) {
  const cleanOrigin = trimTrailingSlash(origin);
  const cleanPath = String(path || "").startsWith("/") ? String(path || "") : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}

export async function proxyAteamJson(path: string, init: RequestInit = {}) {
  const origin = getAteamUpstreamOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        ok: false,
        message: "ATEAM workflow service is not connected yet."
      },
      { status: 503 }
    );
  }

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

    if (!contentType.toLowerCase().includes("application/json") || looksLikeHtml) {
      return NextResponse.json(
        {
          ok: false,
          message: "ATEAM returned an unexpected response instead of the workflow API."
        },
        { status: 502 }
      );
    }
    return new NextResponse(bodyText, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
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

export async function proxyOrFallbackAteamJson(request: Request, path: string, init: RequestInit = {}) {
  const upstream = await proxyAteamJson(path, init);
  if (!(await shouldUseAteamEdgeFallback(upstream))) {
    return upstream;
  }
  return handleAteamEdgeFallback(request, path, init);
}
