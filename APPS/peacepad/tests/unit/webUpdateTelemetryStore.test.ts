import { afterEach, describe, expect, it } from "vitest";
import {
  getWebUpdateMetrics,
  parseWebUpdateTelemetryPayload,
  recordWebUpdateTelemetry,
  resetWebUpdateTelemetryForTests,
} from "../../server/lib/webUpdateTelemetry";

describe("web update telemetry store", () => {
  afterEach(() => {
    resetWebUpdateTelemetryForTests();
  });

  it("rejects malformed telemetry payloads with clear validation errors", () => {
    const parsed = parseWebUpdateTelemetryPayload({
      eventName: "unknown",
      webBuildId: "",
      sessionType: "unknown",
      platform: "web",
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error("Expected validation to fail");
    }
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors.join(" ")).toContain("eventName");
  });

  it("records events and returns aggregate metrics", () => {
    const now = Date.parse("2026-03-06T12:00:00.000Z");

    const prompt = parseWebUpdateTelemetryPayload({
      eventName: "update_prompt_shown",
      webBuildId: "build-2",
      knownBuildId: "build-1",
      sessionType: "guest",
      platform: "android",
      timestamp: "2026-03-06T11:58:00.000Z",
    });
    const updateNow = parseWebUpdateTelemetryPayload({
      eventName: "update_now_clicked",
      webBuildId: "build-2",
      knownBuildId: "build-1",
      sessionType: "guest",
      platform: "android",
      timestamp: "2026-03-06T11:58:10.000Z",
    });
    const completed = parseWebUpdateTelemetryPayload({
      eventName: "update_apply_completed",
      webBuildId: "build-2",
      knownBuildId: "build-1",
      sessionType: "guest",
      platform: "android",
      timestamp: "2026-03-06T11:58:12.000Z",
    });

    if (!prompt.ok || !updateNow.ok || !completed.ok) {
      throw new Error("Expected telemetry payloads to parse");
    }

    recordWebUpdateTelemetry(prompt.payload, now - 10000);
    recordWebUpdateTelemetry(updateNow.payload, now - 9000);
    recordWebUpdateTelemetry(completed.payload, now - 8000);

    const metrics = getWebUpdateMetrics(24, now);

    expect(metrics.totalEvents).toBe(3);
    expect(metrics.counts.update_prompt_shown).toBe(1);
    expect(metrics.counts.update_now_clicked).toBe(1);
    expect(metrics.counts.update_apply_completed).toBe(1);
    expect(metrics.conversion.promptToApplyRate).toBe(1);
    expect(metrics.platformBreakdown.android).toBe(3);
    expect(metrics.sessionBreakdown.guest).toBe(3);
  });
});
