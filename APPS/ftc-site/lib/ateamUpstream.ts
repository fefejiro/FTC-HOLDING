import { NextResponse } from "next/server";

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

export function getAteamUpstreamOrigin() {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  if (configuredOrigin) return configuredOrigin;
  return process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "";
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
        message: "ATEAM workflow service is not configured yet."
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
          message:
            "ATEAM returned HTML instead of the workflow API. Restart the local ATEAM server on port 3000 from C:\\FTC HOLDING\\FTC-HOLDING\\APPS\\ATEAM\\Server."
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
