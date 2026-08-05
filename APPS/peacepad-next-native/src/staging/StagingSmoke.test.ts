import { smokeStagingReadiness, stagingSmokeBaseUrl } from "./StagingSmoke";

describe("staging readiness smoke", () => {
  it.each(["https://api.peacepad.ca", "http://api.staging.peacepad.ca", "https://user:secret@api.staging.peacepad.ca"])(
    "rejects unsafe target %s",
    (target) => expect(() => stagingSmokeBaseUrl(target)).toThrow(/staging|target/i)
  );

  it("verifies health and database readiness without credentials", async () => {
    const request = jest.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: url.endsWith("/readyz") ? "ready" : "ok",
        service: "peacepad-native-staging"
      })
    })) as unknown as typeof fetch;
    await smokeStagingReadiness("https://api.staging.peacepad.ca", request);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith("https://api.staging.peacepad.ca/readyz", expect.any(Object));
  });

  it("fails closed when readiness is unavailable", async () => {
    const request = jest.fn(async (url: string) => ({
      ok: !url.endsWith("/readyz"),
      status: url.endsWith("/readyz") ? 503 : 200,
      json: async () => ({ status: "ok", service: "peacepad-native-staging" })
    })) as unknown as typeof fetch;
    await expect(smokeStagingReadiness("https://api.staging.peacepad.ca", request)).rejects.toThrow(/503/);
  });
});
