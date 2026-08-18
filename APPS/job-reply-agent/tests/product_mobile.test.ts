import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(".");

describe("native mobile shell", () => {
  it("uses the production HTTPS product without permitting arbitrary navigation", () => {
    const config = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
    expect(config).toContain('appId: "cloud.unalabs.jobagent"');
    expect(config).toContain('appName: "UnaScout"');
    expect(config).toContain('webDir: "public"');
    expect(config).toContain('url: "https://jobagent.unalabs.cloud/app"');
    expect(config).toContain('allowNavigation: ["jobagent.unalabs.cloud"]');
    expect(config).toContain("cleartext: false");
    expect(config).toContain("allowMixedContent: false");
  });

  it("hands OAuth to the system browser and accepts only the JobAgent return origin", () => {
    const bridge = fs.readFileSync(path.join(root, "public", "native-bridge.js"), "utf8");
    const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
    const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
    expect(bridge).toContain('const APP_ORIGIN = "https://jobagent.unalabs.cloud"');
    expect(bridge).toContain('url.origin === APP_ORIGIN');
    expect(bridge).toContain('url.protocol !== "https:"');
    expect(bridge).toContain('Plugins.Browser.open');
    expect(bridge).toContain('addListener("appUrlOpen"');
    expect(bridge).not.toMatch(/localStorage|sessionStorage|token\s*=/i);
    expect(app).toContain("window.JobAgentNative?.isNative");
    expect(app).toContain("window.JobAgentNative.openExternal(result.authorizationUrl)");
    expect(app).toContain('"jobagent:native-resume"');
    expect(html.indexOf('/native-bridge.js')).toBeLessThan(html.indexOf('/app.js'));
    expect(app).toContain("!window.JobAgentNative?.isNative");
    expect(app).toContain("if (window.JobAgentNative?.isNative) return");
  });

  it("declares verified HTTPS return links on Android and iOS", () => {
    const manifest = fs.readFileSync(
      path.join(root, "android", "app", "src", "main", "AndroidManifest.xml"),
      "utf8"
    );
    const entitlements = fs.readFileSync(
      path.join(root, "ios", "App", "App", "App.entitlements"),
      "utf8"
    );
    const xcodeProject = fs.readFileSync(
      path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj"),
      "utf8"
    );
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:scheme="https"');
    expect(manifest).toContain('android:host="jobagent.unalabs.cloud"');
    expect(manifest).toContain('android:pathPrefix="/app"');
    expect(entitlements).toContain("applinks:jobagent.unalabs.cloud");
    expect(xcodeProject).toContain("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;");
    expect(xcodeProject).toContain("TARGETED_DEVICE_FAMILY = 1;");
  });

  it("ships an app-owned privacy manifest and keeps native commerce read-only", () => {
    const privacy = fs.readFileSync(
      path.join(root, "ios", "App", "App", "PrivacyInfo.xcprivacy"),
      "utf8"
    );
    const plist = fs.readFileSync(path.join(root, "ios", "App", "App", "Info.plist"), "utf8");
    const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
    expect(privacy).toContain("NSPrivacyTracking");
    expect(privacy).toContain("<false/>");
    expect(plist).toContain("ITSAppUsesNonExemptEncryption");
    expect(app).toContain('$("#available-plans-band").hidden = true;');
    expect(app).toContain('renderBilling(await api("/api/v1/billing/entitlement"))');
    expect(app).toContain("if (window.JobAgentNative?.isNative) return;");
  });

  it("publishes exact, server-owned mobile association documents", () => {
    const server = fs.readFileSync(path.join(root, "src", "product_server.ts"), "utf8");
    const generator = fs.readFileSync(path.join(root, "scripts", "generate-store-associations.mjs"), "utf8");
    for (const source of [server, generator]) {
      expect(source).toContain("PLAY_APP_SIGNING_SHA256");
      expect(source).toContain("APPLE_APP_ID_PREFIX");
      expect(source).toContain("cloud.unalabs.jobagent");
      expect(source).toContain("/api/v1/oauth/gmail/callback*");
      expect(source).toContain("exclude: true");
    }
    expect(server).toContain('"/.well-known/assetlinks.json"');
    expect(server).toContain('"/.well-known/apple-app-site-association"');
  });

  it("excludes local signing and service credentials from version control", () => {
    const androidIgnore = fs.readFileSync(path.join(root, "android", ".gitignore"), "utf8");
    const iosIgnore = fs.readFileSync(path.join(root, "ios", ".gitignore"), "utf8");
    for (const pattern of ["*.jks", "*.keystore", "google-services.json", "local.properties"]) {
      expect(androidIgnore).toContain(pattern);
    }
    for (const pattern of ["*.mobileprovision", "*.p12", "*.cer", "xcuserdata"]) {
      expect(iosIgnore).toContain(pattern);
    }
  });
});
