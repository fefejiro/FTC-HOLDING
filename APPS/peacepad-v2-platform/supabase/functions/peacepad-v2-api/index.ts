import { createClient } from "npm:@supabase/supabase-js@2.105.3";
import { validateAudioCallSignal } from "./signaling.ts";
import { createTurnCredential, parseTurnUrls } from "./turn.ts";

type DataRegion = "ca" | "us";
type DeploymentEnvironment = "fictional-staging" | "production";

type RuntimeConfig = Readonly<{
  supabaseUrl: string;
  serviceRoleKey: string;
  region: DataRegion;
  projectRef: string;
  functionRegion: string;
  allowedOrigins: readonly string[];
  maintenanceSecret: string;
  idempotencySecret: string;
  turnUrls: readonly string[];
  turnSharedSecret: string;
  environment: DeploymentEnvironment;
  productionWritesEnabled: boolean;
}>;

type ErrorCode =
  | "AI_CONSENT_REQUIRED"
  | "AUTH_REQUIRED"
  | "CALENDAR_ACCESS_DENIED"
  | "CALL_ACCESS_DENIED"
  | "CALL_ALREADY_ACTIVE"
  | "CALL_STATE_INVALID"
  | "CONFIGURATION_ERROR"
  | "CONVERSATION_ACCESS_DENIED"
  | "DATABASE_NOT_READY"
  | "FAMILY_ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "IDENTITY_DELETED"
  | "IDENTITY_NOT_BOUND"
  | "IDEMPOTENCY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_UPSTREAM_RESPONSE"
  | "INVITATION_EXPIRED"
  | "INVITATION_INVALID"
  | "INVITATION_RATE_LIMITED"
  | "INVITATION_REVOKED"
  | "INVITATION_USED"
  | "INVITATION_SELF_ACCEPT_DENIED"
  | "METHOD_NOT_ALLOWED"
  | "MESSAGE_ACCESS_DENIED"
  | "MESSAGE_CHECK_DISABLED"
  | "MAINTENANCE_AUTH_REQUIRED"
  | "NOT_FOUND"
  | "ORIGIN_NOT_ALLOWED"
  | "PROJECT_MISMATCH"
  | "PRODUCTION_WRITES_DISABLED"
  | "REGION_MISMATCH"
  | "SCHEMA_MISMATCH"
  | "CONCURRENCY_CONFLICT"
  | "RUNTIME_REGION_MISMATCH"
  | "SESSION_REVOCATION_FAILED"
  | "SIGNAL_DELIVERY_UNAVAILABLE"
  | "SIGNAL_RATE_LIMITED"
  | "STORAGE_OBJECT_INVALID"
  | "STORAGE_UNAVAILABLE"
  | "TURN_CREDENTIALS_UNAVAILABLE";

const PRIVATE_RECORDS_BUCKET = "peacepad-private-records";

const env = (name: string): string => Deno.env.get(name)?.trim() ?? "";

const readConfig = (): RuntimeConfig => {
  const region = env("PEACEPAD_REGION");
  const environment = env("PEACEPAD_RUNTIME_ENVIRONMENT") || "fictional-staging";
  const productionWritesSetting = env("PEACEPAD_PRODUCTION_WRITES_ENABLED");
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
    maintenanceSecret: env("PEACEPAD_MAINTENANCE_SECRET"),
    idempotencySecret: env("PEACEPAD_IDEMPOTENCY_SECRET"),
    turnUrls: parseTurnUrls(env("PEACEPAD_TURN_URLS")),
    turnSharedSecret: env("PEACEPAD_TURN_SHARED_SECRET"),
    environment: environment as DeploymentEnvironment,
    // Production starts fail-closed. It can only accept writes after an explicit,
    // separately reviewed enablement change.
    productionWritesEnabled: environment === "production" && productionWritesSetting === "true",
  };
  if (
    !config.supabaseUrl ||
    !config.serviceRoleKey ||
    !config.projectRef ||
    !config.functionRegion ||
    config.idempotencySecret.length < 32 ||
    !["ca", "us"].includes(config.region) ||
    !["fictional-staging", "production"].includes(config.environment) ||
    (config.environment === "production" && !["true", "false"].includes(productionWritesSetting))
  ) {
    throw new Error("PeacePad regional function configuration is incomplete.");
  }
  const hostname = new URL(config.supabaseUrl).hostname;
  if (hostname !== `${config.projectRef}.supabase.co`) {
    throw new Error("PeacePad project reference does not match SUPABASE_URL.");
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
    "access-control-allow-headers": "authorization, apikey, content-type, idempotency-key, if-match, x-client-info, x-expected-version, x-idempotency-key, x-peacepad-region, x-peacepad-schema-version, x-region, x-schema-version",
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

const constantTimeEqual = (left: string, right: string): boolean => {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
};

const authUserMissing = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown };
  return candidate.code === "user_not_found";
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type WriteHeadersResult =
  | { ok: true; idempotencyKey: string; schemaVersion: 2 }
  | { ok: false; error: Response };

const writeHeaders = (request: Request, config: RuntimeConfig, requestId: string): WriteHeadersResult => {
  const idempotencyKey = (request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key"))?.trim() ?? "";
  const schemaVersion = (request.headers.get("x-peacepad-schema-version") ?? request.headers.get("x-schema-version"))?.trim() ?? "";
  const requestedRegion = request.headers.get("x-peacepad-region")?.trim() ?? "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    return { ok: false, error: failure(request, 400, "IDEMPOTENCY_REQUIRED", "A valid idempotency key is required.", requestId, config) };
  }
  if (schemaVersion !== "2.0") {
    return { ok: false, error: failure(request, 409, "SCHEMA_MISMATCH", "The write schema is not supported by this regional API.", requestId, config) };
  }
  if (requestedRegion !== config.region) {
    return { ok: false, error: failure(request, 409, "REGION_MISMATCH", "The write context does not match this regional API.", requestId, config) };
  }
  return { ok: true, idempotencyKey, schemaVersion: 2 };
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
    IDENTITY_DELETED: "IDENTITY_DELETED",
    IDENTITY_NOT_BOUND: "IDENTITY_NOT_BOUND",
    FAMILY_ACCESS_DENIED: "FAMILY_ACCESS_DENIED",
    CONVERSATION_ACCESS_DENIED: "CONVERSATION_ACCESS_DENIED",
    CALENDAR_ACCESS_DENIED: "CALENDAR_ACCESS_DENIED",
    CALL_ACCESS_DENIED: "CALL_ACCESS_DENIED",
    CALL_ALREADY_ACTIVE: "CALL_ALREADY_ACTIVE",
    CALL_STATE_INVALID: "CALL_STATE_INVALID",
    SIGNAL_RATE_LIMITED: "SIGNAL_RATE_LIMITED",
    CASE_BINDER_ACCESS_DENIED: "FAMILY_ACCESS_DENIED",
    ATTACHMENT_ACCESS_DENIED: "FAMILY_ACCESS_DENIED",
    TIMELINE_SOURCE_ACCESS_DENIED: "FAMILY_ACCESS_DENIED",
    MESSAGE_ACCESS_DENIED: "MESSAGE_ACCESS_DENIED",
    AI_CONSENT_REQUIRED: "AI_CONSENT_REQUIRED",
    INVITATION_EXPIRED: "INVITATION_EXPIRED",
    INVITATION_INVALID: "INVITATION_INVALID",
    INVITATION_REVOKED: "INVITATION_REVOKED",
    INVITATION_SELF_ACCEPT_DENIED: "INVITATION_SELF_ACCEPT_DENIED",
    INVITATION_USED: "INVITATION_USED",
    CONCURRENCY_CONFLICT: "CONCURRENCY_CONFLICT",
    IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  };
  const invalidRequestCodes = new Set([
    "CONSENT_TYPE_INVALID", "DISPLAY_NAME_INVALID", "EXPECTED_VERSION_INVALID",
    "FAMILY_NAME_INVALID", "IDEMPOTENCY_KEY_INVALID", "INVITATION_EXPIRY_INVALID",
    "INVITATION_HASH_INVALID", "INVITATION_PERMISSIONS_INVALID", "INVITATION_ROLE_INVALID",
    "CONVERSATION_PARTICIPANTS_INVALID", "MESSAGE_BODY_INVALID", "MESSAGE_CORRECTION_UNCHANGED",
    "MESSAGE_EVENT_INVALID", "MESSAGE_SEARCH_INVALID", "POLICY_VERSION_INVALID", "REGION_INVALID",
    "CALENDAR_LAYER_INVALID", "CALENDAR_LAYER_NOT_EMPTY", "SCHEDULE_EVENT_INVALID", "MESSAGE_CHECK_INVALID",
    "CASE_BINDER_INVALID", "ATTACHMENT_INTENT_INVALID", "ATTACHMENT_INTENT_EXPIRED",
    "ATTACHMENT_OBJECT_MISMATCH", "ATTACHMENT_STATE_INVALID", "CASE_BINDER_ARCHIVED",
    "TIMELINE_REQUEST_INVALID", "TIMELINE_SOURCE_INVALID", "TIMELINE_SOURCE_ALREADY_LINKED",
  ]);
  const safeCode = directCodes[message ?? ""] ?? (invalidRequestCodes.has(message ?? "") ? "INVALID_REQUEST" : "DATABASE_NOT_READY");
  const status = safeCode === "DATABASE_NOT_READY" ? 503
    : safeCode === "SIGNAL_RATE_LIMITED" ? 429
    : ["REGION_MISMATCH", "CONCURRENCY_CONFLICT", "IDEMPOTENCY_CONFLICT", "CALL_ALREADY_ACTIVE", "CALL_STATE_INVALID"].includes(safeCode) ? 409
    : ["AI_CONSENT_REQUIRED", "INVITATION_SELF_ACCEPT_DENIED", "FAMILY_ACCESS_DENIED", "CONVERSATION_ACCESS_DENIED", "MESSAGE_ACCESS_DENIED", "MESSAGE_CHECK_DISABLED", "CALENDAR_ACCESS_DENIED", "CALL_ACCESS_DENIED"].includes(safeCode) ? 403
    : 400;
  return failure(request, status, safeCode as ErrorCode, safeCode === "DATABASE_NOT_READY" ? "The regional staging database is not ready." : "The request could not be completed.", requestId, config);
};

const hmacHex = async (secret: string, value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const invitationCode = async (
  config: RuntimeConfig,
  identityId: string,
  clientIdempotencyKey: string,
): Promise<string> => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const digest = await hmacHex(
    config.idempotencySecret,
    `peacepad:v2:invitation:${config.region}:${identityId}:${clientIdempotencyKey}`,
  );
  const bytes = Uint8Array.from(
    Array.from({ length: 6 }, (_, index) => Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16)),
  );
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
};

const writeOperation = (method: string, path: string, body: Record<string, unknown>): string | null => {
  if (method === "POST" && path === "/api/v2/session/bootstrap") return "identity.bootstrapped";
  if (method === "POST" && path === "/api/v2/consents") return "consent.recorded";
  if (method === "POST" && path === "/api/v2/families") return "family.created";
  if (method === "POST" && path === "/api/v2/invitations") return "invitation.created";
  if (method === "DELETE" && path === "/api/v2/account") return "account.deleted";
  if (method === "POST" && path === "/api/v2/conversations") return "conversation.created";
  if (method === "PUT" && /^\/api\/v2\/conversations\/[^/]+\/message-check$/.test(path)) return "message_check.updated";
  if (method === "POST" && /^\/api\/v2\/conversations\/[^/]+\/messages$/.test(path)) return "message.sent";
  if (method === "POST" && /^\/api\/v2\/conversations\/[^/]+\/messages\/[^/]+\/corrections$/.test(path)) return "message.corrected";
  if (method === "POST" && /^\/api\/v2\/conversations\/[^/]+\/messages\/[^/]+\/events$/.test(path)) {
    return typeof body.eventType === "string" ? `message.${body.eventType}` : null;
  }
  if (method === "POST" && path === "/api/v2/calendar-layers") return "calendar_layer.created";
  if (method === "PATCH" && /^\/api\/v2\/calendar-layers\/[^/]+$/.test(path)) return "calendar_layer.updated";
  if (method === "DELETE" && /^\/api\/v2\/calendar-layers\/[^/]+$/.test(path)) return "calendar_layer.deleted";
  if (method === "POST" && path === "/api/v2/schedule-events") return "schedule_event.created";
  if (method === "PATCH" && /^\/api\/v2\/schedule-events\/[^/]+$/.test(path)) return "schedule_event.updated";
  if (method === "DELETE" && /^\/api\/v2\/schedule-events\/[^/]+$/.test(path)) return "schedule_event.deleted";
  if (method === "POST" && path === "/api/v2/case-binders") return "case_binder.created";
  if (method === "PATCH" && /^\/api\/v2\/case-binders\/[^/]+$/.test(path)) return "case_binder.archived";
  if (method === "POST" && path === "/api/v2/attachment-upload-intents") return "attachment_intent.prepared";
  if (method === "POST" && /^\/api\/v2\/attachments\/[^/]+\/complete$/.test(path)) return "attachment.uploaded";
  if (method === "POST" && path === "/api/v2/timeline-entries") return "timeline_entry.linked";
  if (method === "POST" && path === "/api/v2/calls") return "call.created";
  const callTransition = path.match(/^\/api\/v2\/calls\/[^/]+\/(accept|decline|end)$/);
  if (method === "POST" && callTransition) {
    return callTransition[1] === "accept" ? "call.accepted"
      : callTransition[1] === "decline" ? "call.declined"
      : "call.ended";
  }
  const invitationTransition = path.match(/^\/api\/v2\/invitations\/[^/]+\/(accept|decline)$/);
  if (method === "POST" && invitationTransition) {
    return invitationTransition[1] === "accept" ? "invitation.accepted" : "invitation.declined";
  }
  if (method === "DELETE" && /^\/api\/v2\/invitations\/[^/]+$/.test(path)) return "invitation.revoked";
  return null;
};

const databaseIdempotencyToken = async (
  config: RuntimeConfig,
  identityId: string,
  clientIdempotencyKey: string,
  operation: string,
  requestDescriptor: Record<string, unknown>,
): Promise<string> => {
  if (!/^[a-z0-9_.]{1,40}$/.test(operation)) throw new Error("Unsupported write operation.");
  const clientKeyHash = await hmacHex(
    config.idempotencySecret,
    `peacepad:v2:key:${identityId}:${clientIdempotencyKey}`,
  );
  const fingerprint = await hmacHex(
    config.idempotencySecret,
    `peacepad:v2:request:${JSON.stringify(canonicalize(requestDescriptor))}`,
  );
  return `v2:${clientKeyHash.slice(0, 48)}:${operation}:${fingerprint.slice(0, 48)}`;
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

const verifiedSessionId = (request: Request): string | null => {
  const token = bearerToken(request);
  const encodedPayload = token?.split(".")[1];
  if (!encodedPayload) return null;
  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { session_id?: unknown };
    return typeof payload.session_id === "string" && isUuid(payload.session_id)
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
};

const handler = async (request: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  let config: RuntimeConfig;
  try {
    config = readConfig();
  } catch {
    return failure(request, 503, "CONFIGURATION_ERROR", "The regional service is not configured.", requestId);
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
    return json(request, 200, { status: "ok", environment: config.environment, region: config.region, writesEnabled: config.productionWritesEnabled }, requestId, config);
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (request.method === "GET" && path === "/readyz") {
    const { data, error } = await admin.rpc("peacepad_v2_ready");
    return error || data !== true
      ? failure(request, 503, "DATABASE_NOT_READY", "The regional database is not ready.", requestId, config)
      : json(request, 200, { status: "ready", environment: config.environment, region: config.region, writesEnabled: config.productionWritesEnabled }, requestId, config);
  }

  if (
    config.environment === "production" &&
    !config.productionWritesEnabled &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
  ) {
    return failure(
      request,
      503,
      "PRODUCTION_WRITES_DISABLED",
      "Production writes are not enabled.",
      requestId,
      config,
    );
  }

  if (request.method === "POST" && path === "/internal/v2/auth-cleanup/run") {
    const suppliedSecret = request.headers.get("x-peacepad-maintenance-secret")?.trim() ?? "";
    if (
      config.maintenanceSecret.length < 32 ||
      suppliedSecret.length < 32 ||
      !constantTimeEqual(suppliedSecret, config.maintenanceSecret)
    ) {
      return failure(request, 401, "MAINTENANCE_AUTH_REQUIRED", "Maintenance authorization is required.", requestId, config);
    }
    const { error: receiptExpiryError } = await admin.rpc("peacepad_v2_expire_write_receipts", {
      p_region: config.region,
    });
    if (receiptExpiryError) {
      return failure(request, 503, "DATABASE_NOT_READY", "The regional receipt cleanup is unavailable.", requestId, config);
    }
    const { data: claimed, error: claimError } = await admin.rpc("peacepad_v2_claim_auth_cleanup", {
      p_region: config.region,
      p_limit: 10,
      p_lease_seconds: 120,
    });
    if (claimError) {
      return failure(request, 503, "DATABASE_NOT_READY", "The regional cleanup queue is unavailable.", requestId, config);
    }
    let completed = 0;
    let rescheduled = 0;
    let failedToFinalize = 0;
    for (const job of Array.isArray(claimed) ? claimed : []) {
      if (!job || !isUuid(job.identity_id) || !isUuid(job.lease_token) || job.region !== config.region) {
        failedToFinalize += 1;
        continue;
      }
      const deletion = await admin.auth.admin.deleteUser(job.identity_id, false);
      const succeeded = !deletion.error || authUserMissing(deletion.error);
      const { error: finishError } = await admin.rpc("peacepad_v2_finish_auth_cleanup", {
        p_identity_id: job.identity_id,
        p_lease_token: job.lease_token,
        p_succeeded: succeeded,
        p_failure_code: succeeded ? null : "AUTH_DELETE_FAILED",
      });
      if (finishError) failedToFinalize += 1;
      else if (succeeded) completed += 1;
      else rescheduled += 1;
    }
    const { data: storageJobs, error: storageClaimError } = await admin.rpc(
      "peacepad_v2_claim_private_storage_cleanup",
      { p_region: config.region, p_limit: 25, p_lease_seconds: 120 },
    );
    if (storageClaimError) {
      return failure(request, 503, "DATABASE_NOT_READY", "The private storage cleanup queue is unavailable.", requestId, config);
    }
    let storageCompleted = 0;
    let storageRescheduled = 0;
    let storageFailedToFinalize = 0;
    for (const job of Array.isArray(storageJobs) ? storageJobs : []) {
      if (!job || typeof job.object_path !== "string" || !isUuid(job.lease_token) || job.region !== config.region) {
        storageFailedToFinalize += 1;
        continue;
      }
      const removal = await admin.storage.from(PRIVATE_RECORDS_BUCKET).remove([job.object_path]);
      const succeeded = !removal.error;
      const { error: finishError } = await admin.rpc("peacepad_v2_finish_private_storage_cleanup", {
        p_object_path: job.object_path,
        p_lease_token: job.lease_token,
        p_succeeded: succeeded,
      });
      if (finishError) storageFailedToFinalize += 1;
      else if (succeeded) storageCompleted += 1;
      else storageRescheduled += 1;
    }
    return json(request, 200, {
      claimed: Array.isArray(claimed) ? claimed.length : 0,
      completed,
      rescheduled,
      failedToFinalize,
      storageClaimed: Array.isArray(storageJobs) ? storageJobs.length : 0,
      storageCompleted,
      storageRescheduled,
      storageFailedToFinalize,
      region: config.region,
    }, requestId, config);
  }

  if (path === "/api/v2/session" && request.method !== "GET") {
    return failure(request, 405, "METHOD_NOT_ALLOWED", "Method not allowed.", requestId, config);
  }
  if (request.method === "GET" && path === "/api/v2/session") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) {
      return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    }
    const { data: bindings, error } = await authenticated.admin.rpc("peacepad_v2_get_session_binding", {
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
    const sessionId = verifiedSessionId(request);
    if (!sessionId) {
      return failure(request, 401, "AUTH_REQUIRED", "The verified staging session is missing required context.", requestId, config);
    }
    const { data: memberships, error: membershipError } = await authenticated.admin.rpc("peacepad_v2_list_active_memberships", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
    });
    if (membershipError) {
      return failure(request, 503, "DATABASE_NOT_READY", "The regional staging database is not ready.", requestId, config);
    }
    return json(request, 200, {
      actor: {
        identityId: authenticated.user.id,
        sessionId,
        displayName: authenticated.user.user_metadata?.display_name ?? null,
        version: binding.identity_version,
      },
      memberships: Array.isArray(memberships) ? memberships : [],
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

  const conversationMessagesMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/messages$/);
  const conversationSearchMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/messages\/search$/);
  const conversationMessageCheckMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/message-check$/);
  if (request.method === "GET" && conversationMessageCheckMatch) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const conversationId = decodeURIComponent(conversationMessageCheckMatch[1]);
    if (!isUuid(conversationId)) return failure(request, 400, "INVALID_REQUEST", "A valid conversation is required.", requestId, config);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_get_message_check", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_conversation_id: conversationId,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data, requestId, config);
  }

  if (request.method === "POST" && path === "/api/v2/message-previews") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const body = await readJsonObject(request);
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
    const content = typeof body?.content === "string" ? body.content : "";
    if (!isUuid(conversationId) || !content.trim() || content.length > 4000) {
      return failure(request, 400, "INVALID_REQUEST", "Message preview details are invalid.", requestId, config);
    }
    const { data: authorized, error } = await authenticated.admin.rpc("peacepad_v2_authorize_message_preview", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_conversation_id: conversationId,
    });
    if (error) return rpcFailure(request, requestId, config, error.message);
    if (authorized !== true) return failure(request, 403, "MESSAGE_CHECK_DISABLED", "Turn on Message Check for this conversation first.", requestId, config);
    const needsPause = /\b(always|never|your fault|lying|liar|useless)\b|!{2,}/i.test(content);
    return json(request, 200, {
      tone: needsPause ? "pause suggested" : "clear",
      summary: needsPause ? "This draft may read as absolute or accusatory." : "This draft is direct and practical.",
      rewordingSuggestion: needsPause ? "Please confirm the practical details when you can." : null,
      originalMessage: content,
    }, requestId, config);
  }
  if (
    (request.method === "GET" && (path === "/api/v2/conversations" || conversationMessagesMatch)) ||
    (request.method === "POST" && conversationSearchMatch)
  ) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    if (request.method === "GET" && path === "/api/v2/conversations") {
      const familyId = new URL(request.url).searchParams.get("familyCircleId")?.trim() ?? "";
      if (!isUuid(familyId)) return failure(request, 400, "INVALID_REQUEST", "A valid family is required.", requestId, config);
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_list_conversations", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_family_id: familyId,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
    }
    const conversationId = decodeURIComponent((conversationMessagesMatch ?? conversationSearchMatch)![1]);
    if (!isUuid(conversationId)) return failure(request, 400, "INVALID_REQUEST", "A valid conversation is required.", requestId, config);
    if (request.method === "GET") {
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_list_messages", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_conversation_id: conversationId,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
    }
    const body = await readJsonObject(request);
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const limit = typeof body?.limit === "number" ? Math.trunc(body.limit) : 20;
    if (query.length < 2 || query.length > 100 || limit < 1 || limit > 50) {
      return failure(request, 400, "INVALID_REQUEST", "Message search details are invalid.", requestId, config);
    }
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_search_messages", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_conversation_id: conversationId,
      p_query: query,
      p_limit: limit,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
  }

  if (request.method === "GET" && ["/api/v2/calendar-layers", "/api/v2/schedule-events"].includes(path)) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const familyId = new URL(request.url).searchParams.get("familyCircleId")?.trim() ?? "";
    if (!isUuid(familyId)) return failure(request, 400, "INVALID_REQUEST", "A valid family is required.", requestId, config);
    const rpcName = path === "/api/v2/calendar-layers"
      ? "peacepad_v2_list_calendar_layers"
      : "peacepad_v2_list_schedule_events";
    const { data, error } = await authenticated.admin.rpc(rpcName, {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_family_id: familyId,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
  }

  if (request.method === "GET" && path === "/api/v2/case-binders") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const familyId = new URL(request.url).searchParams.get("familyCircleId")?.trim() ?? "";
    if (!isUuid(familyId)) return failure(request, 400, "INVALID_REQUEST", "A valid family is required.", requestId, config);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_list_case_binders", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_family_id: familyId,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
  }

  if (request.method === "GET" && path === "/api/v2/attachments") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid session is required.", requestId, config);
    const binderId = new URL(request.url).searchParams.get("caseBinderId")?.trim() ?? "";
    if (!isUuid(binderId)) return failure(request, 400, "INVALID_REQUEST", "A valid Case Binder is required.", requestId, config);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_list_private_attachments", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_case_binder_id: binderId,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
  }

  const attachmentDownloadMatch = path.match(/^\/api\/v2\/attachments\/([^/]+)\/download$/);
  if (request.method === "GET" && attachmentDownloadMatch) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid session is required.", requestId, config);
    const attachmentId = decodeURIComponent(attachmentDownloadMatch[1]);
    if (!isUuid(attachmentId)) return failure(request, 400, "INVALID_REQUEST", "A valid attachment is required.", requestId, config);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_authorize_private_attachment_download", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_attachment_id: attachmentId,
    });
    if (error) return rpcFailure(request, requestId, config, error.message);
    const authorization = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const objectPath = typeof authorization.objectPath === "string" ? authorization.objectPath : "";
    if (!objectPath.startsWith(`${config.region}/${authenticated.user.id}/`)) {
      return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not authorize the private attachment.", requestId, config);
    }
    const signed = await authenticated.admin.storage.from(PRIVATE_RECORDS_BUCKET).createSignedUrl(objectPath, 60, {
      download: typeof authorization.originalFileName === "string" ? authorization.originalFileName : true,
    });
    if (signed.error || !signed.data?.signedUrl) {
      return failure(request, 503, "STORAGE_UNAVAILABLE", "The private attachment is temporarily unavailable.", requestId, config);
    }
    const { objectPath: _objectPath, ...attachment } = authorization;
    return json(request, 200, {
      attachment,
      downloadUrl: signed.data.signedUrl,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }, requestId, config);
  }

  if (request.method === "GET" && path === "/api/v2/timeline-entries") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const query = new URL(request.url).searchParams;
    const binderId = query.get("caseBinderId")?.trim() ?? "";
    const before = query.get("before")?.trim() || null;
    const limit = Number(query.get("limit")?.trim() ?? "50");
    if (!isUuid(binderId) || (before !== null && Number.isNaN(Date.parse(before)))
      || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return failure(request, 400, "INVALID_REQUEST", "Timeline request details are invalid.", requestId, config);
    }
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_list_private_timeline", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_case_binder_id: binderId,
      p_before: before,
      p_limit: limit,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data ?? [], requestId, config);
  }

  if (request.method === "GET" && path === "/api/v2/calls/current") {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const conversationId = new URL(request.url).searchParams.get("conversationId")?.trim() ?? "";
    if (!isUuid(conversationId)) return failure(request, 400, "INVALID_REQUEST", "A valid conversation is required.", requestId, config);
    const { data, error } = await authenticated.admin.rpc("peacepad_v2_get_current_audio_call", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_conversation_id: conversationId,
    });
    return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data, requestId, config);
  }

  const audioCallTurnMatch = path.match(/^\/api\/v2\/calls\/([^/]+)\/turn-credentials$/);
  if (request.method === "GET" && audioCallTurnMatch) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const callId = audioCallTurnMatch[1];
    const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
    const expectedVersion = Number(expectedVersionHeader);
    const requestedRegion = request.headers.get("x-peacepad-region")?.trim() ?? "";
    const schemaVersion = (request.headers.get("x-peacepad-schema-version") ?? request.headers.get("x-schema-version"))?.trim() ?? "";
    if (
      !isUuid(callId)
      || !Number.isInteger(expectedVersion)
      || expectedVersion < 1
      || requestedRegion !== config.region
      || schemaVersion !== "2.0"
    ) return failure(request, 400, "INVALID_REQUEST", "A valid active call version is required.", requestId, config);
    if (config.turnUrls.length < 1 || config.turnSharedSecret.length < 32) {
      return failure(request, 503, "TURN_CREDENTIALS_UNAVAILABLE", "Private audio relay is not configured for this region.", requestId, config);
    }

    const { data, error } = await authenticated.admin.rpc("peacepad_v2_authorize_audio_call_turn", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_call_id: callId,
      p_expected_version: expectedVersion,
      p_schema_version: 2,
    });
    if (error) return rpcFailure(request, requestId, config, error.message);
    const authorization = (data ?? {}) as Record<string, unknown>;
    if (
      authorization.callId !== callId
      || Number(authorization.version) !== expectedVersion
      || authorization.region !== config.region
    ) return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not authorize private audio relay.", requestId, config);
    const credential = await createTurnCredential(
      { urls: config.turnUrls, sharedSecret: config.turnSharedSecret },
      { identityId: authenticated.user.id, callId, region: config.region },
    );
    return json(request, 200, {
      callId,
      callVersion: expectedVersion,
      expiresAt: credential.expiresAt,
      iceServers: [{
        urls: credential.urls,
        username: credential.username,
        credential: credential.credential,
      }],
    }, requestId, config);
  }

  const audioCallSignalMatch = path.match(/^\/api\/v2\/calls\/([^/]+)\/signals$/);
  if (request.method === "POST" && audioCallSignalMatch) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    const callId = audioCallSignalMatch[1];
    const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
    const expectedVersion = Number(expectedVersionHeader);
    const requestedRegion = request.headers.get("x-peacepad-region")?.trim() ?? "";
    const schemaVersion = (request.headers.get("x-peacepad-schema-version") ?? request.headers.get("x-schema-version"))?.trim() ?? "";
    const body = await readJsonObject(request);
    const signal = body ? validateAudioCallSignal(body) : null;
    if (
      !isUuid(callId)
      || !Number.isInteger(expectedVersion)
      || expectedVersion < 1
      || requestedRegion !== config.region
      || schemaVersion !== "2.0"
      || !signal
    ) return failure(request, 400, "INVALID_REQUEST", "A valid bounded private call signal is required.", requestId, config);

    const { data, error } = await authenticated.admin.rpc("peacepad_v2_authorize_audio_call_signal", {
      p_identity_id: authenticated.user.id,
      p_region: config.region,
      p_call_id: callId,
      p_expected_version: expectedVersion,
      p_schema_version: 2,
    });
    if (error) return rpcFailure(request, requestId, config, error.message);
    const authorization = (data ?? {}) as Record<string, unknown>;
    const peerIdentityId = typeof authorization.peerIdentityId === "string" ? authorization.peerIdentityId : "";
    const topic = typeof authorization.topic === "string" ? authorization.topic : "";
    const expiresAt = typeof authorization.expiresAt === "string" ? authorization.expiresAt : "";
    if (
      !isUuid(peerIdentityId)
      || topic !== `peacepad:call:${callId}:v${expectedVersion}`
      || Number(authorization.version) !== expectedVersion
      || authorization.region !== config.region
      || !Number.isFinite(Date.parse(expiresAt))
      || Date.parse(expiresAt) <= Date.now()
    ) return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not authorize private call signaling.", requestId, config);

    const sentAt = new Date().toISOString();
    let relayResponse: Response;
    try {
      relayResponse = await fetch(
        `${config.supabaseUrl}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${signal.kind}?private=true`,
        {
          method: "POST",
          headers: {
            apikey: config.serviceRoleKey,
            authorization: `Bearer ${config.serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            callId,
            fromIdentityId: authenticated.user.id,
            toIdentityId: peerIdentityId,
            kind: signal.kind,
            payload: signal.payload,
            callVersion: expectedVersion,
            sentAt,
            expiresAt,
          }),
        },
      );
    } catch {
      return failure(request, 503, "SIGNAL_DELIVERY_UNAVAILABLE", "Private call signaling is temporarily unavailable.", requestId, config);
    }
    if (!relayResponse.ok) {
      return failure(request, 503, "SIGNAL_DELIVERY_UNAVAILABLE", "Private call signaling is temporarily unavailable.", requestId, config);
    }
    return json(request, 202, {
      delivered: true,
      callId,
      peerIdentityId,
      callVersion: expectedVersion,
      sentAt,
      expiresAt,
    }, requestId, config);
  }

  const isInvitationTransition = /^\/api\/v2\/invitations\/[^/]+\/(accept|decline)$/.test(path);
  const isInvitationRevocation = /^\/api\/v2\/invitations\/[^/]+$/.test(path);
  const isAccountDeletion = path === "/api/v2/account";
  const isConversationCreation = path === "/api/v2/conversations";
  const isMessageSend = /^\/api\/v2\/conversations\/[^/]+\/messages$/.test(path);
  const isMessageLifecycle = /^\/api\/v2\/conversations\/[^/]+\/messages\/[^/]+\/events$/.test(path);
  const isMessageCorrection = /^\/api\/v2\/conversations\/[^/]+\/messages\/[^/]+\/corrections$/.test(path);
  const isCalendarLayerCreation = path === "/api/v2/calendar-layers";
  const calendarLayerMatch = path.match(/^\/api\/v2\/calendar-layers\/([^/]+)$/);
  const isScheduleEventCreation = path === "/api/v2/schedule-events";
  const scheduleEventMatch = path.match(/^\/api\/v2\/schedule-events\/([^/]+)$/);
  const isMessageCheckUpdate = request.method === "PUT" && Boolean(conversationMessageCheckMatch);
  const isCaseBinderCreation = path === "/api/v2/case-binders";
  const caseBinderMatch = path.match(/^\/api\/v2\/case-binders\/([^/]+)$/);
  const isAttachmentIntentCreation = path === "/api/v2/attachment-upload-intents";
  const attachmentCompletionMatch = path.match(/^\/api\/v2\/attachments\/([^/]+)\/complete$/);
  const isTimelineEntryCreation = path === "/api/v2/timeline-entries";
  const isAudioCallCreation = path === "/api/v2/calls";
  const audioCallTransition = path.match(/^\/api\/v2\/calls\/([^/]+)\/(accept|decline|end)$/);
  if (
    (request.method === "POST" && ([
      "/api/v2/session/bootstrap",
      "/api/v2/consents",
      "/api/v2/families",
      "/api/v2/invitations",
    ].includes(path) || isInvitationTransition || isConversationCreation || isMessageSend || isMessageLifecycle || isMessageCorrection || isCalendarLayerCreation || isScheduleEventCreation || isCaseBinderCreation || isAttachmentIntentCreation || attachmentCompletionMatch || isTimelineEntryCreation || isAudioCallCreation || audioCallTransition)) ||
    (request.method === "PATCH" && (calendarLayerMatch || scheduleEventMatch || caseBinderMatch)) ||
    isMessageCheckUpdate ||
    (request.method === "DELETE" && (isInvitationRevocation || isAccountDeletion || calendarLayerMatch || scheduleEventMatch))
  ) {
    const authenticated = await authenticate(request, config);
    if (!authenticated) {
      return failure(request, 401, "AUTH_REQUIRED", "A valid fictional staging session is required.", requestId, config);
    }
    const context = writeHeaders(request, config, requestId);
    if (!context.ok) return context.error;
    const body = request.method === "DELETE" ? {} : await readJsonObject(request);
    if (!body) return failure(request, 400, "INVALID_REQUEST", "A valid request body is required.", requestId, config);
    const operation = writeOperation(request.method, path, body);
    if (!operation) return failure(request, 400, "INVALID_REQUEST", "The write operation is not supported.", requestId, config);
    const databaseWriteToken = await databaseIdempotencyToken(
      config,
      authenticated.user.id,
      context.idempotencyKey,
      operation,
      {
        identityId: authenticated.user.id,
        region: config.region,
        schemaVersion: "2.0",
        expectedVersion: (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? null,
        method: request.method,
        path,
        body,
      },
    );

    if (path === "/api/v2/session/bootstrap") {
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_bootstrap_identity", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_display_name: displayName,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (isAudioCallCreation) {
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
      if (!isUuid(conversationId) || Object.keys(body).some((key) => key !== "conversationId")) {
        return failure(request, 400, "INVALID_REQUEST", "A valid canonical conversation is required.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_create_audio_call", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_conversation_id: conversationId,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (audioCallTransition) {
      const callId = decodeURIComponent(audioCallTransition[1]);
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!isUuid(callId) || Object.keys(body).length !== 0 || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure(request, 400, "INVALID_REQUEST", "A valid call version is required.", requestId, config);
      }
      const rpcName = audioCallTransition[2] === "accept" ? "peacepad_v2_accept_audio_call"
        : audioCallTransition[2] === "decline" ? "peacepad_v2_decline_audio_call"
        : "peacepad_v2_end_audio_call";
      const { data, error } = await authenticated.admin.rpc(rpcName, {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_call_id: callId,
        p_expected_version: expectedVersion,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data, requestId, config);
    }

    if (isAccountDeletion) {
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const { data: storagePathData, error: storagePathError } = await authenticated.admin.rpc(
        "peacepad_v2_list_private_storage_paths_for_account",
        { p_identity_id: authenticated.user.id, p_region: config.region },
      );
      if (storagePathError) return rpcFailure(request, requestId, config, storagePathError.message);
      const storagePaths = Array.isArray(storagePathData)
        ? storagePathData.filter((value): value is string => typeof value === "string") : [];
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_delete_account", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_expected_version: expectedVersion,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      if (error) return rpcFailure(request, requestId, config, error.message);
      const privateStorageRemoval = storagePaths.length
        ? await authenticated.admin.storage.from(PRIVATE_RECORDS_BUCKET).remove(storagePaths)
        : { error: null };
      const privateStorageDeleted = !privateStorageRemoval.error;
      const storageAcknowledgement = privateStorageDeleted && storagePaths.length
        ? await authenticated.admin.rpc("peacepad_v2_ack_private_storage_cleanup", {
          p_identity_id: authenticated.user.id,
          p_object_paths: storagePaths,
        })
        : { error: null };
      const privateStorageCleanupPending = !privateStorageDeleted || Boolean(storageAcknowledgement.error);
      const deletion = await authenticated.admin.auth.admin.deleteUser(authenticated.user.id, false);
      const authIdentityDeleted = !deletion.error || authUserMissing(deletion.error);
      let refreshSessionsRevoked = authIdentityDeleted;
      if (!authIdentityDeleted) {
        const token = bearerToken(request);
        const signOut = token
          ? await authenticated.admin.auth.admin.signOut(token, "global")
          : { error: new Error("Missing authenticated token.") };
        refreshSessionsRevoked = !signOut.error;
      }
      const cleanupAcknowledgement = authIdentityDeleted
        ? await authenticated.admin.rpc("peacepad_v2_ack_auth_cleanup", { p_identity_id: authenticated.user.id })
        : { error: null };
      const authCleanupPending = !authIdentityDeleted || Boolean(cleanupAcknowledgement.error);
      return json(request, 200, {
        ...(data as Record<string, unknown>),
        authIdentityDeleted,
        refreshSessionsRevoked,
        authCleanupPending,
        privateStorageDeleted,
        privateStorageCleanupPending,
      }, requestId, config);
    }

    if (isMessageCheckUpdate && conversationMessageCheckMatch) {
      const conversationId = decodeURIComponent(conversationMessageCheckMatch[1]);
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!isUuid(conversationId) || !Number.isInteger(expectedVersion) || expectedVersion < 0 || typeof body.enabled !== "boolean") {
        return failure(request, 400, "INVALID_REQUEST", "Message Check details are invalid.", requestId, config);
      }
      if (body.aiAssistanceEnabled !== false) {
        return failure(request, 403, "AI_CONSENT_REQUIRED", "Third-party AI assistance remains separate and disabled.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_set_message_check", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_conversation_id: conversationId,
        p_enabled: body.enabled,
        p_ai_assistance_enabled: false,
        p_expected_version: expectedVersion,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data, requestId, config);
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
        p_idempotency_key: databaseWriteToken,
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
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (isConversationCreation) {
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const participantIds = Array.isArray(body.participantIdentityIds) && body.participantIdentityIds.every((value) => typeof value === "string")
        ? [...new Set(body.participantIdentityIds as string[])] : [];
      if (!isUuid(familyId) || participantIds.length < 2 || participantIds.length > 8 || participantIds.some((value) => !isUuid(value))) {
        return failure(request, 400, "INVALID_REQUEST", "Conversation participants are invalid.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_create_conversation", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_family_id: familyId,
        p_participant_identity_ids: participantIds,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    if (isCalendarLayerCreation || calendarLayerMatch) {
      const isCreate = request.method === "POST";
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const layerId = calendarLayerMatch ? decodeURIComponent(calendarLayerMatch[1]) : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const kind = typeof body.kind === "string" ? body.kind : "";
      const icon = typeof body.icon === "string" ? body.icon : "";
      const colorToken = typeof body.colorToken === "string" ? body.colorToken : "";
      const visibility = body.visibility && typeof body.visibility === "object" && !Array.isArray(body.visibility) ? body.visibility : null;
      if ((isCreate && !isUuid(familyId)) || (!isCreate && !isUuid(layerId)) || (request.method !== "DELETE" && (!name || !visibility))) {
        return failure(request, 400, "INVALID_REQUEST", "Calendar layer details are invalid.", requestId, config);
      }
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!isCreate && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const rpcName = isCreate ? "peacepad_v2_create_calendar_layer"
        : request.method === "PATCH" ? "peacepad_v2_update_calendar_layer"
        : "peacepad_v2_delete_calendar_layer";
      const rpcArguments: Record<string, unknown> = {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
        ...(isCreate ? { p_family_id: familyId } : { p_layer_id: layerId, p_expected_version: expectedVersion }),
        ...(request.method !== "DELETE" ? {
          p_name: name, p_kind: kind, p_icon: icon, p_color_token: colorToken, p_visibility: visibility,
        } : {}),
      };
      const { data, error } = await authenticated.admin.rpc(rpcName, rpcArguments);
      return error ? rpcFailure(request, requestId, config, error.message)
        : json(request, isCreate ? 201 : 200, data, requestId, config);
    }

    if (isScheduleEventCreation || scheduleEventMatch) {
      const isCreate = request.method === "POST";
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const eventId = scheduleEventMatch ? decodeURIComponent(scheduleEventMatch[1]) : "";
      const layerId = typeof body.calendarLayerId === "string" ? body.calendarLayerId : "";
      const childProfileIds = Array.isArray(body.childProfileIds) && body.childProfileIds.every((value) => typeof value === "string") ? body.childProfileIds : [];
      const eventType = typeof body.eventType === "string" ? body.eventType : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
      const endsAt = typeof body.endsAt === "string" ? body.endsAt : "";
      const status = typeof body.status === "string" ? body.status : "";
      const recurrence = body.recurrence === null || (body.recurrence && typeof body.recurrence === "object" && !Array.isArray(body.recurrence)) ? body.recurrence : null;
      const visibilityOverride = body.visibilityOverride === null || (body.visibilityOverride && typeof body.visibilityOverride === "object" && !Array.isArray(body.visibilityOverride)) ? body.visibilityOverride : null;
      if ((isCreate && !isUuid(familyId)) || (!isCreate && !isUuid(eventId)) || (request.method !== "DELETE" && (
        !isUuid(layerId) || childProfileIds.some((value) => !isUuid(value)) || !title || !startsAt || !endsAt
      ))) return failure(request, 400, "INVALID_REQUEST", "Schedule event details are invalid.", requestId, config);
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!isCreate && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const rpcName = isCreate ? "peacepad_v2_create_schedule_event"
        : request.method === "PATCH" ? "peacepad_v2_update_schedule_event"
        : "peacepad_v2_delete_schedule_event";
      const rpcArguments: Record<string, unknown> = {
        p_identity_id: authenticated.user.id, p_region: config.region,
        p_idempotency_key: databaseWriteToken, p_schema_version: context.schemaVersion,
        ...(isCreate ? { p_family_id: familyId } : { p_event_id: eventId, p_expected_version: expectedVersion }),
        ...(request.method !== "DELETE" ? {
          p_calendar_layer_id: layerId, p_child_profile_ids: childProfileIds, p_event_type: eventType,
          p_title: title, p_description: description, p_starts_at: startsAt, p_ends_at: endsAt,
          p_status: status, p_recurrence: recurrence, p_visibility_override: visibilityOverride,
        } : {}),
      };
      const { data, error } = await authenticated.admin.rpc(rpcName, rpcArguments);
      return error ? rpcFailure(request, requestId, config, error.message)
        : json(request, isCreate ? 201 : 200, data, requestId, config);
    }

    if (isCaseBinderCreation || caseBinderMatch) {
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const binderId = caseBinderMatch ? decodeURIComponent(caseBinderMatch[1]) : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const childLabel = typeof body.childLabel === "string" ? body.childLabel.trim() : "";
      const requestedStatus = typeof body.status === "string" ? body.status : "";
      if ((isCaseBinderCreation && (!isUuid(familyId) || name.length < 3 || childLabel.length < 2))
        || (caseBinderMatch && (!isUuid(binderId) || requestedStatus !== "archived"))) {
        return failure(request, 400, "INVALID_REQUEST", "Case Binder details are invalid.", requestId, config);
      }
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (caseBinderMatch && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc(
        isCaseBinderCreation ? "peacepad_v2_create_case_binder" : "peacepad_v2_archive_case_binder",
        isCaseBinderCreation ? {
          p_identity_id: authenticated.user.id, p_region: config.region, p_family_id: familyId,
          p_name: name, p_child_label: childLabel, p_idempotency_key: databaseWriteToken,
          p_schema_version: context.schemaVersion,
        } : {
          p_identity_id: authenticated.user.id, p_region: config.region, p_case_binder_id: binderId,
          p_expected_version: expectedVersion, p_idempotency_key: databaseWriteToken,
          p_schema_version: context.schemaVersion,
        },
      );
      return error ? rpcFailure(request, requestId, config, error.message)
        : json(request, isCaseBinderCreation ? 201 : 200, data, requestId, config);
    }

    if (isAttachmentIntentCreation) {
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const target = body.target && typeof body.target === "object" && !Array.isArray(body.target)
        ? body.target as Record<string, unknown> : null;
      const binderId = target?.kind === "private-binder" && typeof target.binderId === "string" ? target.binderId : "";
      const originalFileName = typeof body.originalFileName === "string" ? body.originalFileName.trim() : "";
      const mediaType = typeof body.mediaType === "string" ? body.mediaType : "";
      const byteLength = typeof body.byteLength === "number" ? body.byteLength : 0;
      const unexpectedBytes = "bytes" in body || "base64" in body || "data" in body || "file" in body;
      if (!isUuid(familyId) || !isUuid(binderId) || !originalFileName || unexpectedBytes
        || !["image/jpeg", "image/png", "application/pdf", "text/plain"].includes(mediaType)
        || !Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > 26_214_400) {
        return failure(request, 400, "INVALID_REQUEST", "Attachment metadata is invalid.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_prepare_attachment_intent", {
        p_identity_id: authenticated.user.id, p_region: config.region, p_family_id: familyId,
        p_case_binder_id: binderId, p_original_file_name: originalFileName,
        p_media_type: mediaType, p_byte_length: byteLength,
        p_idempotency_key: databaseWriteToken, p_schema_version: context.schemaVersion,
      });
      if (error) return rpcFailure(request, requestId, config, error.message);
      const intent = data && typeof data === "object" ? data as Record<string, unknown> : {};
      const objectPath = typeof intent.objectPath === "string" ? intent.objectPath : "";
      if (
        intent.uploadTransport !== "supabase-signed"
        || !objectPath.startsWith(`${config.region}/${authenticated.user.id}/${binderId}/`)
      ) {
        return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not prepare private storage.", requestId, config);
      }
      const signed = await authenticated.admin.storage.from(PRIVATE_RECORDS_BUCKET)
        .createSignedUploadUrl(objectPath, { upsert: false });
      if (signed.error || !signed.data?.signedUrl) {
        return failure(request, 503, "STORAGE_UNAVAILABLE", "Private storage is temporarily unavailable.", requestId, config);
      }
      return json(request, 201, { ...intent, uploadUrl: signed.data.signedUrl }, requestId, config);
    }

    if (attachmentCompletionMatch) {
      const attachmentId = decodeURIComponent(attachmentCompletionMatch[1]);
      if (!isUuid(attachmentId) || Object.keys(body).length !== 0) {
        return failure(request, 400, "INVALID_REQUEST", "A valid attachment completion request is required.", requestId, config);
      }
      const { data: authorization, error: authorizationError } = await authenticated.admin.rpc(
        "peacepad_v2_authorize_private_attachment_download",
        { p_identity_id: authenticated.user.id, p_region: config.region, p_attachment_id: attachmentId },
      );
      // A not-yet-completed intent is intentionally not downloadable. Resolve
      // its server-derived object path from the prepare receipt instead.
      let objectPath = "";
      if (!authorizationError && authorization && typeof authorization === "object") {
        objectPath = typeof (authorization as Record<string, unknown>).objectPath === "string"
          ? (authorization as Record<string, unknown>).objectPath as string : "";
      } else {
        const { data: prepared, error: preparedError } = await authenticated.admin.rpc(
          "peacepad_v2_get_attachment_intent_for_completion",
          { p_identity_id: authenticated.user.id, p_region: config.region, p_attachment_intent_id: attachmentId },
        );
        if (preparedError) return rpcFailure(request, requestId, config, preparedError.message);
        objectPath = prepared && typeof prepared === "object"
          && typeof (prepared as Record<string, unknown>).objectPath === "string"
          ? (prepared as Record<string, unknown>).objectPath as string : "";
      }
      if (!objectPath.startsWith(`${config.region}/${authenticated.user.id}/`)) {
        return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not verify the private object path.", requestId, config);
      }
      const info = await authenticated.admin.storage.from(PRIVATE_RECORDS_BUCKET).info(objectPath);
      if (info.error || !info.data) {
        return failure(request, 409, "STORAGE_OBJECT_INVALID", "The uploaded attachment could not be verified.", requestId, config);
      }
      const storageInfo = info.data as unknown as Record<string, unknown>;
      const observedSize = Number(storageInfo.size);
      const observedType = typeof storageInfo.contentType === "string" ? storageInfo.contentType
        : typeof storageInfo.content_type === "string" ? storageInfo.content_type : "";
      if (!Number.isSafeInteger(observedSize) || observedSize < 1 || !observedType) {
        return failure(request, 409, "STORAGE_OBJECT_INVALID", "The uploaded attachment metadata is invalid.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_complete_private_attachment", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_attachment_intent_id: attachmentId,
        p_observed_media_type: observedType,
        p_observed_byte_length: observedSize,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 200, data, requestId, config);
    }

    if (isTimelineEntryCreation) {
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      const binderId = typeof body.caseBinderId === "string" ? body.caseBinderId : "";
      const sourceKind = typeof body.sourceKind === "string" ? body.sourceKind : "";
      const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
      if (!isUuid(familyId) || !isUuid(binderId) || !isUuid(sourceId)
        || !["message-event", "schedule-event"].includes(sourceKind)
        || Object.keys(body).some((key) => !["familyCircleId", "caseBinderId", "sourceKind", "sourceId"].includes(key))) {
        return failure(request, 400, "INVALID_REQUEST", "Timeline source details are invalid.", requestId, config);
      }
      const { data, error } = await authenticated.admin.rpc("peacepad_v2_link_timeline_source", {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_family_id: familyId,
        p_case_binder_id: binderId,
        p_source_kind: sourceKind,
        p_source_id: sourceId,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    const sendMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/messages$/);
    const lifecycleMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/messages\/([^/]+)\/events$/);
    const correctionMatch = path.match(/^\/api\/v2\/conversations\/([^/]+)\/messages\/([^/]+)\/corrections$/);
    if (sendMatch || lifecycleMatch || correctionMatch) {
      const conversationId = decodeURIComponent((sendMatch ?? lifecycleMatch ?? correctionMatch)![1]);
      const originalMessageId = lifecycleMatch || correctionMatch
        ? decodeURIComponent((lifecycleMatch ?? correctionMatch)![2]) : "";
      const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
      if (!isUuid(conversationId) || !isUuid(familyId) || (originalMessageId && !isUuid(originalMessageId))) {
        return failure(request, 400, "INVALID_REQUEST", "Message identifiers are invalid.", requestId, config);
      }
      const bodyText = typeof body.body === "string" ? body.body.trim() : "";
      const eventType = typeof body.eventType === "string" ? body.eventType : "";
      const rpcName = sendMatch ? "peacepad_v2_send_message"
        : lifecycleMatch ? "peacepad_v2_record_message_event"
        : "peacepad_v2_correct_message";
      if ((sendMatch || correctionMatch) && (!bodyText || bodyText.length > 4000)) {
        return failure(request, 400, "INVALID_REQUEST", "Message content is invalid.", requestId, config);
      }
      if (lifecycleMatch && !["delivered", "viewed"].includes(eventType)) {
        return failure(request, 400, "INVALID_REQUEST", "Message event is invalid.", requestId, config);
      }
      const rpcArguments: Record<string, unknown> = {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_conversation_id: conversationId,
        p_family_id: familyId,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
        ...(sendMatch ? { p_body: bodyText } : {}),
        ...(lifecycleMatch ? { p_original_message_event_id: originalMessageId, p_event_type: eventType } : {}),
        ...(correctionMatch ? { p_original_message_event_id: originalMessageId, p_body: bodyText } : {}),
      };
      const { data, error } = await authenticated.admin.rpc(rpcName, rpcArguments);
      return error ? rpcFailure(request, requestId, config, error.message) : json(request, 201, data, requestId, config);
    }

    const transitionMatch = path.match(/^\/api\/v2\/invitations\/([^/]+)\/(accept|decline)$/);
    const revokeMatch = request.method === "DELETE" ? path.match(/^\/api\/v2\/invitations\/([^/]+)$/) : null;
    if (transitionMatch || revokeMatch) {
      const expectedVersionHeader = (request.headers.get("if-match") ?? request.headers.get("x-expected-version"))?.trim() ?? "";
      const expectedVersion = Number(expectedVersionHeader);
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure(request, 400, "INVALID_REQUEST", "A valid expected version is required.", requestId, config);
      }
      const invitationId = decodeURIComponent((transitionMatch ?? revokeMatch)![1]);
      const operation = transitionMatch?.[2] ?? "revoke";
      const rpcName = operation === "accept" ? "peacepad_v2_accept_invitation"
        : operation === "decline" ? "peacepad_v2_decline_invitation"
        : "peacepad_v2_revoke_invitation";
      const { data, error } = await authenticated.admin.rpc(rpcName, {
        p_identity_id: authenticated.user.id,
        p_region: config.region,
        p_invitation_id: invitationId,
        p_expected_version: expectedVersion,
        p_idempotency_key: databaseWriteToken,
        p_schema_version: context.schemaVersion,
      });
      if (error) return rpcFailure(request, requestId, config, error.message);
      if (operation !== "accept") return json(request, 200, data, requestId, config);
      const accepted = (data ?? {}) as Record<string, unknown>;
      const grant = (accepted.grant ?? {}) as Record<string, unknown>;
      const conversation = (accepted.conversation ?? {}) as Record<string, unknown>;
      const grantedAt = typeof grant.grantedAt === "string" ? grant.grantedAt : new Date().toISOString();
      if (
        !isUuid(String(grant.participantGrantId ?? ""))
        || !isUuid(String(grant.familyId ?? ""))
        || !isUuid(String(grant.identityId ?? ""))
        || grant.identityId !== authenticated.user.id
        || !isUuid(String(grant.grantedBy ?? ""))
        || !isUuid(String(conversation.id ?? ""))
        || conversation.familyCircleId !== grant.familyId
        || !Array.isArray(conversation.participantIdentityIds)
        || !conversation.participantIdentityIds.includes(authenticated.user.id)
        || !conversation.participantIdentityIds.includes(grant.grantedBy)
      ) {
        return failure(request, 502, "INVALID_UPSTREAM_RESPONSE", "PeacePad could not verify the accepted invitation.", requestId, config);
      }
      return json(request, 200, {
        grant: {
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
        },
        conversation,
      }, requestId, config);
    }

    const familyId = typeof body.familyCircleId === "string" ? body.familyCircleId : "";
    const invitedRole = typeof body.invitedRole === "string" ? body.invitedRole : "";
    const permissions = Array.isArray(body.permissions) && body.permissions.every((value) => typeof value === "string") ? [...new Set(body.permissions as string[])] : [];
    const expiresInHours = typeof body.expiresInHours === "number" ? body.expiresInHours : 0;
    const allowedPermissions = new Set(["messages", "calendar", "shared-records", "calls"]);
    if (!familyId || !["parent", "caregiver", "professional"].includes(invitedRole) || permissions.length > 8 || permissions.some((permission) => !allowedPermissions.has(permission)) || expiresInHours < 1 || expiresInHours > 168) {
      return failure(request, 400, "INVALID_REQUEST", "Invitation details are invalid.", requestId, config);
    }
    const code = await invitationCode(config, authenticated.user.id, context.idempotencyKey);
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
      p_idempotency_key: databaseWriteToken,
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
      deepLink: `peacepadnextlab://invite/${code}`,
    }, requestId, config);
  }

  return failure(request, 404, "NOT_FOUND", "Route not found.", requestId, config);
};

Deno.serve(handler);
