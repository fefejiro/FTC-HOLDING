import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { TrustedInvitationHttpBridge } from "./TrustedInvitationHttpBridge";

const MAX_BODY_BYTES = 16 * 1024;

export type StagingHttpServerOptions = Readonly<{
  serviceOrigin: string;
  appOrigin: string;
  bridge: Pick<TrustedInvitationHttpBridge, "handle" | "session">;
  readiness: () => Promise<void>;
  logger?: Pick<Console, "info" | "error">;
}>;

const headers = (request: IncomingMessage) => Object.fromEntries(
  Object.entries(request.headers).map(([name, value]) => [name, Array.isArray(value) ? value[0] : value])
);

const requesterKey = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  const source = authorization
    ? `authorization:${authorization}`
    : `network:${request.socket.remoteAddress ?? "unknown"}:${request.headers["user-agent"] ?? "unknown"}`;
  return createHash("sha256").update(source).digest("hex");
};

const body = async (request: IncomingMessage) => {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body too large."), { status: 413 });
    chunks.push(value);
  }
  if (chunks.length === 0) return undefined;
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 }); }
};

const send = (
  response: ServerResponse,
  status: number,
  payload: unknown,
  extraHeaders: Readonly<Record<string, string>> = {}
) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  response.end(payload === undefined ? undefined : JSON.stringify(payload));
};

export function createStagingHttpServer(options: StagingHttpServerOptions): Server {
  const logger = options.logger ?? console;
  return createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader("X-Request-Id", requestId);
    try {
      const url = new URL(request.url ?? "/", options.serviceOrigin);
      if (request.method === "GET" && url.pathname === "/health") {
        send(response, 200, { status: "ok", service: "peacepad-native-staging" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/readyz") {
        await options.readiness();
        send(response, 200, { status: "ready", service: "peacepad-native-staging" });
        return;
      }

      const origin = request.headers.origin;
      if (origin && origin !== options.appOrigin) {
        send(response, 403, { code: "ORIGIN_DENIED", message: "Origin is not allowed." });
        return;
      }
      if (request.method === "OPTIONS") {
        send(response, 204, undefined, {
          "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, If-Match, X-PeacePad-Region, X-PeacePad-Schema-Version",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Origin": options.appOrigin,
          "Access-Control-Max-Age": "600"
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/v2/session") {
        const routed = await options.bridge.session(headers(request));
        send(response, routed.status, routed.body, origin ? { "Access-Control-Allow-Origin": options.appOrigin } : {});
        logger.info(JSON.stringify({ requestId, method: request.method, path: url.pathname, status: routed.status }));
        return;
      }
      if (request.method !== "POST" && request.method !== "DELETE") {
        send(response, 405, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." });
        return;
      }
      if (
        request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase() !== "application/json"
        && request.method === "POST"
      ) {
        send(response, 415, { code: "UNSUPPORTED_MEDIA_TYPE", message: "Use application/json." });
        return;
      }

      const routed = await options.bridge.handle({
        method: request.method,
        path: url.pathname,
        body: await body(request),
        headers: headers(request),
        requesterKey: requesterKey(request)
      });
      send(response, routed.status, routed.body, {
        ...(origin ? { "Access-Control-Allow-Origin": options.appOrigin } : {}),
        ...routed.headers
      });
      logger.info(JSON.stringify({ requestId, method: request.method, path: url.pathname, status: routed.status }));
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500;
      send(response, status, {
        code: status === 413 ? "PAYLOAD_TOO_LARGE" : status === 400 ? "INVALID_JSON" : "INTERNAL_ERROR",
        message: status < 500 && error instanceof Error ? error.message : "PeacePad could not complete this request."
      });
      logger.error(JSON.stringify({
        requestId,
        method: request.method,
        status,
        errorType: error instanceof Error ? error.name : "UnknownError"
      }));
    }
  });
}
