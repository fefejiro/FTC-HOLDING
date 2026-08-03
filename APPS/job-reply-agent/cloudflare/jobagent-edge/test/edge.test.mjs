import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../src/index.js";

const environment = {
  JOBAGENT_ORIGIN: "https://jobagent-web-production.up.railway.app",
};

describe("JobAgent Cloudflare edge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves edge health without calling the origin", async () => {
    const response = await worker.fetch(
      new Request("https://jobagent.unalabs.cloud/edgez"),
      environment,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ready: true,
      edge: "cloudflare",
      origin: "configured",
    });
  });

  it("preserves the path and rewrites upstream redirects", async () => {
    const originFetch = vi.fn(async (request) => {
      expect(request.url).toBe(
        "https://jobagent-web-production.up.railway.app/auth/callback?code=redacted",
      );
      expect(request.headers.get("x-forwarded-host")).toBe(
        "jobagent.unalabs.cloud",
      );
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://jobagent-web-production.up.railway.app/app",
        },
      });
    });
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(
        "https://jobagent.unalabs.cloud/auth/callback?code=redacted",
      ),
      environment,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://jobagent.unalabs.cloud/app",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("fails closed when the upstream is not HTTPS", async () => {
    const response = await worker.fetch(
      new Request("https://jobagent.unalabs.cloud/readyz"),
      { JOBAGENT_ORIGIN: "http://example.test" },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ready: false,
      error: "edge_origin_must_use_https",
    });
  });
});
