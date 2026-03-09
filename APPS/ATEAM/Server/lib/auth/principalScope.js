function sanitizeScopeToken(value, fallback = "") {
  const raw = String(value ?? "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return safe || String(fallback || "").trim();
}

function createScopeError(code, message, status = 400, details = null) {
  const err = new Error(String(message || code || "scope_error"));
  err.code = String(code || "SCOPE_ERROR");
  err.status = Number(status) || 400;
  err.details = details ?? null;
  return err;
}

function resolveLocalPrincipal() {
  return {
    mode: "local",
    authenticated: false,
    tenantId: sanitizeScopeToken(process.env.ATEAM_LOCAL_TENANT_ID, "local_tenant"),
    workspaceId: sanitizeScopeToken(process.env.ATEAM_LOCAL_WORKSPACE_ID, "local_workspace"),
    userId: sanitizeScopeToken(process.env.ATEAM_LOCAL_USER_ID, "local_user")
  };
}

function resolveHeaderPrincipal(req) {
  const tenantId = sanitizeScopeToken(req.headers["x-ateam-tenant-id"]);
  const workspaceId = sanitizeScopeToken(req.headers["x-ateam-workspace-id"]);
  const userId = sanitizeScopeToken(req.headers["x-ateam-user-id"]);
  if (!tenantId || !workspaceId || !userId) {
    throw createScopeError(
      "AUTH_REQUIRED",
      "missing_scope_headers",
      401,
      "x-ateam-tenant-id, x-ateam-workspace-id, x-ateam-user-id are required"
    );
  }
  return {
    mode: "header",
    authenticated: true,
    tenantId,
    workspaceId,
    userId
  };
}

function parseJwtPayloadUnsafe(token = "") {
  const raw = String(token || "").trim();
  const parts = raw.split(".");
  if (parts.length < 2) {
    throw createScopeError("AUTH_REQUIRED", "invalid_bearer_token", 401, "jwt_payload_missing");
  }
  const payloadSegment = parts[1];
  const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  let decoded = "";
  try {
    decoded = Buffer.from(padded, "base64").toString("utf8");
  } catch {
    throw createScopeError("AUTH_REQUIRED", "invalid_bearer_token", 401, "jwt_payload_decode_failed");
  }
  try {
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("jwt_payload_invalid");
    }
    return parsed;
  } catch {
    throw createScopeError("AUTH_REQUIRED", "invalid_bearer_token", 401, "jwt_payload_parse_failed");
  }
}

function firstClaim(payload, keys = []) {
  for (const key of keys) {
    const value = payload?.[key];
    const safe = sanitizeScopeToken(value);
    if (safe) return safe;
  }
  return "";
}

function resolveJwtPrincipal(req) {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw createScopeError("AUTH_REQUIRED", "missing_bearer_token", 401, "authorization bearer token required");
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw createScopeError("AUTH_REQUIRED", "missing_bearer_token", 401, "authorization bearer token required");
  }

  const payload = parseJwtPayloadUnsafe(token);
  const tenantId = firstClaim(payload, ["tenant_id", "tenantId", "tid"]);
  const workspaceId = firstClaim(payload, ["workspace_id", "workspaceId", "wid"]);
  const userId = firstClaim(payload, ["user_id", "userId", "sub"]);
  const role = firstClaim(payload, ["role", "roles"]);
  const expRaw = Number(payload?.exp);
  if (!tenantId || !workspaceId || !userId || !role || !Number.isFinite(expRaw)) {
    throw createScopeError(
      "AUTH_REQUIRED",
      "missing_required_jwt_claims",
      401,
      "required claims: tenant_id, workspace_id, user_id/sub, role, exp"
    );
  }
  if (Date.now() >= expRaw * 1000) {
    throw createScopeError("AUTH_REQUIRED", "token_expired", 401, "jwt_expired");
  }

  return {
    mode: "jwt",
    authenticated: true,
    tenantId,
    workspaceId,
    userId,
    role,
    exp: expRaw
  };
}

function resolvePrincipal(req, mode = "local") {
  const normalized = String(mode || "local").trim().toLowerCase();
  if (normalized === "jwt") return resolveJwtPrincipal(req);
  if (normalized === "header") return resolveHeaderPrincipal(req);
  return resolveLocalPrincipal();
}

export function createPrincipalScopeMiddleware({ mode = "local" } = {}) {
  return function principalScopeMiddleware(req, res, next) {
    try {
      req.principal = resolvePrincipal(req, mode);
      next();
    } catch (err) {
      const status = Number(err?.status || 401);
      return res.status(status).json({
        ok: false,
        error: String(err?.code || "AUTH_REQUIRED"),
        details: String(err?.details || err?.message || "missing principal scope")
      });
    }
  };
}

export function normalizeScopedResourceId(rawValue, principal, { fallback = "" } = {}) {
  const raw = String(rawValue ?? "").trim();
  const fallbackValue = String(fallback || "").trim();
  if (!raw) return fallbackValue;

  const sep = "::";
  if (!raw.includes(sep)) return raw;

  const parts = raw.split(sep);
  if (parts.length !== 2) {
    throw createScopeError("SCOPE_INVALID_ID", "invalid_scoped_resource_id", 400);
  }

  const workspaceToken = sanitizeScopeToken(parts[0]);
  const resourceId = String(parts[1] || "").trim();
  if (!workspaceToken || !resourceId) {
    throw createScopeError("SCOPE_INVALID_ID", "invalid_scoped_resource_id", 400);
  }

  const currentWorkspace = sanitizeScopeToken(principal?.workspaceId);
  if (!currentWorkspace || workspaceToken !== currentWorkspace) {
    throw createScopeError("SCOPE_FORBIDDEN", "cross_workspace_resource_access", 403);
  }

  return resourceId;
}
