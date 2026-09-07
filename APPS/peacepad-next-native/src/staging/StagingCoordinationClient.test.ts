import { createStagingCoordinationClient } from "./StagingCoordinationClient";

const base = { environment: "staging" as const, apiBaseUrl: "http://127.0.0.1:8787", requestTimeoutMs: 12000, productionApiWritesEnabled: false as const, diagnosticsEnabled: false };

test("creates the coordination client only for staging", () => {
  expect(createStagingCoordinationClient(base, async () => "fictional-token")).toBeDefined();
  expect(createStagingCoordinationClient({ ...base, apiBaseUrl: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api" }, async () => "fictional-token")).toBeDefined();
  expect(() => createStagingCoordinationClient({ ...base, apiBaseUrl: "https://spmpndalcvwmygznihec.supabase.co/functions/v1/peacepad-v2-api" }, async () => "fictional-token")).toThrow("unapproved API host");
  expect(() => createStagingCoordinationClient({ ...base, environment: "lab" }, async () => undefined)).toThrow("staging or explicitly authorized production environment");
  expect(() => createStagingCoordinationClient({ ...base, apiBaseUrl: "https://api.peacepad.ca" }, async () => undefined)).toThrow("unapproved API host");
  expect(() => createStagingCoordinationClient({ ...base, apiBaseUrl: "https://ftdqnhlesqrkstnqgfxr.supabase.co/functions/v1/peacepad-v2-api" }, async () => undefined)).toThrow("unapproved API host");
  expect(() => createStagingCoordinationClient({ ...base, apiBaseUrl: "https://kgechdqdtryktfahyqez.supabase.co/functions/v1/peacepad-v2-api" }, async () => undefined)).toThrow("unapproved API host");
});

test("creates a production client only for the exact authorized Canada project", () => {
  const production = {
    ...base,
    environment: "production" as const,
    apiBaseUrl: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
    productionApiWritesEnabled: true
  };
  expect(createStagingCoordinationClient(production, async () => "fictional-token")).toBeDefined();
  expect(() => createStagingCoordinationClient({ ...production, apiBaseUrl: "https://qzekqjewpugdotskrtni.supabase.co/functions/v1/peacepad-v2-api" }, async () => undefined)).toThrow("approved Canada API host");
  expect(() => createStagingCoordinationClient({ ...production, productionApiWritesEnabled: false }, async () => undefined)).toThrow("explicitly authorized production environment");
});
