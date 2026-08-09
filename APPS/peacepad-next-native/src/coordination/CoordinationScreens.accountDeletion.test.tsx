import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StagingAccountActionsProvider } from "../session/StagingAccountActions";
import { MoreScreen } from "./CoordinationScreens";

describe("staging account deletion", () => {
  const signOut = jest.fn(async () => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not expose account deletion outside authenticated staging composition", () => {
    render(<MoreScreen setScreen={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete staging account" })).toBeNull();
  });

  it("requires explicit confirmation before invoking irreversible deletion", async () => {
    const deleteAccount = jest.fn(async () => undefined);
    render(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount, deleting: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    );

    expect(deleteAccount).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(screen.getByText("Delete this staging account?")).toBeTruthy();
    expect(deleteAccount).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });

  it("routes ready-state sign out through the staging lifecycle action", async () => {
    render(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    );

    fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("allows cancellation and exposes a safe deletion error", () => {
    render(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false, error: "Deletion could not be completed." }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Deletion could not be completed.");
    fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete this staging account?")).toBeNull();
  });
});
