import { resolveEnvironmentConfig, resolveFunctionInvocationRegion, resolveSupabaseProductionConfig, resolveSupabaseRuntimeDirectory, resolveSupabaseStagingConfig, resolveSupabaseStagingDirectory } from "./environment";

describe("resolveEnvironmentConfig", () => {
  it("reads the statically bundled public staging variables when no override is supplied", () => {
    const previous = {
      environment: process.env.EXPO_PUBLIC_PEACEPAD_ENV,
      region: process.env.EXPO_PUBLIC_PEACEPAD_REGION,
      projectUrl: process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_URL,
      apiBaseUrl: process.env.EXPO_PUBLIC_PEACEPAD_API_BASE_URL,
      publishableKey: process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY,
      diagnostics: process.env.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS
    };
    try {
      process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
      process.env.EXPO_PUBLIC_PEACEPAD_REGION = "ca";
      process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_URL = "https://rohvkyuxbnqzglaromms.supabase.co";
      process.env.EXPO_PUBLIC_PEACEPAD_API_BASE_URL = "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api";
      process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fictional";
      process.env.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS = "false";

      expect(resolveEnvironmentConfig()).toMatchObject({ environment: "staging" });
      expect(resolveSupabaseStagingConfig()).toMatchObject({ region: "ca", projectRef: "rohvkyuxbnqzglaromms" });
      expect(resolveSupabaseStagingDirectory()).toEqual([expect.objectContaining({ region: "ca" })]);
      expect(resolveSupabaseRuntimeDirectory()).toEqual([expect.objectContaining({ region: "ca" })]);
    } finally {
      for (const [key, value] of Object.entries({
        EXPO_PUBLIC_PEACEPAD_ENV: previous.environment,
        EXPO_PUBLIC_PEACEPAD_REGION: previous.region,
        EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: previous.projectUrl,
        EXPO_PUBLIC_PEACEPAD_API_BASE_URL: previous.apiBaseUrl,
        EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: previous.publishableKey,
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: previous.diagnostics
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

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

  it("requires the exact authorized production URL", () => {
    expect(() => resolveEnvironmentConfig({
      EXPO_PUBLIC_PEACEPAD_ENV: "production"
    })).toThrow("Production requires EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL.");
    expect(() => resolveEnvironmentConfig({
      EXPO_PUBLIC_PEACEPAD_ENV: "production",
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL: "https://example.invalid/functions/v1/peacepad-v2-api",
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "true"
    })).toThrow("exact approved Canada Supabase API");
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

describe("resolveSupabaseProductionConfig", () => {
  const production = {
    EXPO_PUBLIC_PEACEPAD_ENV: "production",
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_URL: "https://qzekqjewpugdotskrtni.supabase.co",
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL: "https://qzekqjewpugdotskrtni.supabase.co/functions/v1/peacepad-v2-api",
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional_production",
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "true"
  };

  it("accepts only the exact Canada production project with explicit write authorization", () => {
    expect(resolveEnvironmentConfig(production)).toMatchObject({
      environment: "production",
      productionApiWritesEnabled: true
    });
    expect(resolveSupabaseProductionConfig(production)).toMatchObject({
      environment: "production",
      region: "ca",
      projectRef: "qzekqjewpugdotskrtni"
    });
    expect(resolveSupabaseRuntimeDirectory(production)).toEqual([
      expect.objectContaining({ environment: "production", region: "ca", projectRef: "qzekqjewpugdotskrtni" })
    ]);
  });

  it("reads a complete production configuration from bundled public variables", () => {
    const previous = Object.fromEntries(Object.keys(production).map((key) => [key, process.env[key]]));
    try {
      Object.assign(process.env, production);
      expect(resolveSupabaseProductionConfig()).toMatchObject({ environment: "production", region: "ca" });
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("fails closed on a swapped project, missing write authorization, and private key material", () => {
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_ENV: "staging"
    })).toThrow("requires the production runtime");
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co"
    })).toThrow("exact approved Canada Supabase project");
    expect(() => resolveEnvironmentConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "false"
    })).toThrow("explicit production-write authorization");
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "sb_secret_private"
    })).toThrow("secret and legacy JWT keys are prohibited");
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "ey.a.b"
    })).toThrow("secret and legacy JWT keys are prohibited");
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY: ""
    })).toThrow("requires an sb_publishable_ Supabase key");
    expect(() => resolveSupabaseProductionConfig({
      ...production,
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "false"
    })).toThrow("explicit production-write authorization");
    expect(() => resolveEnvironmentConfig({
      EXPO_PUBLIC_PEACEPAD_ENV: "staging",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://staging-api.peacepad.test",
      EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "true"
    })).toThrow("outside the production runtime");
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
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_REGION: "eu" })).toThrow("REGION=ca or us");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_REGION: "us" })).toThrow("exact approved Supabase project");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_ENV: "lab" })).toThrow("only in staging");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "service_role_secret" })).toThrow("secret and legacy JWT keys are prohibited");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "ey.a.b" })).toThrow("legacy JWT keys are prohibited");
    expect(() => resolveSupabaseStagingConfig({ ...ca, EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow("requires an sb_publishable_ Supabase key");
    expect(() => resolveSupabaseStagingConfig({
      EXPO_PUBLIC_PEACEPAD_ENV: "staging",
      EXPO_PUBLIC_PEACEPAD_REGION: "ca"
    })).toThrow("exact approved Supabase project");
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

describe("resolveSupabaseStagingDirectory", () => {
  const dualRegion = {
    EXPO_PUBLIC_PEACEPAD_ENV: "staging",
    EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co",
    EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
    EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional_ca",
    EXPO_PUBLIC_PEACEPAD_US_SUPABASE_URL: "https://spmpndalcvwmygznihec.supabase.co",
    EXPO_PUBLIC_PEACEPAD_US_API_BASE_URL: "https://spmpndalcvwmygznihec.supabase.co/functions/v1/peacepad-v2-api",
    EXPO_PUBLIC_PEACEPAD_US_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional_us"
  };

  it("returns the exact approved Canada and United States directory for one binary", () => {
    expect(resolveSupabaseStagingDirectory(dualRegion)).toEqual([
      expect.objectContaining({ region: "ca", projectRef: "rohvkyuxbnqzglaromms" }),
      expect.objectContaining({ region: "us", projectRef: "spmpndalcvwmygznihec" })
    ]);
    expect(resolveEnvironmentConfig(dualRegion)).toMatchObject({
      environment: "staging",
      productionApiWritesEnabled: false
    });
  });

  it("preserves the verified single-region staging build contract", () => {
    expect(resolveSupabaseStagingDirectory({
      EXPO_PUBLIC_PEACEPAD_ENV: "staging",
      EXPO_PUBLIC_PEACEPAD_REGION: "ca",
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co",
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
      EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional"
    })).toEqual([expect.objectContaining({ region: "ca" })]);
  });

  it("fails closed on partial, mixed, swapped, secret, and legacy regional configuration", () => {
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_ENV: "lab"
    })).toThrow("only in staging");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_US_SUPABASE_PUBLISHABLE_KEY: undefined
    })).toThrow("US regional configuration is incomplete");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_REGION: "ca"
    })).toThrow("must not be mixed");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co"
    })).toThrow("must not be mixed");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api"
    })).toThrow("must not be mixed");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_single"
    })).toThrow("must not be mixed");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL: "https://spmpndalcvwmygznihec.supabase.co"
    })).toThrow("exact approved Supabase project");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY: "sb_secret_private"
    })).toThrow("secret and legacy JWT keys are prohibited");
    expect(() => resolveSupabaseStagingDirectory({
      ...dualRegion,
      EXPO_PUBLIC_PEACEPAD_US_SUPABASE_PUBLISHABLE_KEY: "ey.a.b"
    })).toThrow("legacy JWT keys are prohibited");
  });
});
