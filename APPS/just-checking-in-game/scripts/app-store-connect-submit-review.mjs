import crypto from "node:crypto";
// Submit only the prepared JCI 1.2.0 version; the public 1.1.0 release is untouched.
// Apple review remains the external approval boundary.

const required = ["JCI_APPLE_API_KEY_ID", "JCI_APPLE_API_ISSUER_ID", "JCI_APPLE_API_PRIVATE_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "ES256", kid: process.env.JCI_APPLE_API_KEY_ID, typ: "JWT" }));
const payload = encode(JSON.stringify({ iss: process.env.JCI_APPLE_API_ISSUER_ID, aud: "appstoreconnect-v1", iat: now, exp: now + 900 }));
const signer = crypto.createSign("SHA256"); signer.update(`${header}.${payload}`);
const key = process.env.JCI_APPLE_API_PRIVATE_KEY.replace(/\\n/g, "\n");
const token = `${header}.${payload}.${signer.sign({ key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
const request = async (path, options = {}) => {
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  const text = await response.text(); let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) { const error = new Error(`${response.status} ${JSON.stringify(body)}`); error.status = response.status; throw error; }
  return body;
};

const app = await request("apps/6799443182?include=appStoreVersions");
const version = (app.included ?? []).find((item) => item.type === "appStoreVersions" && item.attributes?.versionString === "1.2.0");
if (!version) throw new Error("JCI 1.2.0 App Store version was not found");

let reviewDetail;
try { reviewDetail = await request(`appStoreVersions/${version.id}/appStoreReviewDetail`); } catch (error) { if (error.status !== 404) throw error; }
if (!reviewDetail?.data) {
  reviewDetail = await request("appStoreReviewDetails", {
    method: "POST",
    body: JSON.stringify({ data: { type: "appStoreReviewDetails", attributes: {
      contactFirstName: "Fejiro", contactLastName: "Efiuvwere", contactPhone: "4164732732", contactEmail: "fejiro.efiuvwere@gmail.com",
      demoAccountRequired: false,
      notes: "Just Checking In Game is an offline conversation card game. No account or network connection is required. Reviewers can choose Check in with myself for a solo flow or Together here for a local two-person flow. No spoken answers are recorded and no personal data is collected.",
    }, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } } }),
  });
  console.log("Created App Store review details");
} else {
  console.log("Existing App Store review details retained");
}

const submission = await request("reviewSubmissions", {
  method: "POST",
  body: JSON.stringify({ data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: "6799443182" } } } } }),
});
const submissionId = submission.data.id;
await request("reviewSubmissionItems", {
  method: "POST",
  body: JSON.stringify({ data: { type: "reviewSubmissionItems", relationships: { reviewSubmission: { data: { type: "reviewSubmissions", id: submissionId } }, appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } } }),
});
const submitted = await request(`reviewSubmissions/${submissionId}`, {
  method: "PATCH",
  body: JSON.stringify({ data: { type: "reviewSubmissions", id: submissionId, attributes: { submitted: true } } }),
});
console.log(JSON.stringify({ appId: "6799443182", versionId: version.id, version: "1.2.0", submissionId, submissionState: submitted.data?.attributes?.state ?? null, submitted: submitted.data?.attributes?.submitted ?? true }, null, 2));
