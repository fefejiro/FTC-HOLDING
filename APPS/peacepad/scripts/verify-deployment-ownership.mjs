#!/usr/bin/env node

const webOrigin = (process.env.WEB_ORIGIN || "https://peacepad.ca").replace(/\/+$/, "");
const apiOrigin = (process.env.API_ORIGIN || "https://api.peacepad.ca").replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithBody(url, init = {}) {
  const response = await fetch(url, { redirect: "manual", ...init });
  const body = await response.text();
  return { response, body };
}

function parseHtmlAsset(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : null;
}

async function run() {
  console.log(`[Ownership] WEB_ORIGIN=${webOrigin}`);
  console.log(`[Ownership] API_ORIGIN=${apiOrigin}`);

  const webOnboarding = await fetchWithBody(`${webOrigin}/onboarding`);
  assert(webOnboarding.response.status === 200, `[Ownership] ${webOrigin}/onboarding expected 200, got ${webOnboarding.response.status}`);
  const webContentType = webOnboarding.response.headers.get("content-type") || "";
  assert(webContentType.includes("text/html"), `[Ownership] ${webOrigin}/onboarding expected HTML, got ${webContentType}`);
  const webServer = (webOnboarding.response.headers.get("server") || "").toLowerCase();
  assert(webServer.includes("cloudflare"), `[Ownership] ${webOrigin} should be Cloudflare-served, got server=${webServer || "(missing)"}`);

  const webIndexAsset = parseHtmlAsset(
    webOnboarding.body,
    /<script[^>]+src="(\/assets\/index-[^"]+\.js)"/i,
  );
  assert(webIndexAsset, `[Ownership] Could not find index JS asset on ${webOrigin}/onboarding`);
  const webJs = await fetchWithBody(`${webOrigin}${webIndexAsset}`);
  assert(webJs.response.status === 200, `[Ownership] ${webOrigin}${webIndexAsset} expected 200, got ${webJs.response.status}`);
  assert(
    webJs.body.includes("api.peacepad.ca"),
    `[Ownership] Frontend bundle ${webIndexAsset} does not reference api.peacepad.ca`,
  );

  const apiHealth = await fetchWithBody(`${apiOrigin}/api/health`, {
    headers: { Accept: "application/json" },
  });
  assert(apiHealth.response.status === 200, `[Ownership] ${apiOrigin}/api/health expected 200, got ${apiHealth.response.status}`);
  const apiContentType = apiHealth.response.headers.get("content-type") || "";
  assert(apiContentType.includes("application/json"), `[Ownership] ${apiOrigin}/api/health expected JSON, got ${apiContentType}`);
  const apiServer = (apiHealth.response.headers.get("server") || "").toLowerCase();
  assert(
    apiServer.includes("railway"),
    `[Ownership] ${apiOrigin} should be Railway-served API, got server=${apiServer || "(missing)"}`,
  );

  const apiOnboarding = await fetchWithBody(`${apiOrigin}/onboarding`, {
    headers: { Accept: "application/json" },
  });
  assert(
    apiOnboarding.response.status === 404,
    `[Ownership] ${apiOrigin}/onboarding should be API-only 404, got ${apiOnboarding.response.status}`,
  );
  const apiOnboardingType = apiOnboarding.response.headers.get("content-type") || "";
  assert(
    apiOnboardingType.includes("application/json"),
    `[Ownership] ${apiOrigin}/onboarding should return JSON error in API-only mode, got ${apiOnboardingType}`,
  );

  console.log("[Ownership] PASS: Frontend and backend ownership checks succeeded.");
  console.log(`[Ownership] Web index asset: ${webIndexAsset}`);
}

run().catch((error) => {
  console.error("[Ownership] FAIL:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

