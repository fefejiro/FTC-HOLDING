import crypto from "node:crypto";

const APP_ID = "6793350735";
const VERSION = "2.0.3";
const BUILD = "14";
const mode = process.argv[2] ?? "status";

for (const name of ["ASC_API_KEY_ID", "ASC_API_ISSUER_ID", "ASC_API_PRIVATE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
if (!["status", "prepare", "submit"].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);

const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "ES256", kid: process.env.ASC_API_KEY_ID, typ: "JWT" }));
const payload = encode(JSON.stringify({ iss: process.env.ASC_API_ISSUER_ID, aud: "appstoreconnect-v1", iat: now, exp: now + 900 }));
const signer = crypto.createSign("SHA256");
signer.update(`${header}.${payload}`);
const key = process.env.ASC_API_PRIVATE_KEY.replace(/\\n/g, "\n");
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

const app = await request(`apps/${APP_ID}?fields[apps]=name,bundleId,sku&include=appStoreVersions`);
const builds = await request(`builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=30&fields[builds]=version,uploadedDate,processingState,expirationDate,usesNonExemptEncryption`);
const versions = (app.included ?? []).filter((item) => item.type === "appStoreVersions");
const build = (builds.data ?? []).find((item) => item.attributes?.version === BUILD);
let version = versions.find((item) => item.attributes?.versionString === VERSION);

const summary = () => ({
  app: { id: app.data?.id, name: app.data?.attributes?.name, bundleId: app.data?.attributes?.bundleId },
  target: { version: VERSION, build: BUILD },
  build: build ? { id: build.id, ...build.attributes } : null,
  version: version ? { id: version.id, ...version.attributes } : null,
});

if (mode === "status") {
  console.log(JSON.stringify(summary(), null, 2));
  process.exit(0);
}

if (!build || build.attributes?.processingState !== "VALID") {
  throw new Error(`Build ${BUILD} is not VALID; no App Store mutation was attempted`);
}

if (mode === "prepare") {
  if (!version) {
    const created = await request("appStoreVersions", {
      method: "POST",
      body: JSON.stringify({ data: {
        type: "appStoreVersions",
        attributes: { platform: "IOS", versionString: VERSION, copyright: "2026 Fejiro Technology Consultancy Inc.", releaseType: "AFTER_APPROVAL", usesIdfa: false },
        relationships: { app: { data: { type: "apps", id: APP_ID } } },
      } }),
    });
    version = created.data;
  } else {
    await request(`appStoreVersions/${version.id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { type: "appStoreVersions", id: version.id, attributes: { releaseType: "AFTER_APPROVAL" } } }),
    });
  }
  await request(`appStoreVersions/${version.id}/relationships/build`, {
    method: "PATCH",
    body: JSON.stringify({ data: { type: "builds", id: build.id } }),
  });
  if (build.attributes?.usesNonExemptEncryption !== false) {
    try {
      await request(`builds/${build.id}`, {
        method: "PATCH",
        body: JSON.stringify({ data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } } }),
      });
    } catch (error) {
      if (error.status !== 409 || !error.message.includes("already set")) throw error;
    }
  }
  const detail = await request(`appStoreVersions/${version.id}?include=appStoreVersionLocalizations`);
  const localizations = (detail.included ?? []).filter((item) => item.type === "appStoreVersionLocalizations");
  for (const localization of localizations) {
    await request(`appStoreVersionLocalizations/${localization.id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { type: "appStoreVersionLocalizations", id: localization.id, attributes: {
        whatsNew: "PeacePad 2.0.3 makes sign-in and account recovery more reliable, with improved Google and Apple sign-in safeguards.",
      } } }),
    });
  }
  console.log(JSON.stringify({ ...summary(), prepared: true }, null, 2));
  process.exit(0);
}

if (!version) throw new Error(`App Store version ${VERSION} does not exist; run prepare first`);
let reviewDetail;
try { reviewDetail = await request(`appStoreVersions/${version.id}/appStoreReviewDetail`); } catch (error) { if (error.status !== 404) throw error; }
if (!reviewDetail?.data) {
  await request("appStoreReviewDetails", {
    method: "POST",
    body: JSON.stringify({ data: {
      type: "appStoreReviewDetails",
      attributes: {
        contactFirstName: "Fejiro",
        contactLastName: "Efiuvwere",
        contactPhone: "+16474733500",
        contactEmail: "peacepad@peacepad.ca",
        demoAccountRequired: false,
        notes: "PeacePad opens in guest mode without an account. Reviewers can test message drafting, tone guidance, Coach, and support resources immediately. Account-only family sharing features are optional.",
      },
      relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } },
    } }),
  });
}
const submission = await request("reviewSubmissions", {
  method: "POST",
  body: JSON.stringify({ data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: APP_ID } } } } }),
});
await request("reviewSubmissionItems", {
  method: "POST",
  body: JSON.stringify({ data: { type: "reviewSubmissionItems", relationships: {
    reviewSubmission: { data: { type: "reviewSubmissions", id: submission.data.id } },
    appStoreVersion: { data: { type: "appStoreVersions", id: version.id } },
  } } }),
});
const submitted = await request(`reviewSubmissions/${submission.data.id}`, {
  method: "PATCH",
  body: JSON.stringify({ data: { type: "reviewSubmissions", id: submission.data.id, attributes: { submitted: true } } }),
});
console.log(JSON.stringify({ ...summary(), submissionId: submission.data.id, submitted: true, state: submitted.data?.attributes?.state ?? null }, null, 2));
