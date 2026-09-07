const NO_STORE_PREFIXES = [
  "/api/",
  "/auth/",
  "/oauth/",
  "/session/",
  "/readyz",
];

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
