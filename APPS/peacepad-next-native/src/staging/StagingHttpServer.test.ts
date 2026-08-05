/** @jest-environment node */

import type { Server } from "node:http";
import { createStagingHttpServer } from "./StagingHttpServer";

const appOrigin = "https://native.staging.peacepad.ca";

const listen = (server: Server) => new Promise<string>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("No TCP address."));
    resolve(`http://127.0.0.1:${address.port}`);
  });
});

const close = (server: Server) => new Promise<void>((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
});

describe("createStagingHttpServer", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server?.listening) await close(server);
    server = undefined;
  });

  const setup = async (overrides: {
    readiness?: () => Promise<void>;
    handle?: jest.Mock;
    session?: jest.Mock;
  } = {}) => {
    const handle = overrides.handle ?? jest.fn(async () => ({ status: 200, body: { ok: true } }));
    const session = overrides.session ?? jest.fn(async () => ({ status: 200, body: { identityId: "synthetic-owner" } }));
    const logger = { info: jest.fn(), error: jest.fn() };
    server = createStagingHttpServer({
      serviceOrigin: "http://127.0.0.1",
      appOrigin,
      bridge: { handle, session },
      readiness: overrides.readiness ?? (async () => undefined),
      logger
    });
    return { baseUrl: await listen(server), handle, session, logger };
  };

  it("reports health and database readiness without invoking product routes", async () => {
    const readiness = jest.fn(async () => undefined);
    const { baseUrl, handle } = await setup({ readiness });

    const health = await fetch(`${baseUrl}/health`);
    const ready = await fetch(`${baseUrl}/readyz`);

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", service: "peacepad-native-staging" });
    expect(ready.status).toBe(200);
    expect(readiness).toHaveBeenCalledTimes(1);
    expect(handle).not.toHaveBeenCalled();
  });

  it("fails readiness closed and does not expose the database error", async () => {
    const { baseUrl, logger } = await setup({
      readiness: async () => { throw new Error("database host and credential details"); }
    });

    const response = await fetch(`${baseUrl}/readyz`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "INTERNAL_ERROR",
      message: "PeacePad could not complete this request."
    });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("database host and credential details");
  });

  it("enforces origin, method, media-type, JSON, body-size, and preflight boundaries", async () => {
    const { baseUrl, handle } = await setup();

    const denied = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
      body: "{}"
    });
    const wrongMethod = await fetch(`${baseUrl}/api/v2/invitations`);
    const wrongType = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: { Origin: appOrigin, "Content-Type": "text/plain" },
      body: "{}"
    });
    const invalidJson = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: { Origin: appOrigin, "Content-Type": "application/json" },
      body: "{"
    });
    const tooLarge = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: { Origin: appOrigin, "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(17 * 1024) })
    });
    const preflight = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "OPTIONS",
      headers: { Origin: appOrigin }
    });

    expect(denied.status).toBe(403);
    expect(wrongMethod.status).toBe(405);
    expect(wrongType.status).toBe(415);
    expect(invalidJson.status).toBe(400);
    expect(tooLarge.status).toBe(413);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(appOrigin);
    expect(handle).not.toHaveBeenCalled();
  });

  it("routes a bounded request using a hashed requester key and redacted logs", async () => {
    const handle = jest.fn(async () => ({
      status: 201,
      body: { invitationId: "fictional-invitation" },
      headers: { "Retry-After": "60" }
    }));
    const { baseUrl, logger } = await setup({ handle });
    const token = "fictional-bearer-value";

    const response = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: appOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ familyCircleId: "family-1" })
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(handle).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      path: "/api/v2/invitations",
      body: { familyCircleId: "family-1" },
      requesterKey: expect.stringMatching(/^[a-f0-9]{64}$/)
    }));
    const routedRequest = (handle.mock.calls as unknown[][])[0]?.[0] as { requesterKey: string };
    expect(routedRequest.requesterKey).not.toContain(token);
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(token);
  });

  it("routes the authenticated session handshake without accepting a body", async () => {
    const session = jest.fn(async () => ({
      status: 200,
      body: { identityId: "synthetic-owner", displayName: "Alex Example", familyIds: ["family-staging"] }
    }));
    const { baseUrl } = await setup({ session });
    const response = await fetch(`${baseUrl}/api/v2/session`, {
      headers: { Authorization: "Bearer fictional-session", Origin: appOrigin }
    });
    expect(response.status).toBe(200);
    expect(session).toHaveBeenCalledWith(expect.objectContaining({ authorization: "Bearer fictional-session" }));
    expect(response.headers.get("access-control-allow-origin")).toBe(appOrigin);
  });
});
