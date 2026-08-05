import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { RecordsStateProvider, useRecordsState } from "./RecordsState";

describe("RecordsState", () => {
  it("validates binder fields and keeps prepared metadata in the active session", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RecordsStateProvider>{children}</RecordsStateProvider>;
    const { result } = renderHook(() => useRecordsState(), { wrapper });
    expect(() => result.current.createBinder("", "A")).toThrow("Case Binder name");
    act(() => { result.current.createBinder("School records", "Child A"); });
    act(() => { result.current.prepareAttachment({ originalFileName: "school-note.pdf", mediaType: "application/pdf", byteLength: 1200 }); });
    expect(result.current.binder?.name).toBe("School records");
    expect(result.current.attachmentIntent).toMatchObject({ uploadTransport: "disabled", uploadUrl: null });
  });
});
