import crypto from "node:crypto";
// Idempotently prepares the JCI 1.1.0 candidate for review.
// Build 3 must be VALID before any metadata mutation occurs.
// Re-running is safe: existing version/localization records are retained.
// Required store-side attributes are reconciled on every prepare run.

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
const build = (builds.data ?? []).find((item) => item.attributes?.version === "3" && item.attributes?.processingState === "VALID");
if (!build) throw new Error("No VALID JCI build 3 is available in App Store Connect");

let version = (app.included ?? []).find((item) => item.type === "appStoreVersions" && item.attributes?.versionString === "1.1.0");
if (!version) {
  const created = await request("appStoreVersions", {
    method: "POST",
    body: JSON.stringify({ data: { type: "appStoreVersions", attributes: { platform: "IOS", versionString: "1.1.0", copyright: "2026 Fejiro Technology Consultancy Inc.", releaseType: "AFTER_APPROVAL", usesIdfa: false }, relationships: { app: { data: { type: "apps", id: "6799443182" } } } } }),
  });
  version = created.data;
  console.log(`Created App Store version ${version.id} (1.1.0)`);
} else {
  console.log(`Using existing App Store version ${version.id} (1.1.0)`);
}

await request(`appStoreVersions/${version.id}/relationships/build`, {
  method: "PATCH",
  body: JSON.stringify({ data: { type: "builds", id: build.id } }),
});
console.log(`Attached build ${build.id} (3) to version ${version.id}`);
await request(`builds/${build.id}`, {
  method: "PATCH",
  body: JSON.stringify({ data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } } }),
});
console.log("Set build 3 export compliance: no exempt encryption");

let detail;
try { detail = await request(`appStoreVersions/${version.id}?include=appStoreVersionLocalizations`); } catch (error) { if (error.status !== 404) throw error; }
const localizations = (detail?.included ?? []).filter((item) => item.type === "appStoreVersionLocalizations");
const enUs = localizations.find((item) => item.attributes?.locale === "en-US");
if (enUs) {
  await request(`appStoreVersionLocalizations/${enUs.id}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { type: "appStoreVersionLocalizations", id: enUs.id, attributes: { whatsNew: "Meet Check In With Myself, local Connection Journeys, session summaries, and a smoother, more comfortable way to take turns." } } }),
  });
  console.log("Updated en-US What’s New text");
}
if (!localizations.some((item) => item.attributes?.locale === "en-US")) {
  await request("appStoreVersionLocalizations", {
    method: "POST",
    body: JSON.stringify({ data: { type: "appStoreVersionLocalizations", attributes: {
      locale: "en-US",
      description: "Make room for conversations that matter.\n\nJust Checking In is a warm, offline conversation card game for friends, couples, families, and anyone who wants to connect beyond small talk. Choose a mood, pass the phone, and take turns answering prompts that can be light, playful, thoughtful, or appreciative.\n\nFOUR WAYS TO CONNECT\n\n• Easy — relaxed conversation starters for any moment\n• Closer — thoughtful questions that invite real connection\n• Playful — imaginative prompts for laughs and game night\n• Appreciate — gratitude cards that help people feel seen\n\nSIMPLE TO PLAY\n\n1. Pick a category.\n2. Read the card aloud.\n3. Answer only what feels comfortable.\n4. Pass the phone and listen without trying to fix.\n\nMADE FOR REAL LIFE\n\nUse it on date night, during a family gathering, on a road trip, with new friends, or whenever “How are you?” deserves a better answer. There are no scores and no pressure—just a gentle structure for taking turns and being present.\n\nPRIVATE BY DESIGN\n\nJust Checking In works offline. It requires no account, contains no ads or in-app purchases, and does not collect personal data. Your conversation stays in the room.\n\nSlow down. Ask something meaningful. Feel a little closer.",
      keywords: "conversation,connection,check in,card game,questions,relationships,wellbeing",
      promotionalText: "A gentler way to connect—with yourself or someone beside you.",
      supportUrl: "https://just-checking-in-game.pages.dev/",
      marketingUrl: "https://just-checking-in-game.pages.dev/",
      whatsNew: "Meet Check In With Myself, local Connection Journeys, session summaries, and a smoother, more comfortable way to take turns.",
    }, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } } }),
  });
  console.log("Created en-US version localization");
} else {
  console.log("Existing en-US version localization retained");
}

console.log(JSON.stringify({ appId: "6799443182", bundleId: app.data?.attributes?.bundleId, versionId: version.id, version: "1.1.0", buildId: build.id, build: "3" }, null, 2));
