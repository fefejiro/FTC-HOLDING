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
if (!alreadySubmitted) {
  console.log(JSON.stringify({ submissionId, state, submitted: false, action: "already-withdrawn" }, null, 2));
  process.exit(0);
}

const withdrawn = await request(`reviewSubmissions/${submissionId}`, {
  method: "PATCH",
  body: JSON.stringify({ data: { type: "reviewSubmissions", id: submissionId, attributes: { submitted: false } } }),
});
console.log(JSON.stringify({ submissionId, previousState: state, state: withdrawn.data?.attributes?.state ?? null, submitted: withdrawn.data?.attributes?.submitted ?? false }, null, 2));
