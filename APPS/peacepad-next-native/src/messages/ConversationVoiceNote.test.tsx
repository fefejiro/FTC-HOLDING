import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AudioModule } from "expo-audio";
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
});
