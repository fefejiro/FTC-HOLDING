import crypto from "node:crypto";
import fs from "node:fs";

const issuerId = String(process.env.ASC_ISSUER_ID || "").trim();
const keyId = String(process.env.ASC_KEY_ID || "").trim();
const privateKeyPath = String(process.env.ASC_PRIVATE_KEY_PATH || "").trim();
const bundleId = String(process.env.ASC_BUNDLE_ID || "cloud.unalabs.jobagent").trim();
const buildNumber = String(process.env.ASC_BUILD_NUMBER || "2").trim();
const timeoutSeconds = Number(process.env.ASC_POLL_TIMEOUT_SECONDS || 1800);

if (!issuerId || !keyId || !privateKeyPath) {
  throw new Error("ASC_ISSUER_ID, ASC_KEY_ID, and ASC_PRIVATE_KEY_PATH are required");
}
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1"
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  }).toString("base64url");
  return `${unsigned}.${signature}`;
}

async function asc(pathname) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${pathname}`, {
    headers: { authorization: `Bearer ${token()}` }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`App Store Connect ${response.status}: ${JSON.stringify(body.errors || body)}`);
  }
  return body;
}

const apps = await asc(`/v1/apps?filter%5BbundleId%5D=${encodeURIComponent(bundleId)}&limit=1`);
const appId = apps.data?.[0]?.id;
if (!appId) throw new Error(`No App Store Connect app exists for ${bundleId}`);

const deadline = Date.now() + timeoutSeconds * 1000;
while (Date.now() < deadline) {
  const builds = await asc(`/v1/builds?filter%5Bapp%5D=${encodeURIComponent(appId)}&filter%5Bversion%5D=${encodeURIComponent(buildNumber)}&sort=-uploadedDate&limit=5`);
  const build = builds.data?.[0];
  if (!build) {
    console.log(`Build ${buildNumber} has not appeared yet.`);
  } else {
    const state = String(build.attributes?.processingState || "UNKNOWN");
    console.log(`Build ${buildNumber} processing state: ${state}`);
    if (state === "VALID") {
      console.log(`App Store Connect processed build id ${build.id}.`);
      process.exit(0);
    }
    if (["FAILED", "INVALID"].includes(state)) {
      throw new Error(`App Store Connect rejected build ${buildNumber} during processing (${state})`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 30_000));
}

throw new Error(`Timed out waiting for App Store Connect to process build ${buildNumber}`);
