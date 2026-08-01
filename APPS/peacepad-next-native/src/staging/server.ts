import { createHash, randomUUID, webcrypto } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";
import type { SqlPool, SqlResult } from "./PostgresInvitationStore";
import { readStagingServerConfig } from "./StagingServerConfig";
import { createStagingInvitationRuntime } from "./createStagingInvitationRuntime";
import { WebCryptoSha256Digest } from "./WebCryptoDigest";

const MAX_BODY_BYTES = 16 * 1024;
const config = readStagingServerConfig(process.env);
const postgres = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  application_name: "peacepad-native-staging"
});

const result = <Row>(query: QueryResult<QueryResultRow>): SqlResult<Row> => ({
  rows: query.rows as unknown as readonly Row[],
  rowCount: query.rowCount
});
const client = (value: PoolClient) => ({
  query: async <Row = Record<string, unknown>>(text: string, values?: readonly unknown[]) =>
    result<Row>(await value.query(text, values as unknown[] | undefined)),
  release: () => value.release()
});
const sqlPool: SqlPool = {
  query: async <Row = Record<string, unknown>>(text: string, values?: readonly unknown[]) =>
    result<Row>(await postgres.query(text, values as unknown[] | undefined)),
  connect: async () => client(await postgres.connect())
};

const digest = new WebCryptoSha256Digest(webcrypto.subtle);
const authenticator = new HashedStagingSessionAuthenticator(
  digest,
  config.sessionPepper,
  config.sessionTokenHash,
  config.actor
);
const runtime = createStagingInvitationRuntime({
  runtimeEnvironment: "staging",
  serviceOrigin: config.serviceOrigin,
  invitationPepper: config.invitationPepper,
  rateLimitPepper: config.rateLimitPepper,
  idempotencyPepper: config.idempotencyPepper,
  sqlPool,
  authenticator,
  directory: { familyName: async (familyId) => config.families[familyId] },
  subtle: webcrypto.subtle
});

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

const send = (response: ServerResponse, status: number, payload: unknown, extraHeaders: Readonly<Record<string, string>> = {}) => {
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

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  response.setHeader("X-Request-Id", requestId);
  try {
    const url = new URL(request.url ?? "/", config.serviceOrigin);
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { status: "ok", service: "peacepad-native-staging" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/readyz") {
      await postgres.query("SELECT 1");
      send(response, 200, { status: "ready", service: "peacepad-native-staging" });
      return;
    }

    const origin = request.headers.origin;
    if (origin && origin !== config.appOrigin) {
      send(response, 403, { code: "ORIGIN_DENIED", message: "Origin is not allowed." });
      return;
    }
    if (request.method === "OPTIONS") {
      send(response, 204, undefined, {
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, If-Match, X-PeacePad-Region, X-PeacePad-Schema-Version",
        "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
        "Access-Control-Allow-Origin": config.appOrigin,
        "Access-Control-Max-Age": "600"
      });
      return;
    }
    if (request.method !== "POST" && request.method !== "DELETE") {
      send(response, 405, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." });
      return;
    }
    if (request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase() !== "application/json" && request.method === "POST") {
      send(response, 415, { code: "UNSUPPORTED_MEDIA_TYPE", message: "Use application/json." });
      return;
    }

    const routed = await runtime.bridge.handle({
      method: request.method,
      path: url.pathname,
      body: await body(request),
      headers: headers(request),
      requesterKey: requesterKey(request)
    });
    send(response, routed.status, routed.body, {
      ...(origin ? { "Access-Control-Allow-Origin": config.appOrigin } : {}),
      ...routed.headers
    });
    console.info(JSON.stringify({ requestId, method: request.method, path: url.pathname, status: routed.status }));
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    send(response, status, {
      code: status === 413 ? "PAYLOAD_TOO_LARGE" : status === 400 ? "INVALID_JSON" : "INTERNAL_ERROR",
      message: status < 500 && error instanceof Error ? error.message : "PeacePad could not complete this request."
    });
    console.error(JSON.stringify({ requestId, method: request.method, status, errorType: error instanceof Error ? error.name : "UnknownError" }));
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "server.started", port: config.port, environment: "staging" }));
});

const shutdown = async () => {
  server.close();
  await postgres.end();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
