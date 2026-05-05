import { describe, expect, it } from "vitest";
import { resolveDeploymentRole, shouldServeFrontend } from "./deploymentMode";

describe("deploymentMode", () => {
  it("honors explicit api role", () => {
    const role = resolveDeploymentRole({
      nodeEnv: "production",
      explicitRole: "api",
      publicBaseUrl: "https://peacepad.ca",
      railwayEnvPresent: false,
    });

    expect(role).toBe("api");
    expect(shouldServeFrontend(role)).toBe(false);
  });

  it("defaults development to fullstack", () => {
    const role = resolveDeploymentRole({
      nodeEnv: "development",
      publicBaseUrl: "https://api.peacepad.ca",
      railwayEnvPresent: true,
    });

    expect(role).toBe("fullstack");
    expect(shouldServeFrontend(role)).toBe(true);
  });

  it("defaults production api host to api role", () => {
    const role = resolveDeploymentRole({
      nodeEnv: "production",
      publicBaseUrl: "https://api.peacepad.ca",
      railwayEnvPresent: false,
    });

    expect(role).toBe("api");
    expect(shouldServeFrontend(role)).toBe(false);
  });

  it("defaults production railway runtime to api role", () => {
    const role = resolveDeploymentRole({
      nodeEnv: "production",
      publicBaseUrl: "https://example.com",
      railwayEnvPresent: true,
    });

    expect(role).toBe("api");
    expect(shouldServeFrontend(role)).toBe(false);
  });

  it("keeps production non-api host fullstack", () => {
    const role = resolveDeploymentRole({
      nodeEnv: "production",
      publicBaseUrl: "https://peacepad.ca",
      railwayEnvPresent: false,
    });

    expect(role).toBe("fullstack");
    expect(shouldServeFrontend(role)).toBe(true);
  });
});

