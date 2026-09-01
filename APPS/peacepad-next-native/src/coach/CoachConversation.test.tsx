import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CoachConversation } from "./CoachConversation";
import * as Speech from "expo-speech";

describe("CoachConversation", () => {
  it("prepares editable child-focused wording and shares only on deliberate use", async () => {
    const onUseDraft = jest.fn();
    const view = render(<CoachConversation onTranscribe={jest.fn()} onUseDraft={onUseDraft} />);

    expect(view.getByText("Talk it through with PeaceBot")).toBeTruthy();
    fireEvent.press(view.getByText("Open Conch Coach"));
    fireEvent.changeText(view.getByLabelText("Coach conversation"), "You never answer me about Saturday pickup");
    fireEvent.press(view.getByText("Create a calm draft without AI"));

    expect(view.getByLabelText("Coach draft")).toBeTruthy();
    fireEvent.press(view.getByText("Listen to draft"));
    expect(Speech.speak).toHaveBeenCalledWith(expect.stringContaining("Saturday pickup"), expect.objectContaining({ language: "en-CA" }));
    expect(onUseDraft).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Use in message"));
    await waitFor(() => expect(onUseDraft).toHaveBeenCalledWith(expect.stringContaining("Saturday pickup")));
  });

  it("keeps a provider-backed Coach turn private until the parent chooses the draft", async () => {
    const onUseDraft = jest.fn();
    const onConversationTurn = jest.fn(async () => ({
      reply: "A clear pickup time would help. What time works for you?",
      draft: "Could we confirm the pickup time for Saturday?",
      note: null,
      provider: "configured" as const
    }));
    const view = render(<CoachConversation onConversationTurn={onConversationTurn} onTranscribe={jest.fn()} onUseDraft={onUseDraft} />);

    fireEvent.press(view.getByText("Open Conch Coach"));
    fireEvent.changeText(view.getByLabelText("Coach conversation"), "Saturday pickup");
    fireEvent.press(view.getByText("Send to Coach"));

    await waitFor(() => expect(onConversationTurn).toHaveBeenCalledWith(expect.objectContaining({ topic: "Saturday pickup" })));
    expect(view.getByLabelText("Coach conversation history")).toBeTruthy();
    expect(view.getByText("A clear pickup time would help. What time works for you?")).toBeTruthy();
    expect(onUseDraft).not.toHaveBeenCalled();
  });
});
