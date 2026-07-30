import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import {
  isLegacyCallingEnabled,
  isLegacyCallingMessageType,
  LEGACY_CALLING_HTTP_PREFIXES,
  rejectDisabledLegacyCalling,
} from "../../server/lib/callingSecurity";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("PeacePad legacy calling security gate", () => {
  it("cannot enable the historical calling stack in production", () => {
    expect(
      isLegacyCallingEnabled({
        NODE_ENV: "production",
        PEACEPAD_ENABLE_LEGACY_CALLING: "true",
      }),
    ).toBe(false);
  });

  it("requires an explicit opt-in outside production", () => {
    expect(isLegacyCallingEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(
      isLegacyCallingEnabled({
        NODE_ENV: "development",
        PEACEPAD_ENABLE_LEGACY_CALLING: "true",
      }),
    ).toBe(true);
  });

  it("covers every dormant HTTP call surface", () => {
    expect(LEGACY_CALLING_HTTP_PREFIXES).toEqual(
      expect.arrayContaining([
        "/api/call-sessions",
        "/api/calls",
        "/api/scheduled-calls",
        "/api/call-preferences",
        "/api/conch-sessions",
        "/api/call-recordings",
        "/api/webrtc",
        "/uploads/recordings",
      ]),
    );
  });

  it("returns a non-enumerating response for disabled routes", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    rejectDisabledLegacyCalling({} as any, { status, json } as any, vi.fn());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: "Endpoint not found" });
  });

  it("blocks every legacy signaling message family", () => {
    for (const type of [
      "join-session",
      "leave-session",
      "offer",
      "answer",
      "ice-candidate",
      "call-start",
      "call-end",
      "ai-listening-consent",
      "v2:join",
    ]) {
      expect(isLegacyCallingMessageType(type)).toBe(true);
    }
    expect(isLegacyCallingMessageType("heartbeat")).toBe(false);
  });

  it("binds socket identity to a server session and limits payload size", () => {
    const signaling = readSource("../../server/webrtc-signaling.ts");

    expect(signaling).toContain("resolveRealtimeIdentity");
    expect(signaling).toContain("request.realtimeIdentity = identity");
    expect(signaling).not.toMatch(/url\.searchParams\.get\(["']userId["']\)/);
    expect(signaling).not.toMatch(/url\.searchParams\.get\(["']sessionId["']\)/);
    expect(signaling).toMatch(/maxPayload:\s*64\s*\*\s*1024/);
    expect(signaling).toContain('done(false, 401, "Authentication required")');
    expect(signaling).toContain('done(false, 403, "Origin not allowed")');
  });

  it("checks Android media requests against a trusted origin", () => {
    const activity = readSource(
      "../../android/app/src/main/java/ca/peacepad/family/MainActivity.java",
    );

    expect(activity).toContain("isTrustedMediaOrigin(request.getOrigin())");
    expect(activity).toContain('"peacepad.ca".equals(host)');
    expect(activity).toContain('"www.peacepad.ca".equals(host)');
    expect(activity).toContain("BuildConfig.DEBUG");
    expect(activity).toContain("request.deny()");
  });
});
