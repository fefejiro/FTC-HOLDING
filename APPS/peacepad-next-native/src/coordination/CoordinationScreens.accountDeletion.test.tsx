import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { StagingAccountActionsProvider } from "../session/StagingAccountActions";
import { MoreScreen } from "./CoordinationScreens";

describe("staging account deletion", () => {
  const signOut = jest.fn(async () => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function withLocalization(children: React.ReactNode, locale = "en") {
    return <LocalizationProvider initialLocale={locale}>{children}</LocalizationProvider>;
  }

  it("does not expose account deletion outside authenticated staging composition", () => {
    render(withLocalization(<MoreScreen setScreen={jest.fn()} />));
    expect(screen.queryByRole("button", { name: "Delete staging account" })).toBeNull();
  });

  it("requires explicit confirmation before invoking irreversible deletion", async () => {
    const deleteAccount = jest.fn(async () => undefined);
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount, deleting: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));

    expect(deleteAccount).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(screen.getByText("Delete this staging account?")).toBeTruthy();
    expect(deleteAccount).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });

  it("routes ready-state sign out through the staging lifecycle action", async () => {
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));

    fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("replays the three-screen introduction from Settings without signing out", () => {
    render(withLocalization(<MoreScreen setScreen={jest.fn()} />));
    fireEvent.press(screen.getByRole("button", { name: "Replay introduction" }));
    expect(screen.getByRole("header", { name: "A calmer space for co-parenting" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("header", { name: "Pause before you send" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("header", { name: "Keep family plans together" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByRole("header", { name: "More" })).toBeOnTheScreen();
  });

  it("allows cancellation and exposes a safe deletion error", () => {
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false, error: "Deletion could not be completed." }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(screen.getAllByRole("alert").some((alert) => alert.props.children === "Deletion could not be completed.")).toBe(true);
    fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete this staging account?")).toBeNull();
  });

  it.each([
    ["fr", "Supprimer le compte de test", "Supprimer ce compte de test?", "Annuler"],
    ["es", "Eliminar cuenta de pruebas", "¿Eliminar esta cuenta de pruebas?", "Cancelar"]
  ])("localizes destructive account controls and preserves confirmation semantics in %s", (locale, openLabel, title, cancelLabel) => {
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>,
      locale
    ));
    fireEvent.press(screen.getByRole("button", { name: openLabel }));
    const confirmation = screen.UNSAFE_getByProps({ accessibilityViewIsModal: true });
    expect(confirmation.props.accessibilityRole).toBe("alert");
    expect(confirmation.props.accessibilityLiveRegion).toBe("assertive");
    expect(confirmation.props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: cancelLabel })).toBeOnTheScreen();
  });
});
