#!/usr/bin/env node

import { createSign } from "node:crypto";
import { writeFile } from "node:fs/promises";

const required = [
  "JCI_APPLE_API_KEY_ID",
  "JCI_APPLE_API_ISSUER_ID",
  "JCI_APPLE_API_PRIVATE_KEY",
  "JCI_PROVISIONING_PROFILE_PATH",
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "ES256", kid: process.env.JCI_APPLE_API_KEY_ID, typ: "JWT" }));
const payload = encode(JSON.stringify({
  iss: process.env.JCI_APPLE_API_ISSUER_ID,
  aud: "appstoreconnect-v1",
  iat: now,
  exp: now + 900,
}));
const signingInput = `${header}.${payload}`;
const signer = createSign("SHA256");
signer.update(signingInput);
signer.end();
const privateKey = process.env.JCI_APPLE_API_PRIVATE_KEY.replace(/\\n/g, "\n");
const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
const token = `${signingInput}.${signature}`;

const query = new URLSearchParams({
  "filter[name]": "Just Checking In App Store 2026 Release",
  "filter[profileType]": "IOS_APP_STORE",
  "filter[profileState]": "ACTIVE",
  "fields[profiles]": "name,profileType,profileState,profileContent,expirationDate,uuid",
});
const response = await fetch(`https://api.appstoreconnect.apple.com/v1/profiles?${query}`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) {
  throw new Error(`Apple profile download failed (HTTP ${response.status})`);
}
const body = await response.json();
const matches = body.data.filter((profile) =>
  profile.attributes?.name === "Just Checking In App Store 2026 Release" &&
  profile.attributes?.profileType === "IOS_APP_STORE" &&
  profile.attributes?.profileState === "ACTIVE" &&
  typeof profile.attributes?.profileContent === "string" &&
  profile.attributes.profileContent.length > 0,
);
if (matches.length !== 1) {
  throw new Error(`Expected one active existing JCI App Store profile; found ${matches.length}`);
}

const profile = matches[0];
await writeFile(process.env.JCI_PROVISIONING_PROFILE_PATH, Buffer.from(profile.attributes.profileContent, "base64"), { mode: 0o600 });
console.log(`[JCI] Downloaded existing profile: ${profile.attributes.name} (expires ${profile.attributes.expirationDate})`);
