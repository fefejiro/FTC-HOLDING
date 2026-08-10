import { resolveEnvironmentConfig, resolveFunctionInvocationRegion, resolveSupabaseStagingConfig } from "./environment";

describe("resolveEnvironmentConfig", () => {
  it("defaults to an isolated local lab with production writes disabled", () => {
    expect(resolveEnvironmentConfig({})).toEqual({
      environment: "lab",
      apiBaseUrl: "http://127.0.0.1:8787",
      requestTimeoutMs: 12_000,
      productionApiWritesEnabled: false,
      diagnosticsEnabled: false
    });
  });

  it("allows diagnostics only in the local lab", () => {
    expect(resolveEnvironmentConfig({ EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "true" }).diagnosticsEnabled).toBe(true);
    expect(() => resolveEnvironmentConfig({
      EXPO_PUBLIC_PEACEPAD_ENV: "staging",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://staging.peacepad.test",
      EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "true"
    })).toThrow("diagnostics are allowed only in the local lab");
  });

  it("accepts a staging URL and removes trailing slashes", () => {
    expect(
      resolveEnvironmentConfig({
        EXPO_PUBLIC_PEACEPAD_ENV: "staging",
        EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://staging-api.peacepad.test///"
      })
    ).toMatchObject({
      environment: "staging",
      apiBaseUrl: "https://staging-api.peacepad.test",
      productionApiWritesEnabled: false
    });
  });

  it("requires an explicit staging URL", () => {
    expect(() =>
      resolveEnvironmentConfig({
        EXPO_PUBLIC_PEACEPAD_ENV: "staging"
      })
    ).toThrow("Staging requires EXPO_PUBLIC_PEACEPAD_API_BASE_URL.");
  });

  it("rejects malformed and production API URLs", () => {
    expect(() =>
      resolveEnvironmentConfig({
        EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "staging-api.peacepad.test"
      })
    ).toThrow("PeacePad API base URL must use HTTP or HTTPS.");

    const productionApiUrl = ["https://api", "peacepad", "ca/v2"].join(".");
    expect(() =>
      resolveEnvironmentConfig({
        EXPO_PUBLIC_PEACEPAD_API_BASE_URL: productionApiUrl
      })
    ).toThrow("must not target the production PeacePad API");
  });
});

describe("resolveFunctionInvocationRegion", () => {
  it("pins approved staging APIs to their supported Edge invocation regions", () => {
    expect(resolveFunctionInvocationRegion("https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api")).toBe("ca-central-1");
    expect(resolveFunctionInvocationRegion("https://spmpndalcvwmygznihec.supabase.co/functions/v1/peacepad-v2-api/")).toBe("us-east-1");
    expect(resolveFunctionInvocationRegion("http://127.0.0.1:8787")).toBeUndefined();
    expect(resolveFunctionInvocationRegion("https://ftdqnhlesqrkstnqgfxr.supabase.co/functions/v1/peacepad-v2-api")).toBeUndefined();
  });
});

describe("resolveSupabaseStagingConfig", () => {
  const ca = {
    EXPO_PUBLIC_PEACEPAD_ENV: "staging",
    EXPO_PUBLIC_PEACEPAD_REGION: "ca",
    EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co",
    EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
    EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional"
  };

  it("accepts only the exact Canadian project for a Canadian build", () => {
    expect(resolveSupabaseStagingConfig(ca)).toMatchObject({
      region: "ca",
      projectRef: "rohvkyuxbnqzglaromms"
    });
  });

  it("accepts only the exact US project for a US build", () => {
    expect(resolveSupabaseStagingConfig({
      ...ca,
      EXPO_PUBLIC_PEACEPAD_REGION: "us",
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://spmpndalcvwmygznihec.supabase.co",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://spmpndalcvwmygznihec.supabase.co/functions/v1/peacepad-v2-api"
    })).toMatchObject({ region: "us", projectRef: "spmpndalcvwmygznihec" });
  });

  it("rejects project swapping, non-staging use, and service-role material", () => {
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_REGION: "us" })).toThrow("exact approved Supabase project");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_ENV: "lab" })).toThrow("only in staging");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "service_role_secret" })).toThrow("secret and legacy JWT keys are prohibited");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "ey.a.b" })).toThrow("legacy JWT keys are prohibited");
  });

  it("rejects the paused historical project refs", () => {
    expect(() => resolveSupabaseStagingConfig({
      ...ca,
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://ftdqnhlesqrkstnqgfxr.supabase.co",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://ftdqnhlesqrkstnqgfxr.supabase.co/functions/v1/peacepad-v2-api"
    })).toThrow("exact approved Supabase project");
    expect(() => resolveSupabaseStagingConfig({
      ...ca,
      EXPO_PUBLIC_PEACEPAD_REGION: "us",
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://kgechdqdtryktfahyqez.supabase.co",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://kgechdqdtryktfahyqez.supabase.co/functions/v1/peacepad-v2-api"
    })).toThrow("exact approved Supabase project");
  });
});
