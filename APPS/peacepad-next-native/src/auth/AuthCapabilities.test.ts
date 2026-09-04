import type { PeacePadSupabaseConfig } from "../config/environment";
import { clearAuthCapabilitiesCache, fetchAuthProviderSettings, resolveAuthCapabilities } from "./AuthCapabilities";

describe("auth provider capabilities", () => {
  afterEach(() => clearAuthCapabilitiesCache());
  const publishableKey = "test-key";

  it("reads only the public provider flags from Supabase Auth settings", async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      external: { email: true, google: false, apple: true },
      access_token_expiration: 3600
    }), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(fetchAuthProviderSettings("https://example.supabase.co", publishableKey, fetcher))
      .resolves.toEqual({ email: true, google: false, apple: true });
    expect(fetcher).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/settings", expect.objectContaining({
      headers: { apikey: publishableKey, accept: "application/json" }
    }));
  });

  it("fails closed when the endpoint is unavailable or malformed", async () => {
    await expect(fetchAuthProviderSettings("https://example.supabase.co", publishableKey, jest.fn(async () => new Response("offline", { status: 503 }))))
      .rejects.toThrow("HTTP 503");
    await expect(fetchAuthProviderSettings("https://example.supabase.co", publishableKey, jest.fn(async () => new Response(JSON.stringify({ external: { google: true } }), { status: 200 }))))
      .rejects.toThrow("incomplete");
  });

  it("does not advertise a provider when the backend explicitly disables it", async () => {
    const config: PeacePadSupabaseConfig = {
      environment: "production",
      region: "ca",
      projectRef: "project-ref",
      projectUrl: "https://example.supabase.co",
      publishableKey,
      apiBaseUrl: "https://api.peacepad.ca"
    };
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      external: { email: false, google: true, apple: true }
    }), { status: 200 }));
    const capabilities = await resolveAuthCapabilities(config, fetcher, true);
    expect(capabilities.email.backend).toBe("disabled");
    expect(capabilities.email.available).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the short settings cache until a forced refresh", async () => {
    const config: PeacePadSupabaseConfig = {
      environment: "production",
      region: "ca",
      projectRef: "project-ref",
      projectUrl: "https://example.supabase.co",
      publishableKey,
      apiBaseUrl: "https://api.peacepad.ca"
    };
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      external: { email: true, google: false, apple: false }
    }), { status: 200 }));
    await resolveAuthCapabilities(config, fetcher, true);
    await resolveAuthCapabilities(config, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await resolveAuthCapabilities(config, fetcher, true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
