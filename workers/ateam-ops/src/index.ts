export interface Env {
  ATEAM_UPSTREAM_ORIGIN?: string;
  ATEAM_TRUSTED_PROXY_KEY?: string;
  OPS_ALLOWED_EMAILS?: string;
  OPS_BASIC_AUTH_USERNAME?: string;
  OPS_BASIC_AUTH_PASSWORD?: string;
  ATEAM_PROXY_TENANT_ID?: string;
  ATEAM_PROXY_WORKSPACE_ID?: string;
  ATEAM_PROXY_USER_ID?: string;
  ATEAM_PROXY_ROLE?: string;
  CANONICAL_OPS_ORIGIN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

type OperatorIdentity = {
  email: string;
  role: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
};

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function redirect(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location,
      "cache-control": "no-store"
    }
  });
}

function getUpstreamOrigin(env: Env) {
  return trimTrailingSlash(env.ATEAM_UPSTREAM_ORIGIN || "");
}

function getCanonicalOpsOrigin(env: Env, request: Request) {
  const url = new URL(request.url);
  return trimTrailingSlash(env.CANONICAL_OPS_ORIGIN || `${url.protocol}//${url.host}`);
}

function sanitizeToken(value: string, fallback = "") {
  const safe = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 80);
  return safe || fallback;
}

function getAllowedEmails(env: Env) {
  return new Set(
    String(env.OPS_ALLOWED_EMAILS || "mike.fejiro@gmail.com")
      .split(",")
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );
}

function getBasicAuthConfig(env: Env) {
  return {
    username: String(env.OPS_BASIC_AUTH_USERNAME || "").trim().toLowerCase(),
    password: String(env.OPS_BASIC_AUTH_PASSWORD || "").trim()
  };
}

function decodeBase64Url(value: string) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseJwtSection<T>(value: string): T {
  const bytes = decodeBase64Url(value);
  const jsonText = new TextDecoder().decode(bytes);
  return JSON.parse(jsonText) as T;
}

async function verifyAccessJwt(request: Request, env: Env) {
  const teamDomain = trimTrailingSlash(env.CF_ACCESS_TEAM_DOMAIN || "");
  const policyAud = String(env.CF_ACCESS_AUD || "").trim();
  if (!teamDomain || !policyAud) {
    return {
      ok: false,
      status: 503,
      error: "access_validation_not_configured",
      message:
        "Cloudflare Access validation is not configured yet. Set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD on the ops worker."
    };
  }

  const token = String(request.headers.get("cf-access-jwt-assertion") || "").trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "cloudflare_access_required",
      message:
        "Cloudflare Access is required for the private operator surface. Sign in with the allowlisted operator email first."
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      ok: false,
      status: 401,
      error: "invalid_access_jwt",
      message: "The Cloudflare Access JWT is malformed."
    };
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header = parseJwtSection<Record<string, unknown>>(headerSegment);
  const payload = parseJwtSection<Record<string, unknown>>(payloadSegment);
  const issuer = String(payload.iss || "").trim();
  if (issuer !== teamDomain) {
    return {
      ok: false,
      status: 403,
      error: "access_issuer_mismatch",
      message: "The Cloudflare Access JWT issuer did not match the configured team domain."
    };
  }

  const audienceValues = Array.isArray(payload.aud)
    ? payload.aud.map((value) => String(value || "").trim()).filter(Boolean)
    : [String(payload.aud || "").trim()].filter(Boolean);
  if (!audienceValues.includes(policyAud)) {
    return {
      ok: false,
      status: 403,
      error: "access_audience_mismatch",
      message: "The Cloudflare Access JWT audience did not match the configured application."
    };
  }

  const exp = Number(payload.exp || 0);
  if (exp && Date.now() >= exp * 1000) {
    return {
      ok: false,
      status: 401,
      error: "access_token_expired",
      message: "The Cloudflare Access JWT has expired."
    };
  }

  const jwksUrl = `${teamDomain}/cdn-cgi/access/certs`;
  const certsResponse = await fetch(jwksUrl, {
    cf: {
      cacheEverything: true,
      cacheTtl: 3600
    }
  });
  if (!certsResponse.ok) {
    return {
      ok: false,
      status: 502,
      error: "access_certs_unavailable",
      message: "Could not fetch the Cloudflare Access signing keys."
    };
  }

  const certs = (await certsResponse.json()) as { keys?: Array<JsonWebKey> };
  const keys = Array.isArray(certs.keys) ? certs.keys : [];
  const keyId = String(header.kid || "").trim();
  const jwk = keys.find((candidate) => String(candidate.kid || "").trim() === keyId) || keys[0];
  if (!jwk) {
    return {
      ok: false,
      status: 401,
      error: "access_signing_key_missing",
      message: "No matching Cloudflare Access signing key was found."
    };
  }

  const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256"
  } as const;
  const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    algorithm,
    key,
    decodeBase64Url(signatureSegment),
    new TextEncoder().encode(`${headerSegment}.${payloadSegment}`)
  );
  if (!valid) {
    return {
      ok: false,
      status: 401,
      error: "access_signature_invalid",
      message: "The Cloudflare Access JWT signature is invalid."
    };
  }

  return {
    ok: true,
    payload
  };
}

function verifyBasicAuth(request: Request, env: Env) {
  const config = getBasicAuthConfig(env);
  if (!config.username || !config.password) {
    return {
      ok: false,
      status: 503,
      error: "basic_auth_not_configured",
      message:
        "Basic auth fallback is not configured yet. Set OPS_BASIC_AUTH_USERNAME and OPS_BASIC_AUTH_PASSWORD on the ops worker."
    };
  }

  const header = String(request.headers.get("authorization") || "").trim();
  if (!header.toLowerCase().startsWith("basic ")) {
    return {
      ok: false,
      status: 401,
      error: "basic_auth_required",
      message: "Basic auth is required for the private operator surface."
    };
  }

  try {
    const encoded = header.slice(6).trim();
    const decoded = new TextDecoder().decode(decodeBase64Url(encoded));
    const separatorIndex = decoded.indexOf(":");
    const username = decoded.slice(0, separatorIndex).trim().toLowerCase();
    const password = decoded.slice(separatorIndex + 1);
    if (separatorIndex <= 0 || username !== config.username || password !== config.password) {
      return {
        ok: false,
        status: 401,
        error: "basic_auth_invalid",
        message: "The operator basic auth credentials were not accepted."
      };
    }

    return {
      ok: true,
      email: username
    };
  } catch {
    return {
      ok: false,
      status: 401,
      error: "basic_auth_invalid",
      message: "The operator basic auth header could not be decoded."
    };
  }
}

async function getOperatorIdentity(request: Request, env: Env) {
  const accessConfigured =
    Boolean(String(env.CF_ACCESS_TEAM_DOMAIN || "").trim()) &&
    Boolean(String(env.CF_ACCESS_AUD || "").trim());

  let email = "";
  if (accessConfigured) {
    const verification = await verifyAccessJwt(request, env);
    if (!verification.ok) return verification;
    email = String(verification.payload.email || "")
      .trim()
      .toLowerCase();
  } else {
    const basicAuth = verifyBasicAuth(request, env);
    if (!basicAuth.ok) return basicAuth;
    email = String(basicAuth.email || "").trim().toLowerCase();
  }

  if (!email || !getAllowedEmails(env).has(email)) {
    return {
      ok: false,
      status: 403,
      error: "operator_not_allowed",
      message: "The authenticated Cloudflare Access identity is not allowlisted for ATEAM operator access."
    };
  }

  return {
    ok: true,
    operator: {
      email,
      role: sanitizeToken(env.ATEAM_PROXY_ROLE || "owner", "owner"),
      tenantId: sanitizeToken(env.ATEAM_PROXY_TENANT_ID || "owner_tenant", "owner_tenant"),
      workspaceId: sanitizeToken(env.ATEAM_PROXY_WORKSPACE_ID || "main_workspace", "main_workspace"),
      userId:
        sanitizeToken(env.ATEAM_PROXY_USER_ID || "", "") ||
        sanitizeToken(email.split("@")[0] || "owner", "owner")
    }
  };
}

function errorResponse(status: number, error: string, message: string) {
  return json(
    {
      ok: false,
      error,
      message
    },
    {
      status,
      headers:
        status === 401
          ? {
              "www-authenticate": 'Basic realm="ATEAM Ops", charset="UTF-8"'
            }
          : undefined
    }
  );
}

function normalizeProxyHeaders(headers: Headers, request: Request, env: Env, identity: OperatorIdentity) {
  const nextHeaders = new Headers(headers);
  [
    "host",
    "authorization",
    "x-ateam-tenant-id",
    "x-ateam-workspace-id",
    "x-ateam-user-id",
    "x-ateam-role",
    "x-ateam-operator-email",
    "x-ateam-proxy-key",
    "cf-access-jwt-assertion",
    "cf-access-authenticated-user-email"
  ].forEach((header) => nextHeaders.delete(header));
  nextHeaders.set("x-forwarded-host", new URL(request.url).host);
  nextHeaders.set("x-forwarded-proto", "https");
  nextHeaders.set("x-ateam-proxy-key", String(env.ATEAM_TRUSTED_PROXY_KEY || "").trim());
  nextHeaders.set("x-ateam-tenant-id", identity.tenantId);
  nextHeaders.set("x-ateam-workspace-id", identity.workspaceId);
  nextHeaders.set("x-ateam-user-id", identity.userId);
  nextHeaders.set("x-ateam-role", identity.role);
  nextHeaders.set("x-ateam-operator-email", identity.email);
  return nextHeaders;
}

function resolveUpstreamPath(pathname: string) {
  if (pathname === "/ateam/operator" || pathname === "/ateam/operator/") return "/";
  if (pathname.startsWith("/ateam/operator/")) {
    return pathname.slice("/ateam/operator".length) || "/";
  }
  if (pathname.startsWith("/api/operator/ateam/")) {
    return pathname.replace(/^\/api\/operator\/ateam/, "/api");
  }
  return "";
}

async function proxyOperatorRequest(
  request: Request,
  env: Env,
  identity: OperatorIdentity
): Promise<Response> {
  const origin = getUpstreamOrigin(env);
  const proxyKey = String(env.ATEAM_TRUSTED_PROXY_KEY || "").trim();
  if (!origin) {
    return json({ ok: false, error: "upstream_missing", message: "ATEAM upstream origin is not configured." }, { status: 503 });
  }
  if (!proxyKey) {
    return json(
      {
        ok: false,
        error: "trusted_proxy_missing",
        message: "ATEAM_TRUSTED_PROXY_KEY is required before the private operator surface can proxy requests."
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const upstreamPath = resolveUpstreamPath(url.pathname);
  if (!upstreamPath) {
    return json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const upstreamUrl = new URL(origin + upstreamPath + url.search);
  const upstreamRequest = new Request(upstreamUrl.toString(), {
    method: request.method,
    headers: normalizeProxyHeaders(request.headers, request, env, identity),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow"
  });

  const response = await fetch(upstreamRequest);
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-ateam-operator-email", identity.email);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const canonicalOpsOrigin = getCanonicalOpsOrigin(env, request);

    if (url.pathname === "/") {
      return redirect(`${canonicalOpsOrigin}/ateam/operator/office`, 302);
    }

    const accessResult = await getOperatorIdentity(request, env);
    if (!accessResult.ok) {
      return errorResponse(accessResult.status, accessResult.error, accessResult.message);
    }
    const identity = accessResult.operator;

    if (url.pathname === "/api/operator/session") {
      return json({
        ok: true,
        operator: identity
      });
    }

    if (url.pathname === "/ateam/operator" || url.pathname.startsWith("/ateam/operator/")) {
      return proxyOperatorRequest(request, env, identity);
    }

    if (url.pathname.startsWith("/api/operator/ateam/")) {
      return proxyOperatorRequest(request, env, identity);
    }

    return json({ ok: false, error: "not_found" }, { status: 404 });
  }
};
