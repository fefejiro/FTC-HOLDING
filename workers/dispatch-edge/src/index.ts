export interface Env {
  DISPATCH_UPSTREAM_ORIGIN?: string;
  DISPATCH_ADMIN_PROXY_KEY?: string;
  DISPATCH_ADMIN_SESSION_TOKEN?: string;
}

const ADMIN_HOST = "dispatch-admin.unalabs.cloud";
const ADMIN_SESSION_COOKIE = "dispatch_admin_session";

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function text(value: unknown) {
  return String(value || "").trim();
}

function parseCookies(request: Request) {
  const raw = text(request.headers.get("cookie"));
  const cookies = new Map<string, string>();
  if (!raw) {
    return cookies;
  }

  raw.split(";").forEach((part) => {
    const [name, ...rest] = part.split("=");
    const safeName = text(name);
    if (!safeName) {
      return;
    }
    cookies.set(safeName, decodeURIComponent(rest.join("=")));
  });

  return cookies;
}

function hasAdminSession(request: Request, env: Env) {
  const expected = text(env.DISPATCH_ADMIN_SESSION_TOKEN);
  if (!expected) {
    return false;
  }
  return parseCookies(request).get(ADMIN_SESSION_COOKIE) === expected;
}

function adminSessionCookie(env: Env) {
  const value = encodeURIComponent(text(env.DISPATCH_ADMIN_SESSION_TOKEN));
  return `${ADMIN_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
}

function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function isAdminHost(url: URL) {
  return text(url.hostname).toLowerCase() === ADMIN_HOST;
}

function normalizeProxyHeaders(headers: Headers, request: Request, options?: { injectAdminProxy?: boolean; env?: Env }) {
  const next = new Headers(headers);
  next.set("x-forwarded-host", new URL(request.url).host);
  next.set("x-forwarded-proto", "https");
  next.delete("host");
  if (options?.injectAdminProxy && options.env) {
    const proxyKey = text(options.env.DISPATCH_ADMIN_PROXY_KEY);
    if (proxyKey) {
      next.set("x-dispatch-admin-proxy-key", proxyKey);
    }
  }
  return next;
}

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function proxyRequest(
  request: Request,
  env: Env,
  options?: { injectAdminProxy?: boolean; pathname?: string },
) {
  const origin = trimTrailingSlash(env.DISPATCH_UPSTREAM_ORIGIN || "");
  const url = new URL(request.url);
  const upstreamUrl = new URL(origin + (options?.pathname || url.pathname) + url.search);
  const upstreamRequest = new Request(upstreamUrl.toString(), {
    method: request.method,
    headers: normalizeProxyHeaders(request.headers, request, {
      injectAdminProxy: options?.injectAdminProxy,
      env,
    }),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow",
  });

  const response = await fetch(upstreamRequest);
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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
    if (isAdminHost(url)) {
      if (url.pathname === "/" || url.pathname === "") {
        return Response.redirect(`${url.origin}/admin`, 302);
      }

      if (url.pathname === "/api/admin/session") {
        if (hasAdminSession(request, env)) {
          return json({ ok: true });
        }
        return json({ ok: false, error: "admin_auth_required" }, { status: 401 });
      }

      if (url.pathname === "/api/admin/logout") {
        return json(
          { ok: true },
          {
            headers: {
              "set-cookie": clearAdminSessionCookie(),
            },
          },
        );
      }

      if (url.pathname === "/api/admin/auth" && request.method === "POST") {
        const response = await proxyRequest(request, env);
        const payload = await response.clone().json().catch(() => null) as { ok?: boolean; error?: string } | null;
        if (!response.ok || !payload?.ok) {
          return response;
        }
        return json(
          { ok: true, token: null },
          {
            headers: {
              "set-cookie": adminSessionCookie(env),
            },
          },
        );
      }

      if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
        return proxyRequest(request, env, { injectAdminProxy: true });
      }

      if (url.pathname.startsWith("/api/")) {
        if (!hasAdminSession(request, env)) {
          return json({ ok: false, error: "admin_auth_required" }, { status: 401 });
        }
        return proxyRequest(request, env, { injectAdminProxy: true });
      }

      return proxyRequest(request, env);
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return Response.redirect(`https://${ADMIN_HOST}/admin`, 302);
    }

    return proxyRequest(request, env);
  }
};
