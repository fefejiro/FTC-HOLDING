import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { CommunicationStyleQuestionnaire } from "./CommunicationStyleQuestionnaire";

describe("CommunicationStyleQuestionnaire", () => {
  it("persists a private self-declared suggestion only after the parent chooses it", async () => {
    const onChoose = jest.fn();
    const view = render(<CommunicationStyleQuestionnaire identityId="parent-one" onChoose={onChoose} />);
    fireEvent.press(view.getByText("Start the short check-in"));
    for (const choice of ["Talk it through", "The bigger picture", "How people are affected", "A settled structure", "Acknowledge feelings", "A clear next step"]) {
      fireEvent.press(view.getByText(choice));
    }

    expect(view.getByText("Suggested starting style: ENFJ")).toBeTruthy();
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Use this style"));

    await waitFor(() => expect(onChoose).toHaveBeenCalledWith("ENFJ"));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad.communication-assessment.parent-one",
      expect.stringContaining('"suggestedType":"ENFJ"'),
      expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
    );
  });
});
