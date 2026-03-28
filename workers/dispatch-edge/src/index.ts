export interface Env {
  DISPATCH_UPSTREAM_ORIGIN?: string;
}

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeProxyHeaders(headers: Headers, request: Request) {
  const next = new Headers(headers);
  next.set("x-forwarded-host", new URL(request.url).host);
  next.set("x-forwarded-proto", "https");
  next.delete("host");
  return next;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = trimTrailingSlash(env.DISPATCH_UPSTREAM_ORIGIN || "");
    if (!origin) {
      return new Response("Dispatch upstream is not configured.", {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    const url = new URL(request.url);
    const upstreamUrl = new URL(origin + url.pathname + url.search);
    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers: normalizeProxyHeaders(request.headers, request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow"
    });

    const response = await fetch(upstreamRequest);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
