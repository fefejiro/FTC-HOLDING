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
  | "IDENTITY_NOT_BOUND"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "ORIGIN_NOT_ALLOWED"
  | "PROJECT_MISMATCH"
  | "REGION_MISMATCH"
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
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-idempotency-key, x-peacepad-region, x-schema-version",
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

  return failure(request, 404, "NOT_FOUND", "Route not found.", requestId, config);
};

Deno.serve(handler);
