import { describe, expect, it } from "vitest";
import { BUILD_INFO } from "../src/buildInfo";
import { appendTraceEvent, createTraceEvent, formatTraceExport } from "../src/debugTrace";

describe("debug trace formatting", () => {
  it("includes the build stamp in exported trace text", () => {
    const event = createTraceEvent({
      source: "content",
      event: "modal_opened",
      site: "whatsapp",
      status: "ok",
      draftFingerprint: "fuck you",
      draftPreview: "Fuck you",
    });

    const exportText = formatTraceExport({
      site: "whatsapp",
      apiBaseUrl: "https://api.peacepad.ca",
      autoMonitoring: true,
      events: [event],
    });

    expect(exportText).toContain(BUILD_INFO.pathLabel);
    expect(exportText).toContain(BUILD_INFO.version);
    expect(exportText).toContain("modal_opened");
  });

  it("keeps only the newest trace events within the rolling buffer", () => {
    let events = [] as ReturnType<typeof createTraceEvent>[];
    for (let index = 0; index < 5; index += 1) {
      events = appendTraceEvent(
        events,
        createTraceEvent({
          source: "content",
          event: "draft_detected",
          site: "whatsapp",
          status: "ok",
          draftFingerprint: `draft-${index}`,
        }),
        3,
      );
    }

    expect(events).toHaveLength(3);
    expect(events[0]?.draftFingerprint).toBe("draft-2");
    expect(events[2]?.draftFingerprint).toBe("draft-4");
  });
});