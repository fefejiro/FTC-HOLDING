import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { StagingActor, StagingServerConfig } from "./StagingServerConfig";
import type { StagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";

export type StagingReadinessProbe = () => Promise<boolean>;

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const originAllowed = (request: IncomingMessage, config: StagingServerConfig) => {
  const origin = request.headers.origin;
  return !origin || origin === config.appOrigin;
};

const bearer = (request: IncomingMessage) => {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : undefined;
};

/** Small loopback/staging HTTP rail. It has no production route or database write capability. */
export class StagingHttpServer {
  private readonly server: Server;
  public constructor(
    private readonly config: StagingServerConfig,
    private readonly sessions: StagingSessionAuthenticator,
    private readonly readiness: StagingReadinessProbe = async () => true,
  ) {
    this.server = createServer((request, response) => void this.handle(request, response));
  }

  public listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.config.port, "127.0.0.1", () => { this.server.removeListener("error", reject); resolve(); });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => this.server.close((error) => error ? reject(error) : resolve()));
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!originAllowed(request, this.config)) return json(response, 403, { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." } });
    response.setHeader("access-control-allow-origin", this.config.appOrigin);
    response.setHeader("vary", "Origin");
    if (request.method === "OPTIONS") { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? "/", this.config.serviceOrigin).pathname;
    if (request.method === "GET" && path === "/health") return json(response, 200, { status: "ok", environment: "staging" });
    if (request.method === "GET" && path === "/readyz") {
      const ready = await this.readiness();
      return json(response, ready ? 200 : 503, { status: ready ? "ready" : "not_ready" });
    }
    if (request.method === "GET" && path === "/api/v2/session") {
      const actor = await this.sessions.authenticate(bearer(request));
      if (!actor) return json(response, 401, { error: { code: "UNAUTHENTICATED", message: "A valid staging session is required." } });
      return json(response, 200, { actor: this.publicActor(actor), region: this.config.region });
    }
    return json(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
  }

  private publicActor(actor: StagingActor) {
    return { identityId: actor.identityId, displayName: actor.displayName, sessionId: actor.sessionId, familyPermissions: actor.familyPermissions };
  }
}
