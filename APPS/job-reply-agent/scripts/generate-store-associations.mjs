import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appIdPrefix = String(process.env.APPLE_APP_ID_PREFIX || "").trim().toUpperCase();
const fingerprints = String(process.env.PLAY_APP_SIGNING_SHA256 || "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

if (!/^[A-Z0-9]{10}$/.test(appIdPrefix)) {
  throw new Error("APPLE_APP_ID_PREFIX must be the exact 10-character App ID prefix from the provisioning profile");
}
if (!fingerprints.length || fingerprints.some((value) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) {
  throw new Error("PLAY_APP_SIGNING_SHA256 must contain the Play App Signing SHA-256 fingerprint, not an unverified placeholder");
}

const destination = path.join(root, "public", ".well-known");
fs.mkdirSync(destination, { recursive: true });

const assetLinks = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: "cloud.unalabs.jobagent",
    sha256_cert_fingerprints: fingerprints,
  },
}];
const appleAssociation = {
  applinks: {
    apps: [],
    details: [{
      appIDs: [`${appIdPrefix}.cloud.unalabs.jobagent`],
      components: [
        { "/": "/api/v1/oauth/gmail/callback*", exclude: true, comment: "OAuth exchange must complete on the server" },
        { "/": "/app*", comment: "UnaScout customer workspace" },
        { "/": "/accept-invite*", comment: "Invitation acceptance" },
        { "/": "/verify-email*", comment: "Email verification" },
        { "/": "/reset-password*", comment: "Password reset" },
      ],
    }],
  },
  webcredentials: { apps: [`${appIdPrefix}.cloud.unalabs.jobagent`] },
};

fs.writeFileSync(path.join(destination, "assetlinks.json"), `${JSON.stringify(assetLinks, null, 2)}\n`);
fs.writeFileSync(path.join(destination, "apple-app-site-association"), `${JSON.stringify(appleAssociation, null, 2)}\n`);
console.log(`Generated exact association files for Apple App ID prefix ${appIdPrefix} and ${fingerprints.length} Play signing certificate(s).`);
