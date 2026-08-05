import type { PeacePadEnvironmentConfig } from "../config/environment";
import { verifyStagingSession } from "./StagingSessionApi";

const staging: PeacePadEnvironmentConfig = {
  environment: "staging",
  apiBaseUrl: "https://api.staging.peacepad.ca",
  requestTimeoutMs: 100,
  productionApiWritesEnabled: false,
  diagnosticsEnabled: false
};

const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(async () => body)
}) as unknown as Response;

describe("verifyStagingSession", () => {
  it("verifies an opaque key without placing it in the URL or body", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {
      identityId: "synthetic-owner",
      displayName: "Alex Example",
      familyIds: ["family-staging"]
    }));
    await expect(verifyStagingSession(staging, "a".repeat(48), fetcher)).resolves.toMatchObject({ displayName: "Alex Example" });
    expect(fetcher).toHaveBeenCalledWith("https://api.staging.peacepad.ca/api/v2/session", expect.objectContaining({ method: "GET" }));
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBeUndefined();
    expect(request.headers).toMatchObject({ Authorization: `Bearer ${"a".repeat(48)}` });
  });

  it("fails closed for invalid, rejected, and malformed sessions", async () => {
    await expect(verifyStagingSession(staging, "short", jest.fn())).rejects.toMatchObject({ kind: "auth-required" });
    await expect(verifyStagingSession(staging, "a".repeat(48), jest.fn(async () => response(401, {})))).rejects.toMatchObject({ kind: "auth-required" });
    await expect(verifyStagingSession(staging, "a".repeat(48), jest.fn(async () => response(200, {})))).rejects.toMatchObject({ kind: "invalid-response" });
  });
});
