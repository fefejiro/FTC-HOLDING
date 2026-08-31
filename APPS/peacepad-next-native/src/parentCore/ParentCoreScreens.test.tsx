import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PeacePadCoordinationApp } from "../App";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { ParentCoreStateProvider } from "./ParentCoreState";

function renderFamilyTools() {
  return render(
    <CoordinationStateProvider api={new SyntheticCoordinationApi()}>
      <ParentCoreStateProvider api={new SyntheticCoordinationApi()}>
        <PeacePadCoordinationApp startScreen="family" wrapParentCoreProvider={false} />
      </ParentCoreStateProvider>
    </CoordinationStateProvider>
  );
}

describe("ParentCoreHubScreen", () => {
  it("supports the solo child, expense, support, call-plan and Conch journeys", async () => {
    renderFamilyTools();

    expect(await screen.findByRole("header", { name: "Family tools" })).toBeOnTheScreen();
    expect(await screen.findByText("Start privately, at your own pace")).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText("Child name or label"), "Maya");
    fireEvent.press(screen.getByRole("button", { name: "Add child" }));
    expect(await screen.findByText("Maya")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Update title"), "School pickup");
    fireEvent.changeText(screen.getByLabelText("Update details"), "Pickup is at the main entrance.");
    fireEvent.press(screen.getByRole("button", { name: "Save update" }));
    expect(await screen.findByText("School pickup")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("tab", { name: "Expenses" }));
    fireEvent.changeText(screen.getByLabelText("Expense title"), "School supplies");
    fireEvent.changeText(screen.getByLabelText("Amount in Canadian dollars"), "24.50");
    fireEvent.changeText(screen.getByLabelText("Expense details"), "Notebook and pencils");
    fireEvent.press(screen.getByRole("radio", { name: "Education" }));
    fireEvent.press(screen.getByRole("checkbox", { name: "Maya" }));
    fireEvent.press(screen.getByRole("radio", { name: "Split 50/50" }));
    fireEvent.press(screen.getByRole("button", { name: "Save expense" }));
    expect(await screen.findByText("School supplies")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Edit expense details" }));
    fireEvent.changeText(screen.getByLabelText("Edit expense title"), "School stationery");
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("School stationery")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Request settlement" }));
    expect(await screen.findByRole("button", { name: "Cancel settlement request" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Cancel settlement request" }));
    expect(await screen.findByText("Cancelled")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("tab", { name: "Support" }));
    fireEvent.changeText(screen.getByLabelText("City or postal code"), "Durham");
    fireEvent.press(screen.getByRole("radio", { name: "Parenting" }));
    fireEvent.press(screen.getByRole("button", { name: "Find support" }));
    await waitFor(() => expect(screen.getByText("Support near you")).toBeOnTheScreen());

    fireEvent.press(screen.getByRole("tab", { name: "Call plans" }));
    expect(screen.getByText("Scheduled calls")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Call date and time"), "2030-08-31 18:30");
    fireEvent.changeText(screen.getByLabelText("Optional call note"), "Weekly child check-in");
    fireEvent.press(screen.getByRole("radio", { name: "Audio call" }));
    expect(screen.getByLabelText("Remind me 15 minutes before this call")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText("Remind me 15 minutes before this call"));
    fireEvent.press(screen.getByRole("button", { name: "Schedule call" }));
    expect(await screen.findByText("Weekly child check-in")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Cancel call" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel call" })).not.toBeOnTheScreen());

    fireEvent.press(screen.getByRole("tab", { name: "Conch" }));
    expect(screen.getByText("Conch conversation")).toBeOnTheScreen();
    expect(screen.getByText("Start a structured conversation")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Audio Conch" }));
    expect(await screen.findByText("Waiting for the other parent")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Cancel invitation" }));
    expect(await screen.findByText("ENDED")).toBeOnTheScreen();
  });
});
