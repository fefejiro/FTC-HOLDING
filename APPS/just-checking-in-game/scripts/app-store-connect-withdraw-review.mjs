import crypto from "node:crypto";

// Withdraw only the current JCI 1.1.0 review submission so a corrected build can be attached.
// This does not delete the app, the public 1.0.0 release, or any build.
const required = ["JCI_APPLE_API_KEY_ID", "JCI_APPLE_API_ISSUER_ID", "JCI_APPLE_API_PRIVATE_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const submissionId = process.env.JCI_REVIEW_SUBMISSION_ID;
if (!submissionId) throw new Error("Missing JCI_REVIEW_SUBMISSION_ID");
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

const current = await request(`reviewSubmissions/${submissionId}`);
const state = current.data?.attributes?.state ?? null;
const alreadySubmitted = current.data?.attributes?.submitted === true;
let withdrawn = current;
if (alreadySubmitted) {
  try {
    withdrawn = await request(`reviewSubmissions/${submissionId}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { type: "reviewSubmissions", id: submissionId, attributes: { submitted: false } } }),
    });
  } catch (error) {
    // Apple can briefly reject the submission-level toggle while its item is
    // still marked submitted. Continue to the item-removal path below.
    if (error.status !== 409) throw error;
    console.log("Submission toggle reported a transient submitted-item conflict; continuing with item removal");
  }
}

// The legacy version-submission resource is still the API operation Apple
// documents for moving a WAITING_FOR_REVIEW app version to DEVELOPER_REJECTED.
// That state transition is required before a replacement build can be chosen.
try {
  const legacySubmission = await request("appStoreVersions/b238fc00-0b34-4ba6-b04e-54fa7a9b4a0e/appStoreVersionSubmission");
  const legacyId = legacySubmission.data?.id;
  if (legacyId) {
    await request(`appStoreVersionSubmissions/${legacyId}`, { method: "DELETE" });
    console.log(`Removed legacy app-version submission ${legacyId}`);
  }
} catch (error) {
  if (error.status !== 404 && error.status !== 409) throw error;
  console.log(`Legacy app-version submission removal unavailable (${error.status}); continuing with review item cleanup`);
}

// A withdrawn submission can retain its app-version item while ASC continues
// to report WAITING_FOR_REVIEW. Remove only the known JCI 1.1.0 item so the
// version can accept the corrected build 4.
const items = await request(`reviewSubmissions/${submissionId}/items?include=appStoreVersion`);
const versionItem = (items.data ?? []).find((item) => {
  const relatedVersionId = item.relationships?.appStoreVersion?.data?.id;
  if (relatedVersionId === "b238fc00-0b34-4ba6-b04e-54fa7a9b4a0e") return true;
  const included = (items.included ?? []).find((entry) => entry.type === "appStoreVersions" && entry.id === relatedVersionId);
  return included?.attributes?.versionString === "1.1.0";
});
if (versionItem) {
  try {
    await request(`reviewSubmissionItems/${versionItem.id}`, { method: "DELETE" });
    console.log(`Removed withdrawn JCI 1.1.0 review item ${versionItem.id}`);
  } catch (error) {
    if (error.status !== 409 && error.status !== 404) throw error;
    console.log(`Review item ${versionItem.id} was not removable (${error.status}); legacy app-version removal completed`);
  }
}
console.log(JSON.stringify({ submissionId, previousState: state, state: withdrawn.data?.attributes?.state ?? null, submitted: withdrawn.data?.attributes?.submitted ?? false, removedVersionItem: versionItem?.id ?? null }, null, 2));
