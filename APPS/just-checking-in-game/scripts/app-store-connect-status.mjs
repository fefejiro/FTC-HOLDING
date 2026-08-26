import crypto from "node:crypto";
// Read-only release evidence helper for the JCI app record.

const required = ["JCI_APPLE_API_KEY_ID", "JCI_APPLE_API_ISSUER_ID", "JCI_APPLE_API_PRIVATE_KEY"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "ES256", kid: process.env.JCI_APPLE_API_KEY_ID, typ: "JWT" }));
const payload = encode(JSON.stringify({ iss: process.env.JCI_APPLE_API_ISSUER_ID, aud: "appstoreconnect-v1", iat: now, exp: now + 900 }));
const privateKey = process.env.JCI_APPLE_API_PRIVATE_KEY.replace(/\\n/g, "\n");
const signer = crypto.createSign("SHA256");
signer.update(`${header}.${payload}`);
const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
const token = `${header}.${payload}.${signature.toString("base64url")}`;

const request = async (path) => {
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
};

const app = await request("apps/6799443182?fields[apps]=name,bundleId,sku&include=appStoreVersions");
const builds = await request("builds?filter[app]=6799443182&sort=-uploadedDate&limit=20&fields[builds]=version,uploadedDate,processingState,expirationDate,usesNonExemptEncryption,preReleaseVersion");
const versions = await request("appStoreVersions?filter[app]=6799443182&filter[platform]=IOS&sort=-createdDate&limit=10&fields[appStoreVersions]=versionString,appStoreState,releaseType,createdDate,platform,downloadable");

console.log(JSON.stringify({
  app: { id: app.data?.id, name: app.data?.attributes?.name, bundleId: app.data?.attributes?.bundleId, sku: app.data?.attributes?.sku },
  builds: (builds.data ?? []).map((item) => ({ id: item.id, ...item.attributes })),
  versions: (versions.data ?? []).map((item) => ({ id: item.id, ...item.attributes, buildId: item.relationships?.build?.data?.id ?? null })),
}, null, 2));
