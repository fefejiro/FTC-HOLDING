import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicRoot = path.resolve("public");

describe("public beta PWA", () => {
  it("ships an external-script, installable, no-API-cache application shell", () => {
    const html = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
    const manifest = JSON.parse(fs.readFileSync(path.join(publicRoot, "manifest.webmanifest"), "utf8"));
    const worker = fs.readFileSync(path.join(publicRoot, "sw.js"), "utf8");
    expect(html).toContain('<script src="/native-bridge.js" defer></script>');
    expect(html).toContain('<script src="/app.js" defer></script>');
    expect(html).not.toMatch(/<script(?![^>]+src=)[^>]*>/i);
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icon.png", sizes: "512x512" })
    ]));
    for (const icon of ["icon-192.png", "icon.png"]) {
      const binary = fs.readFileSync(path.join(publicRoot, icon));
      const fallback = Buffer.from(
        fs.readFileSync(path.join(publicRoot, `${icon}.b64`), "ascii").trim(),
        "base64"
      );
      expect(fallback.equals(binary)).toBe(true);
    }
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).not.toMatch(/cache\.put\([^)]*\/api\//);
  });

  it("exposes the full candidate safety and privacy surface", () => {
    const html = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
    const app = fs.readFileSync(path.join(publicRoot, "app.js"), "utf8");
    for (const id of [
      "onboarding-form",
      "policy-form",
      "resume-upload-form",
      "truth-form",
      "connection-grid",
      "approval-list",
      "application-list",
      "pause-account",
      "export-account",
      "delete-account-form"
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const route of ["/privacy", "/terms", "/google-data", "/retention", "/account-deletion"]) {
      expect(html).toContain(`href="${route}"`);
    }
    expect(app).toContain('cookie("jobagent_csrf")');
    expect(app).toContain('"idempotency-key"');
    expect(app).toContain("Verification evidence not recorded");
  });

  it("publishes all required legal and Google-data disclosures", () => {
    const pages = [
      "privacy.html",
      "terms.html",
      "google-data.html",
      "retention.html",
      "account-deletion.html"
    ];
    for (const page of pages) {
      const content = fs.readFileSync(path.join(publicRoot, page), "utf8");
      expect(content).toContain("Una Labs JobAgent");
    }
    for (const page of ["privacy.html", "google-data.html", "retention.html", "account-deletion.html"]) {
      expect(fs.readFileSync(path.join(publicRoot, page), "utf8"))
        .toContain("privacy@unalabs.cloud");
    }
    const google = fs.readFileSync(path.join(publicRoot, "google-data.html"), "utf8");
    expect(google).toContain("Limited Use");
    expect(google).toContain("Gmail modify");
    expect(google).toContain("Gmail send");
  });
});
