import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PeacePadCoordinationApp } from "../App";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { ParentCoreStateProvider } from "../parentCore/ParentCoreState";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 43.8975, longitude: -78.9429 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ city: "Durham", region: "Ontario" }]),
}));

function renderSupport() {
  return render(
    <CoordinationStateProvider api={new SyntheticCoordinationApi()}>
      <ParentCoreStateProvider api={new SyntheticCoordinationApi()}>
        <PeacePadCoordinationApp startScreen="support" wrapParentCoreProvider={false} />
      </ParentCoreStateProvider>
    </CoordinationStateProvider>,
  );
}

describe("SupportFinderScreen", () => {
  it("guides the user from need to location and kilometre range without a dashboard", async () => {
    renderSupport();

    expect(await screen.findByRole("header", { name: "What kind of help do you need?" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("radio", { name: "Legal help" }));
    fireEvent.press(screen.getByRole("button", { name: "Use my current location" }));
    await waitFor(() => expect(screen.getByDisplayValue("Durham, Ontario")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("radio", { name: "10 kilometres" }));
    expect(screen.getByRole("button", { name: "Find official help near me" })).toBeEnabled();
    fireEvent.press(screen.getByRole("button", { name: "Find official help near me" }));
    expect(await screen.findByText("No nearby match yet")).toBeOnTheScreen();
    expect(screen.getByText("Support searches stay private from your family space. If you are in immediate danger in Canada, call 911.")).toBeOnTheScreen();
  });

  it("allows manual location entry without asking for GPS", async () => {
    renderSupport();
    await screen.findByRole("header", { name: "What kind of help do you need?" });
    fireEvent.press(screen.getByRole("radio", { name: "Counselling" }));
    fireEvent.changeText(screen.getByLabelText("City or postal code"), "Whitby");
    expect(screen.getByRole("button", { name: "Find official help near me" })).toBeEnabled();
  });
});
