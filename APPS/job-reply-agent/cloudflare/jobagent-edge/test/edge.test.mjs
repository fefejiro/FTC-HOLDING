import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../src/index.js";

const environment = {
  JOBAGENT_ORIGIN: "https://jobagent-web-production.up.railway.app",
  JOBAGENT_APPLE_APP_ID_PREFIX: "G6UNC88GQ5",
  JOBAGENT_PLAY_APP_SIGNING_SHA256:
    "44:01:43:0D:08:16:50:11:86:87:48:F4:2D:B6:2C:F5:B6:8B:55:8B:D7:BA:2D:FC:FA:03:ED:5B:F2:8D:F8:AE",
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

  it("serves exact Android and Apple association documents at the edge", async () => {
    const assetLinks = await worker.fetch(
      new Request("https://jobagent.unalabs.cloud/.well-known/assetlinks.json"),
      environment,
    );
    expect(assetLinks.status).toBe(200);
    await expect(assetLinks.json()).resolves.toEqual([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "cloud.unalabs.jobagent",
        sha256_cert_fingerprints: [environment.JOBAGENT_PLAY_APP_SIGNING_SHA256],
      },
    }]);

    const appleAssociation = await worker.fetch(
      new Request("https://jobagent.unalabs.cloud/.well-known/apple-app-site-association"),
      environment,
    );
    expect(appleAssociation.status).toBe(200);
    const body = await appleAssociation.json();
    expect(body.webcredentials.apps).toEqual(["G6UNC88GQ5.cloud.unalabs.jobagent"]);
    expect(body.applinks.details[0].appIDs).toEqual(["G6UNC88GQ5.cloud.unalabs.jobagent"]);
  });

  it("fails closed when an association identity is missing", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);
    const response = await worker.fetch(
      new Request("https://jobagent.unalabs.cloud/.well-known/assetlinks.json"),
      { JOBAGENT_ORIGIN: environment.JOBAGENT_ORIGIN },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Mobile association identity is not configured.",
    });
    expect(originFetch).not.toHaveBeenCalled();
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
