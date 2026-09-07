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

  it("edits the verified profile without exposing identity identifiers", async () => {
    const updateProfile = jest.fn(async () => undefined);
    render(withLocalization(
      <StagingAccountActionsProvider value={{
        signOut,
        deleteAccount: jest.fn(),
        deleting: false,
        displayName: "Original Parent",
        updateProfile,
        updatingProfile: false
      }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));

    const input = screen.getByLabelText("Display name");
    expect(input.props.value).toBe("Original Parent");
    fireEvent.changeText(input, "Calm Parent");
    fireEvent.press(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith("Calm Parent"));
    expect(await screen.findByText("Profile saved.")).toHaveProp("accessibilityLiveRegion", "polite");
    expect(screen.queryByText(/identity-current/i)).toBeNull();
  });

  it("announces a safe localized profile error", () => {
    render(withLocalization(
      <StagingAccountActionsProvider value={{
        signOut,
        deleteAccount: jest.fn(),
        deleting: false,
        displayName: "Parent",
        updateProfile: jest.fn(async () => undefined),
        updatingProfile: false,
        profileError: "PeacePad could not update this profile."
      }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));

    expect(screen.getByRole("alert")).toHaveTextContent("PeacePad could not update this profile.");
  });

  it("replays the three-screen introduction from Settings without signing out", () => {
    render(withLocalization(<MoreScreen setScreen={jest.fn()} />));
    fireEvent.press(screen.getByRole("button", { name: "Replay introduction" }));
    expect(screen.getByRole("header", { name: "A calmer way to coordinate parenting" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("header", { name: "Pause before you send" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("header", { name: "Keep parenting plans organized" })).toBeOnTheScreen();
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

  it("discloses shared-history retention and requires confirmation before leaving a family", async () => {
    const leaveFamily = jest.fn(async () => undefined);
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false, leaveFamily, leavingFamily: false }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>
    ));

    fireEvent.press(screen.getByRole("button", { name: "Leave this family" }));
    expect(screen.getByRole("header", { name: "Leave this family?" })).toBeOnTheScreen();
    expect(screen.getByText(/Shared coordination history will remain available/)).toBeOnTheScreen();
    expect(leaveFamily).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("header", { name: "Leave this family?" })).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Leave this family" }));
    fireEvent.press(screen.getByRole("button", { name: "Leave family" }));
    await waitFor(() => expect(leaveFamily).toHaveBeenCalledTimes(1));
  });

  it.each([
    ["fr", "Quitter cette famille", "Quitter cette famille?"],
    ["es", "Salir de esta familia", "¿Salir de esta familia?"]
  ])("localizes family-exit confirmation semantics in %s", (locale, openLabel, title) => {
    render(withLocalization(
      <StagingAccountActionsProvider value={{ signOut, deleteAccount: jest.fn(), deleting: false, leaveFamily: jest.fn(async () => undefined) }}>
        <MoreScreen setScreen={jest.fn()} />
      </StagingAccountActionsProvider>,
      locale
    ));
    fireEvent.press(screen.getByRole("button", { name: openLabel }));
    const confirmation = screen.UNSAFE_getByProps({ accessibilityViewIsModal: true });
    expect(confirmation.props.accessibilityRole).toBe("alert");
    expect(confirmation.props.accessibilityLiveRegion).toBe("assertive");
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
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
