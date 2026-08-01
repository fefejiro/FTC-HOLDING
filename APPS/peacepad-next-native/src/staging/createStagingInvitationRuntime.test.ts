import type { SqlPool } from "./PostgresInvitationStore";
import { createStagingInvitationRuntime, type StagingInvitationRuntimeConfig } from "./createStagingInvitationRuntime";

const pool = {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => undefined })
} as SqlPool;

const config: StagingInvitationRuntimeConfig = {
  runtimeEnvironment: "staging",
  serviceOrigin: "https://api.staging.peacepad.ca",
  invitationPepper: "invitation-staging-pepper",
  rateLimitPepper: "rate-limit-staging-pepper",
  idempotencyPepper: "idempotency-staging-pepper",
  sqlPool: pool,
  authenticator: { authenticate: async () => undefined },
  directory: { familyName: async () => undefined },
  subtle: { digest: async () => new Uint8Array(32).buffer }
};

describe("createStagingInvitationRuntime", () => {
  it("wires durable staging adapters only for an isolated staging origin", () => {
    expect(createStagingInvitationRuntime(config)).toMatchObject({
      bridge: expect.any(Object),
      service: expect.any(Object),
      store: expect.any(Object),
      rateLimiter: expect.any(Object)
    });
  });

  it.each([
    "https://api.peacepad.ca",
    "https://peacepad.ca",
    "https://staging.attacker.example",
    "http://api.staging.peacepad.ca",
    "not-a-url"
  ])("rejects non-staging origin %s", (serviceOrigin) => {
    expect(() => createStagingInvitationRuntime({ ...config, serviceOrigin })).toThrow(/staging|valid/i);
  });

  it("rejects missing or weak secret material", () => {
    expect(() => createStagingInvitationRuntime({ ...config, invitationPepper: "short" })).toThrow(/pepper/i);
    expect(() => createStagingInvitationRuntime({ ...config, rateLimitPepper: "short" })).toThrow(/pepper/i);
    expect(() => createStagingInvitationRuntime({ ...config, idempotencyPepper: "short" })).toThrow(/pepper/i);
  });
});
