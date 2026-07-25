import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { LabStateProvider, syntheticFilePlaceholder, useLabState } from "./LabState";

const wrapper = ({ children }: { children: React.ReactNode }) => <LabStateProvider>{children}</LabStateProvider>;

describe("LabState", () => {
  it("confirms evidence, creates a source-linked timeline entry, and tracks export selection", () => {
    const { result } = renderHook(() => useLabState(), { wrapper });

    act(() => {
      result.current.saveBinder({
        id: "binder-test",
        name: "Synthetic binder",
        childLabel: "Child A",
        sourceTypes: ["screenshots"]
      });
      result.current.saveEvidence({
        id: "evidence-test",
        binderId: "binder-test",
        title: "Synthetic source",
        category: "screenshots",
        eventDate: "2026-07-21",
        source: "Synthetic message thread",
        description: "A synthetic description used only in automated tests.",
        originalFile: syntheticFilePlaceholder,
        reviewStatus: "draft"
      });
    });

    act(() => result.current.confirmEvidence());
    expect(result.current.evidence?.reviewStatus).toBe("confirmed");
    expect(result.current.timelineEntry).toMatchObject({
      evidenceId: "evidence-test",
      eventDate: "2026-07-21",
      sourceLabel: "Synthetic message thread"
    });

    act(() => {
      result.current.setEvidenceSelectedForExport(true);
      result.current.setTimelineSelectedForExport(true);
    });
    expect(result.current.exportSelection).toEqual({
      evidenceIds: ["evidence-test"],
      timelineEntryIds: ["timeline-evidence-test"]
    });
  });
});
