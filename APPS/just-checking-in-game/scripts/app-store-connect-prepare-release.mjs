import crypto from "node:crypto";

// Idempotently prepares the JCI 1.2.0 candidate for review. Build 5 must be
// VALID before this script changes the store record.
const required = ["JCI_APPLE_API_KEY_ID", "JCI_APPLE_API_ISSUER_ID", "JCI_APPLE_API_PRIVATE_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "ES256", kid: process.env.JCI_APPLE_API_KEY_ID, typ: "JWT" }));
const payload = encode(JSON.stringify({ iss: process.env.JCI_APPLE_API_ISSUER_ID, aud: "appstoreconnect-v1", iat: now, exp: now + 900 }));
const signer = crypto.createSign("SHA256");
signer.update(`${header}.${payload}`);
const key = process.env.JCI_APPLE_API_PRIVATE_KEY.replace(/\\n/g, "\n");
const token = `${header}.${payload}.${signer.sign({ key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;

const request = async (path, options = {}) => {
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`${response.status} ${JSON.stringify(body)}`);
    error.status = response.status;
    throw error;
  }
  return body;
};

const app = await request("apps/6799443182?fields[apps]=name,bundleId&include=appStoreVersions");
const builds = await request("builds?filter[app]=6799443182&sort=-uploadedDate&limit=20&fields[builds]=version,processingState,uploadedDate");
const build = (builds.data ?? []).find((item) => item.attributes?.version === "5" && item.attributes?.processingState === "VALID");
if (!build) throw new Error("No VALID JCI build 5 is available in App Store Connect");

let version = (app.included ?? []).find((item) => item.type === "appStoreVersions" && item.attributes?.versionString === "1.2.0");
if (!version) {
  const created = await request("appStoreVersions", {
    method: "POST",
    body: JSON.stringify({ data: { type: "appStoreVersions", attributes: { platform: "IOS", versionString: "1.2.0", copyright: "2026 Fejiro Technology Consultancy Inc.", releaseType: "AFTER_APPROVAL", usesIdfa: false }, relationships: { app: { data: { type: "apps", id: "6799443182" } } } } }),
  });
  version = created.data;
  console.log(`Created App Store version ${version.id} (1.2.0)`);
} else {
  console.log(`Using existing App Store version ${version.id} (1.2.0)`);
}

await request(`appStoreVersions/${version.id}/relationships/build`, { method: "PATCH", body: JSON.stringify({ data: null }) });
await request(`appStoreVersions/${version.id}/relationships/build`, { method: "PATCH", body: JSON.stringify({ data: { type: "builds", id: build.id } }) });
await request(`builds/${build.id}`, { method: "PATCH", body: JSON.stringify({ data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } } }) });
console.log(`Attached build ${build.id} (5) with no exempt encryption to version ${version.id}`);

const localization = {
  description: "Make room for a conversation that matters.\n\nJust Checking In is a warm, offline card experience for a quiet moment alone or a more meaningful moment together. Draw a prompt, take your time, and let the conversation go where it needs to go.\n\nWAYS TO CHECK IN\n\n- With myself: choose a mood and reflect at your own pace.\n- Together: pass the phone, take turns, and get to know each other beyond small talk.\n- Connection journey: revisit the small moments that add up over time.\n\nMADE FOR REAL LIFE\n\nUse it on date night, with family, on a road trip, with new friends, or whenever 'How are you?' deserves a better answer. There are no scores and no pressure - just a gentle structure for being present.\n\nPRIVATE BY DESIGN\n\nJust Checking In works offline. It requires no account, has no ads or in-app purchases, and does not collect personal data.\n\nSlow down. Draw a card. Feel a little closer.",
  keywords: "conversation,connection,check in,card game,questions,relationships,wellbeing,self reflection",
  promotionalText: "Draw a card. Take a moment. Feel a little closer.",
  supportUrl: "https://just-checking-in-game.pages.dev/",
  marketingUrl: "https://just-checking-in-game.pages.dev/",
  whatsNew: "A warmer card-table experience with refined solo and together check-ins, smoother transitions, and clearer turn-taking.",
};

let detail;
try { detail = await request(`appStoreVersions/${version.id}?include=appStoreVersionLocalizations`); } catch (error) { if (error.status !== 404) throw error; }
const enUs = (detail?.included ?? []).find((item) => item.type === "appStoreVersionLocalizations" && item.attributes?.locale === "en-US");
if (enUs) {
  await request(`appStoreVersionLocalizations/${enUs.id}`, { method: "PATCH", body: JSON.stringify({ data: { type: "appStoreVersionLocalizations", id: enUs.id, attributes: localization } }) });
  console.log("Updated en-US version localization");
} else {
  await request("appStoreVersionLocalizations", { method: "POST", body: JSON.stringify({ data: { type: "appStoreVersionLocalizations", attributes: { locale: "en-US", ...localization }, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } } }) });
  console.log("Created en-US version localization");
}

console.log(JSON.stringify({ appId: "6799443182", bundleId: app.data?.attributes?.bundleId, versionId: version.id, version: "1.2.0", buildId: build.id, build: "5" }, null, 2));
