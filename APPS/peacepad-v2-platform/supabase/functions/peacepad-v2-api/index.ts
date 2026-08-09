import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type DataRegion = "ca" | "us";

type RuntimeConfig = Readonly<{
  supabaseUrl: string;
  serviceRoleKey: string;
  region: DataRegion;
  projectRef: string;
  functionRegion: string;
  allowedOrigins: readonly string[];
}>;

type ErrorCode =
  | "AUTH_REQUIRED"
  | "CONFIGURATION_ERROR"
  | "DATABASE_NOT_READY"
  | "FAMILY_ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "IDENTITY_NOT_BOUND"
  | "IDEMPOTENCY_REQUIRED"
  | "INVITATION_EXPIRED"
  | "INVITATION_INVALID"
  | "INVITATION_RATE_LIMITED"
  | "INVITATION_REVOKED"
  | "INVITATION_USED"
  | "INVITATION_SELF_ACCEPT_DENIED"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "ORIGIN_NOT_ALLOWED"
  | "PROJECT_MISMATCH"
  | "REGION_MISMATCH"
  | "SCHEMA_MISMATCH"
  | "CONCURRENCY_CONFLICT"
  | "RUNTIME_REGION_MISMATCH";

const env = (name: string): string => Deno.env.get(name)?.trim() ?? "";

const readConfig = (): RuntimeConfig => {
  const region = env("PEACEPAD_REGION");
  const config: RuntimeConfig = {
    supabaseUrl: env("SUPABASE_URL"),
    serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    region: region as DataRegion,
    projectRef: env("PEACEPAD_PROJECT_REF"),
    functionRegion: env("PEACEPAD_FUNCTION_REGION"),
    allowedOrigins: env("PEACEPAD_ALLOWED_ORIGINS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
  if (
    !config.supabaseUrl ||
    !config.serviceRoleKey ||
    !config.projectRef ||
    !config.functionRegion ||
    !["ca", "us"].includes(config.region)
  ) {
    throw new Error("PeacePad staging function configuration is incomplete.");
  }
  const hostname = new URL(config.supabaseUrl).hostname;
  if (hostname !== `${config.projectRef}.supabase.co`) {
    throw new Error("PeacePad staging project reference does not match SUPABASE_URL.");
  }
  return config;
};

const requestPath = (request: Request): string => {
  const pathname = new URL(request.url).pathname;
  const marker = "/peacepad-v2-api";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return pathname;
  const suffix = pathname.slice(markerIndex + marker.length);
  return suffix || "/";
};

const corsHeaders = (request: Request, config?: RuntimeConfig): HeadersInit => {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && config?.allowedOrigins.includes(origin) ? origin : "";
  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-headers": "authorization, apikey, content-type, idempotency-key, if-match, x-client-info, x-expected-version, x-idempotency-key, x-peacepad-region, x-peacepad-schema-version, x-schema-version",
    "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "access-control-expose-headers": "x-request-id, x-peacepad-region, x-sb-edge-region",
    "cache-control": "no-store",
    vary: "Origin",
  };
};

const json = (
  request: Request,
  status: number,
  body: unknown,
  requestId: string,
  config?: RuntimeConfig,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, config),
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
      ...(config ? { "x-peacepad-region": config.region } : {}),
    },
  });

const failure = (
  request: Request,
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  config?: RuntimeConfig,
): Response => json(request, status, { error: { code, message, requestId } }, requestId, config);

const originAllowed = (request: Request, config: RuntimeConfig): boolean => {
  const origin = request.headers.get("origin");
  return !origin || config.allowedOrigins.includes(origin);
};

const bearerToken = (request: Request): string | null => {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
};

const writeHeaders = (request: Request, config: RuntimeConfig, requestId: string) => {
  const idempotencyKey = (request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key"))?.trim() ?? "";
  const schemaVersion = (request.headers.get("x-peacepad-schema-version") ?? request.headers.get("x-schema-version"))?.trim() ?? "";
  const requestedRegion = request.headers.get("x-peacepad-region")?.trim() ?? "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    return { error: failure(request, 400, "IDEMPOTENCY_REQUIRED", "A valid idempotency key is required.", requestId, config) } as const;
  }
  if (schemaVersion !== "2.0") {
    return { error: failure(request, 409, "SCHEMA_MISMATCH", "The write schema is not supported by this regional API.", requestId, config) } as const;
  }
  if (requestedRegion !== config.region) {
    return { error: failure(request, 409, "REGION_MISMATCH", "The write context does not match this regional API.", requestId, config) } as const;
  }
  return { idempotencyKey, schemaVersion: 2 } as const;
};

const readJsonObject = async (request: Request): Promise<Record<string, unknown> | null> => {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_384) return null;
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const rpcFailure = (request: Request, requestId: string, config: RuntimeConfig, message?: string) => {
  const directCodes: Partial<Record<string, ErrorCode>> = {
    REGION_MISMATCH: "REGION_MISMATCH",
    SCHEMA_MISMATCH: "SCHEMA_MISMATCH",
    IDENTITY_NOT_BOUND: "IDENTITY_NOT_BOUND",
    FAMILY_ACCESS_DENIED: "FAMILY_ACCESS_DENIED",
    INVITATION_EXPIRED: "INVITATION_EXPIRED",
    INVITATION_INVALID: "INVITATION_INVALID",
    INVITATION_REVOKED: "INVITATION_REVOKED",
    INVITATION_SELF_ACCEPT_DENIED: "INVITATION_SELF_ACCEPT_DENIED",
    INVITATION_USED: "INVITATION_USED",
    CONCURRENCY_CONFLICT: "CONCURRENCY_CONFLICT",
  };
  const invalidRequestCodes = new Set([
    "CONSENT_TYPE_INVALID", "DISPLAY_NAME_INVALID", "EXPECTED_VERSION_INVALID",
    "FAMILY_NAME_INVALID", "IDEMPOTENCY_KEY_INVALID", "INVITATION_EXPIRY_INVALID",
    "INVITATION_HASH_INVALID", "INVITATION_PERMISSIONS_INVALID", "INVITATION_ROLE_INVALID",
    "POLICY_VERSION_INVALID", "REGION_INVALID",
  ]);
  const safeCode = directCodes[message ?? ""] ?? (invalidRequestCodes.has(message ?? "") ? "INVALID_REQUEST" : "DATABASE_NOT_READY");
  const status = safeCode === "DATABASE_NOT_READY" ? 503
    : ["REGION_MISMATCH", "CONCURRENCY_CONFLICT"].includes(safeCode) ? 409
    : safeCode === "INVITATION_SELF_ACCEPT_DENIED" || safeCode === "FAMILY_ACCESS_DENIED" ? 403
    : 400;
  return failure(request, status, safeCode as ErrorCode, safeCode === "DATABASE_NOT_READY" ? "The regional staging database is not ready." : "The request could not be completed.", requestId, config);
};

const invitationCode = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
};

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const validateRuntimeBoundary = (
  request: Request,
  config: RuntimeConfig,
  requestId: string,
): Response | null => {
  if (!originAllowed(request, config)) {
    return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.", requestId, config);
  }
  const requestedRegion = request.headers.get("x-peacepad-region");
  if (requestedRegion && requestedRegion !== config.region) {
    return failure(request, 409, "REGION_MISMATCH", "The requested data region does not match this service.", requestId, config);
  }
  const runtimeRegion = env("SB_REGION");
  if (runtimeRegion && runtimeRegion !== config.functionRegion) {
    return failure(request, 503, "RUNTIME_REGION_MISMATCH", "The regional staging function is unavailable.", requestId, config);
  }
  return null;
};

const authenticate = async (request: Request, config: RuntimeConfig) => {
  const token = bearerToken(request);
  if (!token) return null;
  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : { admin, user: data.user };
};

const handler = async (request: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  let config: RuntimeConfig;
  try {
    config = readConfig();
  } catch {
    return failure(request, 503, "CONFIGURATION_ERROR", "The staging service is not configured.", requestId);
  }

  if (request.method === "OPTIONS") {
    if (!originAllowed(request, config)) {
      return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.", requestId, config);
    }
    return new Response(null, { status: 204, headers: corsHeaders(request, config) });
  }

  const boundaryFailure = validateRuntimeBoundary(request, config, requestId);
  if (boundaryFailure) return boundaryFailure;

  const path = requestPath(request);
  if (request.method === "GET" && path === "/health") {
    return json(request, 200, { status: "ok", environment: "fictional-staging", region: config.region }, requestId, config);
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (request.method === "GET" && path === "/readyz") {
    const { data, error } = await admin.rpc("peacepad_v2_ready");
    return error || data !== true
      ? failure(request, 503, "DATABASE_NOT_READY", "The regional staging database is not ready.", requestId, config)
      : json(request, 200, { status: "ready", environment: "fictional-staging", region: config.region }, requestId, config);
  }

  if (path === "/api/v2/session" && request.method !== "GET") {
    return failure(request, 405, "METHOD_NOT_ALLOWED", "Method not allowed.", requestId, config);
  }
  if (request.method === "GET" && path === "/api/v2/session") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) {
      return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    }
    const { data: bindings, error } = await authenticated.admin.rpc("peacepad_v2_get_region_binding", {
      p_identity_id: authenticated.user.id,
    });
    if (error) {
      return failure(request, 503, "DATABASE_NOT_READY", "The regional staging database is not ready.", requestId, config);
    }
    const binding = Array.isArray(bindings) ? bindings[0] : null;
    if (!binding) {
      return failure(request, 409, "IDENTITY_NOT_BOUND", "This fictional staging identity has not been assigned to a region.", requestId, config);
    }
    if (binding.region !== config.region) {
      return failure(request, 409, "REGION_MISMATCH", "The identity belongs to a different data region.", requestId, config);
    }
    return json(request, 200, {
      actor: {
        identityId: authenticated.user.id,
        displayName: authenticated.user.user_metadata?.display_name ?? null,
      },
      region: binding.region,
      schemaVersion: "2.0",
    }, requestId, config);
  }

  if (request.method === "POST" && path === "/api/v2/invitations/resolve") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const body = await readJsonObject(request);
    const code = typeof body?.code === "string" ? body.code.replace(/\s+/g, "").toUpperCase() : "";
    if (!/^[A-Z0-9]{6}$/.test(code)) return failure(request, 400, "INVITATION_INVALID", "Enter a valid invitation code.", requestId, config);
    const hash = await sha256Hex(`${config.region}:${code}`);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_resolve_invitation", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_code_hash: `\\x${hash}`,
    });
    if (error) return rpcFailure(request, requestId, config, error.message);
    const result = (data ?? {}) as Record<string, unknown>;
    const errorCode = typeof result.errorCode === "string" ? result.errorCode as ErrorCode : null;
    if (errorCode) {
      const status = errorCode === "INVITATION_RATE_LIMITED" ? 429 : errorCode === "REGION_MISMATCH" ? 409 : 400;
      return failure(request, status, errorCode, errorCode === "INVITATION_RATE_LIMITED" ? "Too many invitation attempts. Try again later." : "That invitation is not available.", requestId, config);
    }
    return json(request, 200, result, requestId, config);
  }

  if (request.method === "POST" && ([
    "/api/v2/session/bootstrap",
    "/api/v2/consents",
    "/api/v2/families",
    "/api/v2/invitations",
  ].includes(path) || /^\/api\/v2\/invitations\/[^/]+\/accept$/.test(path))) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) {
      return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    }
    const context = writeHeaders(request, config, requestId);
    if ("error" in context) return context.error;
    const body = await readJsonObject(request);
    if (!body) return failure(request, 400, "INVALID_REQUEST", "A valid request body is required.", requestId, config);

    if (path === "/api/v2/session/bootstrap") {
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_bootstrap_identity", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_display_name: displayName,
        p_idempotency_key: context.idempotencyKey,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (path === "/api/v2/consents") {
      const requestedConsentType = typeof body.consentType === "string" ? body.consentType : "";
      const consentType = requestedConsentType === "ai-message-assistance" ? "third_party_ai" : requestedConsentType;
      const policyVersion = typeof body.policyVersion === "string" ? body.policyVersion : "";
      if (typeof body.granted !== "boolean") return failure(request, 400, "INVALID_REQUEST", "Consent status is required.", requestId, config);
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_record_consent", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_consent_type: consentType,
        p_granted: body.granted,
        p_policy_version: policyVersion,
        p_idempotency_key: context.idempotencyKey,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (path === "/api/v2/families") {
      const familyName = typeof body.familyName === "string" ? body.familyName.trim() : "";
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_create_family", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_family_name: familyName,
        p_idempotency_key: context.idempotencyKey,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    const acceptMatch = path.match(/^\/api\/v2\/invitations\/([^/]+)\/accept$/);
    if (acceptMatch) {
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_accept_invitation", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_invitation_id: decodeURIComponent(acceptMatch[1]),
        p_expected_version: expectedVersion,
        p_idempotency_key: context.idempotencyKey,
        p_schema_version: context.schemaVersion,
      });
      if (error) return rpcFailure(request, requestId, config, error.message);
      const grant = (data ?? {}) as Record<string, unknown>;
      const grantedAt = typeof grant.grantedAt === "string" ? grant.grantedAt : new Date().toISOString();
      return json(request, 200, {
        id: grant.participantGrantId,
        familyCircleId: grant.familyId,
        identityId: grant.identityId,
        role: grant.role,
        permissions: grant.permissions,
        grantedAt,
        revokedAt: null,
        grantedBy: grant.grantedBy,
        schemaVersion: "2.0",
        version: grant.version,
        region: grant.region,
        provenance: {
          createdAt: grantedAt,
          createdBy: { identityId: authenticated.user.id, sessionId: requestId },
          source: "app",
        },
      }, requestId, config);
    }

    const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
    const invitedRole = typeof body.invitedRole === "string" ? body.invitedRole : "";
    const permissions = Array.isArray(body.permissions) && body.permissions.every((value) => typeof value === "string") ? [...new Set(body.permissions as string[])] : [];
    const expiresInHours = typeof body.expiresInHours === "number" ? body.expiresInHours : 0;
    const allowedPermissions = new Set(["messages", "calendar", "shared-records"]);
    if (!familyId || !["parent", "caregiver", "professional"].includes(invitedRole) || permissions.length > 8 || permissions.some((permission) => !allowedPermissions.has(permission)) || expiresInHours < 1 || expiresInHours > 168) {
      return failure(request, 400, "INVALID_REQUEST", "Invitation details are invalid.", requestId, config);
    }
    const code = invitationCode();
    const hash = await sha256Hex(`${config.region}:${code}`);
    const expiresAt = new Date(Date.now() + expiresInHours * 3_600_000).toISOString();
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_create_invitation", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_family_id: familyId,
      p_code_hash: `\\x${hash}`,
      p_invited_role: invitedRole,
      p_permissions: permissions,
      p_expires_at: expiresAt,
      p_idempotency_key: context.idempotencyKey,
      p_schema_version: context.schemaVersion,
    });
    const invitationData = (data ?? {}) as Record<string, unknown>;
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, {
      invitation: {
        id: invitationData.invitationId,
        familyCircleId: invitationData.familyId,
        invitedRole: invitationData.invitedRole,
        permissions: invitationData.permissions,
        invitedByIdentityId: authenticated.user.id,
        expiresAt: invitationData.expiresAt,
        status: invitationData.status,
        acceptedParticipantGrantId: null,
        schemaVersion: "2.0",
        version: invitationData.version,
        region: invitationData.region,
        provenance: {
          createdAt: typeof invitationData.createdAt === "string" ? invitationData.createdAt : new Date().toISOString(),
          createdBy: { identityId: authenticated.user.id, sessionId: requestId },
          source: "app",
        },
      },
      code,
      deepLink: `peacepad://invite/${code}`,
    }, requestId, config);
  }

  return failure(request, 404, "NOT_FOUND", "Route not found.", requestId, config);
};

Deno.serve(handler);
