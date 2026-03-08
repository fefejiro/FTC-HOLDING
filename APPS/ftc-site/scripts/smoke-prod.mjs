#!/usr/bin/env node

const BASE_URL =
  process.env.UNALABS_SMOKE_BASE_URL ||
  process.env.FTC_SMOKE_BASE_URL ||
  "https://ftc.peacepad.ca";
const PAGES_URL =
  process.env.UNALABS_SMOKE_PAGES_URL ||
  process.env.FTC_SMOKE_PAGES_URL ||
  "https://ftc-site-pages.pages.dev";

/**
 * @typedef {{url:string, expectedStatus:number[], locationIncludes?:string}} RouteCheck
 */

/** @type {RouteCheck[]} */
const ROUTE_CHECKS = [
  { url: `${BASE_URL}/`, expectedStatus: [200] },
  { url: `${BASE_URL}/capabilities`, expectedStatus: [200] },
  { url: `${BASE_URL}/work`, expectedStatus: [200] },
  { url: `${BASE_URL}/products`, expectedStatus: [200] },
  { url: `${BASE_URL}/about`, expectedStatus: [200] },
  { url: `${BASE_URL}/work-with-ftc`, expectedStatus: [200] },
  { url: `${BASE_URL}/services`, expectedStatus: [301, 308], locationIncludes: `${BASE_URL}/capabilities` },
  { url: `${BASE_URL}/case-studies`, expectedStatus: [301, 308], locationIncludes: `${BASE_URL}/work` },
  { url: `${BASE_URL}/contact`, expectedStatus: [301, 308], locationIncludes: `${BASE_URL}/work-with-ftc` },
  { url: `${BASE_URL}/robots.txt`, expectedStatus: [200] },
  { url: `${BASE_URL}/sitemap.xml`, expectedStatus: [200] },
  { url: `${PAGES_URL}/`, expectedStatus: [301, 308], locationIncludes: `${BASE_URL}/` }
];

async function request(url, method = "HEAD") {
  const response = await fetch(url, {
    method,
    redirect: "manual"
  });
  return response;
}

async function run() {
  let hasFailure = false;
  console.log(`Smoke base URL: ${BASE_URL}`);
  console.log(`Pages URL: ${PAGES_URL}`);

  for (const check of ROUTE_CHECKS) {
    let response = await request(check.url, "HEAD");
    if (response.status === 405) {
      response = await request(check.url, "GET");
    }
    const location = response.headers.get("location") || "";
    const statusOk = check.expectedStatus.includes(response.status);
    const locationOk = check.locationIncludes ? location.includes(check.locationIncludes) : true;
    const ok = statusOk && locationOk;
    const marker = ok ? "PASS" : "FAIL";
    console.log(`${marker} ${check.url} -> ${response.status}${location ? ` | ${location}` : ""}`);
    if (!ok) hasFailure = true;
  }

  const robots = await (await request(`${BASE_URL}/robots.txt`, "GET")).text();
  const sitemap = await (await request(`${BASE_URL}/sitemap.xml`, "GET")).text();
  const robotsOk =
    robots.includes(`Host: ${BASE_URL}`) && robots.includes(`Sitemap: ${BASE_URL}/sitemap.xml`);
  const sitemapOk = sitemap.includes(`<loc>${BASE_URL}/work/peacepad</loc>`);

  console.log(`${robotsOk ? "PASS" : "FAIL"} robots canonical references`);
  console.log(`${sitemapOk ? "PASS" : "FAIL"} sitemap canonical references`);
  if (!robotsOk || !sitemapOk) hasFailure = true;

  if (hasFailure) {
    console.error("Production smoke checks failed.");
    process.exit(1);
  }

  console.log("Production smoke checks passed.");
}

run().catch((error) => {
  console.error("Smoke script failed with error:", error);
  process.exit(1);
});
