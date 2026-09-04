const NO_STORE_PREFIXES = [
  "/api/",
  "/auth/",
  "/oauth/",
  "/session/",
  "/readyz",
];

const ASSOCIATION_PATHS = new Set([
  "/.well-known/assetlinks.json",
  "/.well-known/apple-app-site-association",
]);

function associationHeaders() {
  return {
    "cache-control": "public, max-age=3600",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-jobagent-edge": "cloudflare",
  };
}

function exactFingerprints(value) {
  const fingerprints = String(value || "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return fingerprints.length > 0
    && fingerprints.every((entry) => /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(entry))
    ? fingerprints
    : null;
}

function exactAppIdPrefix(value) {
  const prefix = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(prefix) ? prefix : null;
}

function associationResponse(pathname, env) {
  if (pathname === "/.well-known/assetlinks.json") {
    const fingerprints = exactFingerprints(env.JOBAGENT_PLAY_APP_SIGNING_SHA256);
    if (!fingerprints) return null;
    return [{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "cloud.unalabs.jobagent",
        sha256_cert_fingerprints: fingerprints,
      },
    }];
  }

  if (pathname === "/.well-known/apple-app-site-association") {
    const prefix = exactAppIdPrefix(env.JOBAGENT_APPLE_APP_ID_PREFIX);
    if (!prefix) return null;
    const appId = `${prefix}.cloud.unalabs.jobagent`;
    return {
      applinks: {
        apps: [],
        details: [{
          appIDs: [appId],
          components: [
            { "/": "/api/v1/oauth/gmail/callback*", exclude: true, comment: "OAuth exchange must complete on the server" },
            { "/": "/app*", comment: "UnaScout customer workspace" },
            { "/": "/accept-invite*", comment: "Invitation acceptance" },
            { "/": "/verify-email*", comment: "Email verification" },
            { "/": "/reset-password*", comment: "Password reset" },
          ],
        }],
      },
      webcredentials: { apps: [appId] },
    };
  }

  return null;
}

function shouldDisableCaching(pathname) {
  return NO_STORE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function rewriteLocation(location, upstreamOrigin, publicOrigin) {
  if (!location) {
    return location;
  }

  return location.startsWith(upstreamOrigin)
    ? `${publicOrigin}${location.slice(upstreamOrigin.length)}`
    : location;
}

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);

    if (incomingUrl.pathname === "/edgez") {
      return Response.json(
        { ready: true, edge: "cloudflare", origin: "configured" },
        { headers: { "cache-control": "no-store" } },
      );
    }

    if (ASSOCIATION_PATHS.has(incomingUrl.pathname)) {
      const document = associationResponse(incomingUrl.pathname, env);
      if (!document) {
        return Response.json(
          { error: "Mobile association identity is not configured." },
          { status: 503, headers: { ...associationHeaders(), "cache-control": "no-store" } },
        );
      }
      return new Response(JSON.stringify(document), {
        status: 200,
        headers: associationHeaders(),
      });
    }

    let upstreamOrigin;
    try {
      upstreamOrigin = new URL(env.JOBAGENT_ORIGIN);
    } catch {
      return Response.json(
        { ready: false, error: "edge_origin_not_configured" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    if (upstreamOrigin.protocol !== "https:") {
      return Response.json(
        { ready: false, error: "edge_origin_must_use_https" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    const upstreamUrl = new URL(
      `${incomingUrl.pathname}${incomingUrl.search}`,
      upstreamOrigin,
    );
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("x-forwarded-host", incomingUrl.host);
    upstreamHeaders.set("x-forwarded-proto", "https");

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual",
    });

    try {
      const upstreamResponse = await fetch(upstreamRequest);
      const responseHeaders = new Headers(upstreamResponse.headers);
      const publicOrigin = incomingUrl.origin;
      const location = rewriteLocation(
        responseHeaders.get("location"),
        upstreamOrigin.origin,
        publicOrigin,
      );

      if (location) {
        responseHeaders.set("location", location);
      }
      if (shouldDisableCaching(incomingUrl.pathname)) {
        responseHeaders.set("cache-control", "no-store");
      }
      if (!responseHeaders.has("x-content-type-options")) {
        responseHeaders.set("x-content-type-options", "nosniff");
      }
      responseHeaders.set("x-jobagent-edge", "cloudflare");

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch {
      return Response.json(
        { ready: false, error: "edge_origin_unavailable" },
        {
          status: 502,
          headers: {
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        },
      );
    }
  },
};
