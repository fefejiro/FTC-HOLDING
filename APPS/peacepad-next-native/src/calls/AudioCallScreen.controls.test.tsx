import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { AudioCallScreen } from "./AudioCallScreen";
import { useAudioCallState } from "./AudioCallState";

jest.mock("./AudioCallState", () => ({ useAudioCallState: jest.fn() }));

const activeCall = {
  id: "10000000-0000-4000-8000-000000000001",
  callerIdentityId: "10000000-0000-4000-8000-000000000002",
  calleeIdentityId: "10000000-0000-4000-8000-000000000003",
  status: "active"
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    call: activeCall,
    hydrated: true,
    busy: false,
    incoming: false,
    mediaState: "connected",
    muted: false,
    durationSeconds: 65,
    refresh: jest.fn(),
    start: jest.fn(),
    accept: jest.fn(),
    decline: jest.fn(),
    end: jest.fn(),
    toggleMute: jest.fn(),
    retryMedia: jest.fn(),
    ...overrides
  };
}

describe("active audio-call controls", () => {
  it("announces duration and exposes mute and end controls", () => {
    const value = state();
    (useAudioCallState as jest.Mock).mockReturnValue(value);
    render(<LocalizationProvider initialLocale="en"><AudioCallScreen /></LocalizationProvider>);

    expect(screen.getByLabelText("Call duration 01:05")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Mute microphone" }));
    fireEvent.press(screen.getByRole("button", { name: "End call" }));
    expect(value.toggleMute).toHaveBeenCalledTimes(1);
    expect(value.end).toHaveBeenCalledTimes(1);
  });

  it("offers unmute and reconnect after a failed media session", () => {
    const value = state({ mediaState: "failed", muted: true, durationSeconds: 0, error: "Connection failed." });
    (useAudioCallState as jest.Mock).mockReturnValue(value);
    render(<LocalizationProvider initialLocale="en"><AudioCallScreen /></LocalizationProvider>);

    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Unmute microphone" }));
    fireEvent.press(screen.getByRole("button", { name: "Reconnect audio" }));
    expect(value.toggleMute).toHaveBeenCalledTimes(1);
    expect(value.retryMedia).toHaveBeenCalledTimes(1);
  });
});
