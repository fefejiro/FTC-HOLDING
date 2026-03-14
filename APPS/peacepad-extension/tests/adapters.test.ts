// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { detectSupportedSite, resolveComposerFromTarget, resolveSendTriggerFromTarget } from "../src/adapters";
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

  it("resolves whatsapp composer from a nested editable child", () => {
    document.body.innerHTML = `
      <div contenteditable="true" role="textbox" data-tab="10">
        <span id="inner">draft</span>
      </div>
    `;

    const inner = document.getElementById("inner");
    const composer = resolveComposerFromTarget("whatsapp", inner);

    expect(composer?.getAttribute("role")).toBe("textbox");
    expect(composer?.getAttribute("contenteditable")).toBe("true");
  });

  it("resolves whatsapp send trigger from nested icon target", () => {
    document.body.innerHTML = `
      <button aria-label="Send" id="send-button">
        <span data-icon="send" id="send-icon"></span>
      </button>
    `;

    const sendIcon = document.getElementById("send-icon");
    const sendTrigger = resolveSendTriggerFromTarget("whatsapp", sendIcon);

    expect(sendTrigger?.id).toBe("send-button");
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
