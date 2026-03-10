import { describe, expect, it } from "vitest";
import { detectSupportedSite } from "../src/adapters";
import { canEnableAuto, canUseAuto } from "../src/storage";

describe("site adapter detection", () => {
  it("detects whatsapp host", () => {
    expect(detectSupportedSite("web.whatsapp.com")).toBe("whatsapp");
  });

  it("detects gmail host", () => {
    expect(detectSupportedSite("mail.google.com")).toBe("gmail");
  });

  it("detects slack host", () => {
    expect(detectSupportedSite("app.slack.com")).toBe("slack");
  });

  it("returns null for unsupported host", () => {
    expect(detectSupportedSite("example.com")).toBeNull();
  });
});

describe("auto-check gating", () => {
  it("allows auto toggle controls without priming", () => {
    const settings = {
      apiBaseUrl: "https://api.peacepad.ca",
      autoBySite: { whatsapp: true },
    };

    expect(canEnableAuto(settings, "whatsapp")).toBe(true);
    expect(canUseAuto(settings, "whatsapp")).toBe(true);
  });

  it("disables auto checks when site toggle is off", () => {
    const settings = {
      apiBaseUrl: "https://api.peacepad.ca",
      autoBySite: { gmail: false },
    };

    expect(canEnableAuto(settings, "gmail")).toBe(true);
    expect(canUseAuto(settings, "gmail")).toBe(false);
  });
});
