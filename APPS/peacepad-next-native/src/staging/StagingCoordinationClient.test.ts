import { createStagingCoordinationClient } from "./StagingCoordinationClient";

const base = { environment: "staging" as const, apiBaseUrl: "http://127.0.0.1:8787", requestTimeoutMs: 12000, productionApiWritesEnabled: false as const, diagnosticsEnabled: false };

test("creates the coordination client only for staging", () => {
  expect(createStagingCoordinationClient(base, async () => "fictional-token")).toBeDefined();
  expect(() => createStagingCoordinationClient({ ...base, environment: "lab" }, async () => undefined)).toThrow("staging environment");
  expect(() => createStagingCoordinationClient({ ...base, apiBaseUrl: "https://api.peacepad.ca" }, async () => undefined)).toThrow("non-staging");
});
