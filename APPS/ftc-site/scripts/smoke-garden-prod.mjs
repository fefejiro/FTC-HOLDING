#!/usr/bin/env node

const GARDEN_URL =
  process.env.GARDEN_SMOKE_BASE_URL ||
  process.env.UNALABS_SMOKE_GARDEN_URL ||
  process.env.FTC_SMOKE_GARDEN_URL ||
  "https://gardencleaners.ca";
const PAGES_URL =
  process.env.GARDEN_SMOKE_PAGES_URL ||
  process.env.UNALABS_SMOKE_PAGES_URL ||
  process.env.FTC_SMOKE_PAGES_URL ||
  "";

const gardenChecks = [
  { url: `${GARDEN_URL}/`, expectedStatus: [200] },
  { url: `${GARDEN_URL}/portal`, expectedStatus: [200] },
  { url: `${GARDEN_URL}/quote`, expectedStatus: [200] },
  { url: `${GARDEN_URL}/garden-cleaners`, expectedStatus: [200] },
  { url: `${GARDEN_URL}/garden-cleaners/portal`, expectedStatus: [200] },
  { url: `${GARDEN_URL}/api/garden-cleaners-quote`, expectedStatus: [200, 400, 401, 405, 422, 429, 500] }
];

if (PAGES_URL) {
  gardenChecks.push(
    { url: `${PAGES_URL}/garden-cleaners`, expectedStatus: [200] },
    { url: `${PAGES_URL}/garden-cleaners/portal`, expectedStatus: [200] }
  );
}

async function request(url, method = "HEAD") {
  return fetch(url, {
    method,
    redirect: "manual"
  });
}

async function checkRoute(check) {
  let response = await request(check.url, "HEAD");
  if (response.status === 405) {
    response = await request(check.url, "GET");
  }
  const ok = check.expectedStatus.includes(response.status);
  console.log(`${ok ? "PASS" : "FAIL"} ${check.url} -> ${response.status}`);
  return ok;
}

async function run() {
  console.log(`Garden smoke URL: ${GARDEN_URL}`);
  if (PAGES_URL) {
    console.log(`Garden Pages URL: ${PAGES_URL}`);
  }

  const results = await Promise.all(gardenChecks.map(checkRoute));
  if (results.includes(false)) {
    console.error("Garden production smoke checks failed.");
    process.exit(1);
  }

  console.log("Garden production smoke checks passed.");
}

run().catch((error) => {
  console.error("Garden smoke script failed with error:", error);
  process.exit(1);
});
