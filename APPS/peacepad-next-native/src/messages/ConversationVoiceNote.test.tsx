import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AudioModule, useAudioRecorderState } from "expo-audio";
import { ConversationVoiceNote } from "./ConversationVoiceNote";

describe("ConversationVoiceNote", () => {
  it("fails safely when microphone permission is denied", async () => {
    jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValueOnce(
      { granted: false } as unknown as Awaited<ReturnType<typeof AudioModule.requestRecordingPermissionsAsync>>
    );
    const onUpload = jest.fn();
    const view = render(<ConversationVoiceNote busy={false} onUpload={onUpload} />);

    fireEvent.press(view.getByText("Start recording"));

    await waitFor(() => expect(view.getByText(/Microphone access is off/)).toBeTruthy());
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows a visible timer and a non-sending stop action while recording", () => {
    jest.mocked(useAudioRecorderState).mockReturnValueOnce({
      canRecord: true,
      durationMillis: 4_200,
      isRecording: true,
      url: null
    } as ReturnType<typeof useAudioRecorderState>);
    const view = render(<ConversationVoiceNote busy={false} onUpload={jest.fn()} />);

    expect(view.getByText("Recording · 5s")).toBeTruthy();
    expect(view.getByText("Stop recording")).toBeTruthy();
    expect(view.queryByText(/share voice note/i)).toBeNull();
  });
});
