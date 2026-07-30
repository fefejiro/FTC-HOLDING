import { resolveEnvironmentConfig } from "./environment";

describe("resolveEnvironmentConfig", () => {
  it("defaults to an isolated local lab with production writes disabled", () => {
    expect(resolveEnvironmentConfig({})).toEqual({
      environment: "lab",
      apiBaseUrl: "http://127.0.0.1:8787",
      requestTimeoutMs: 12_000,
      productionApiWritesEnabled: false
    });
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
