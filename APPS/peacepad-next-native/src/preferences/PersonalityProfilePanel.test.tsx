import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { StagingAccountActionsProvider, type StagingAccountActionsValue } from "../session/StagingAccountActions";
import type { PersonalityType } from "../api/CoordinationApi";
import { PersonalityProfilePanel } from "./PersonalityProfilePanel";

function renderPanel(overrides: Partial<StagingAccountActionsValue> = {}) {
  const updatePersonality = jest.fn<Promise<void>, [PersonalityType | null]>(async () => undefined);
  const value: StagingAccountActionsValue = {
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => undefined),
    deleting: false,
    personalityPreference: {
      identityId: "identity-current",
      region: "ca",
      personalityType: "INTJ",
      updatedAt: null,
      version: 0,
      schemaVersion: "2.0"
    },
    updatePersonality,
    updatingPersonality: false,
    ...overrides
  };
  render(
    <LocalizationProvider initialLocale="en">
      <StagingAccountActionsProvider value={value}>
        <PersonalityProfilePanel />
      </StagingAccountActionsProvider>
    </LocalizationProvider>
  );
  return { updatePersonality };
}

describe("PersonalityProfilePanel", () => {
  it("stays hidden when account personality actions are unavailable", () => {
    render(<LocalizationProvider initialLocale="en"><PersonalityProfilePanel /></LocalizationProvider>);
    expect(screen.queryByText("Communication profile")).toBeNull();
  });

  it("offers an optional self-selected profile and never presents co-parent guesses", () => {
    renderPanel();
    expect(screen.getByText("Communication profile")).toBeOnTheScreen();
    expect(screen.getByText(/never infers a type/)).toBeOnTheScreen();
    expect(screen.getByLabelText("INTJ").props.accessibilityState).toEqual({ checked: true, disabled: false });
    expect(screen.getByLabelText("Not sure yet").props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(screen.queryByText(/co-parent personality/i)).toBeNull();
  });

  it("persists a selected type or clears it with Not sure yet", async () => {
    const { updatePersonality } = renderPanel();
    fireEvent.press(screen.getByLabelText("INTP"));
    await waitFor(() => expect(updatePersonality).toHaveBeenCalledWith("INTP"));
    fireEvent.press(screen.getByLabelText("Not sure yet"));
    await waitFor(() => expect(updatePersonality).toHaveBeenCalledWith(null));
  });

  it("shows a busy state and safe error", () => {
    renderPanel({ updatingPersonality: true, personalityError: "PeacePad could not update your communication profile." });
    expect(screen.getByText("Saving...")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent("PeacePad could not update your communication profile.");
    expect(screen.getByLabelText("INTP").props.accessibilityState).toEqual({ checked: false, disabled: true });
  });

  it("shows a saved optional Not sure selection", () => {
    renderPanel({
      personalityPreference: {
        identityId: "identity-current",
        region: "ca",
        personalityType: null,
        updatedAt: "2026-08-30T00:00:00.000Z",
        version: 1,
        schemaVersion: "2.0"
      }
    });
    expect(screen.getByLabelText("Not sure yet").props.accessibilityState).toEqual({ checked: true, disabled: false });
    expect(screen.getByText("Communication profile saved.")).toBeOnTheScreen();
  });
});
