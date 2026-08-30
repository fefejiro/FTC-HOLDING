import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CoachConversation } from "./CoachConversation";
import * as Speech from "expo-speech";

describe("CoachConversation", () => {
  it("prepares editable child-focused wording and shares only on deliberate use", async () => {
    const onUseDraft = jest.fn();
    const view = render(<CoachConversation onTranscribe={jest.fn()} onUseDraft={onUseDraft} />);

    fireEvent.press(view.getByText("Open Coach"));
    fireEvent.changeText(view.getByLabelText("Coach conversation"), "You never answer me about Saturday pickup");
    fireEvent.press(view.getByText("Prepare calm wording"));

    expect(view.getByLabelText("Coach draft")).toBeTruthy();
    fireEvent.press(view.getByText("Listen to draft"));
    expect(Speech.speak).toHaveBeenCalledWith(expect.stringContaining("Saturday pickup"), expect.objectContaining({ language: "en-CA" }));
    expect(onUseDraft).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Use in message"));
    await waitFor(() => expect(onUseDraft).toHaveBeenCalledWith(expect.stringContaining("Saturday pickup")));
  });
});
