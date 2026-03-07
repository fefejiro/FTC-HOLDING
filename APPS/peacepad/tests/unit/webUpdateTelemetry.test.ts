import { describe, expect, it, vi } from "vitest";
import {
  createWebUpdateTelemetryPayload,
  sendWebUpdateTelemetryPayload,
} from "../../client/src/lib/webUpdateTelemetry";

describe("web update telemetry payload", () => {
  it("creates the expected payload contract", () => {
    const payload = createWebUpdateTelemetryPayload(
      "update_prompt_shown",
      {
        webBuildId: "web-build-123",
        knownBuildId: "web-build-122",
        sessionType: "guest",
      },
      new Date("2026-03-06T12:00:00.000Z"),
      "Mozilla/5.0 (Linux; Android 14)",
    );

    expect(payload).toEqual({
      eventName: "update_prompt_shown",
      webBuildId: "web-build-123",
      knownBuildId: "web-build-122",
      sessionType: "guest",
      platform: "android",
      timestamp: "2026-03-06T12:00:00.000Z",
    });
  });

  it("uses sendBeacon when available", () => {
    const sendBeacon = vi.fn(() => true);
    const fetchImpl = vi.fn();

    sendWebUpdateTelemetryPayload(
      {
        eventName: "update_later_clicked",
        webBuildId: "web-build-abc",
        knownBuildId: "web-build-xyz",
        sessionType: "authenticated",
        platform: "web",
        timestamp: "2026-03-06T12:00:00.000Z",
      },
      {
        endpoint: "/api/telemetry/web-update",
        sendBeacon,
        fetchImpl,
      },
    );

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to fetch when sendBeacon is unavailable", () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
    })) as unknown as typeof fetch;

    sendWebUpdateTelemetryPayload(
      {
        eventName: "update_apply_completed",
        webBuildId: "web-build-abc",
        knownBuildId: "web-build-xyz",
        sessionType: "public",
        platform: "web",
        timestamp: "2026-03-06T12:00:00.000Z",
      },
      {
        endpoint: "/api/telemetry/web-update",
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
