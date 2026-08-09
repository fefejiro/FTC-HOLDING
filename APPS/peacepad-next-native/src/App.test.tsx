import React from "react";
import { getStateFromPath } from "@react-navigation/native";
import { Share } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PeacePadCoordinationApp, peacePadLinking, resolveStartScreen } from "./App";
import { SyntheticCoordinationApi } from "./api/SyntheticCoordinationApi";
import { CoordinationStateProvider, resolveCalendarStartView } from "./coordination/CoordinationState";
import { PendingStagingInvitationProvider } from "./runtime/PeacePadStagingRuntime";

function createTestApi() {
  return new SyntheticCoordinationApi([{
    code: "CALM26",
    preview: {
      invitationId: "invitation-test",
      version: 1,
      inviterDisplayName: "Jordan",
      familyDisplayName: "Shared parenting space",
      invitedRole: "parent",
      permissions: ["messages", "calendar"],
      expiresAt: "2099-01-01T00:00:00.000Z"
    }
  }]);
}

function renderApp(
  startScreen = "home",
  initialCalendarView?: "month" | "week" | "day",
  api = createTestApi()
) {
  return render(
    <CoordinationStateProvider api={api} initialCalendarView={initialCalendarView}>
      <PeacePadCoordinationApp startScreen={startScreen} />
    </CoordinationStateProvider>
  );
}

describe("PeacePad coordination shell", () => {
  it("starts safely and rejects unsupported routes", () => {
    expect(resolveStartScreen()).toBe("foundation");
    expect(resolveStartScreen("home")).toBe("home");
    expect(resolveStartScreen("evidence-detail")).toBe("foundation");
    expect(resolveStartScreen("production-admin")).toBe("foundation");
  });

  it("shows a quiet state-derived Home without internal language", () => {
    renderApp();
    expect(screen.getByText("What would you like to do?")).toBeOnTheScreen();
    expect(screen.getByText("Upcoming events")).toBeOnTheScreen();
    for (const phrase of ["Premium because", "Gate 1", "Lab-only", "prototype", "mock", "synthetic"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeOnTheScreen();
    }
  });

  it("keeps internal reconstruction language off the welcome screen", async () => {
    renderApp("foundation");
    expect(await screen.findByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
    for (const phrase of ["Gate 1", "native lab", "synthetic", "staging gate", "Premium lab"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeOnTheScreen();
    }
  });

  it.each([
    ["Messages", "Get suggestions for clarity and tone before you send. You choose what changes."],
    ["Calendar", "August 2026"],
    ["Records", "Create a Case Binder"],
    ["More", "Family connection"]
  ] as const)("opens %s from primary navigation", (label, expected) => {
    renderApp();
    fireEvent.press(screen.getByLabelText(label));
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("routes a deep link to invitation review without accepting it", () => {
    const state = getStateFromPath("invite/CALM26", peacePadLinking.config);
    expect(state?.routes[0]).toMatchObject({ name: "invite", params: { code: "CALM26" } });
  });

  it("opens an authenticated incoming invitation for explicit review", async () => {
    const consume = jest.fn();
    render(
      <PendingStagingInvitationProvider code="CALM26" onConsumed={consume}>
        <CoordinationStateProvider api={createTestApi()}>
          <PeacePadCoordinationApp startScreen="home" />
        </CoordinationStateProvider>
      </PendingStagingInvitationProvider>
    );
    expect(await screen.findByDisplayValue("CALM26")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review invitation" })).toBeOnTheScreen();
    expect(screen.queryByText("Jordan invited you")).not.toBeOnTheScreen();
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it("exposes one selected task tab and routes Home actions", () => {
    renderApp();
    const tabs = screen.getAllByRole("tab").filter((tab) => ["Home", "Messages", "Calendar", "Records", "More"].includes(tab.props.accessibilityLabel));
    expect(tabs.filter((tab) => tab.props.accessibilityState?.selected)).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Send a message" }));
    expect(screen.getByText("Message Check")).toBeOnTheScreen();
  });
});

describe("private records preparation", () => {
  it("creates a Case Binder and prepares metadata without an upload", () => {
    renderApp("records");
    fireEvent.changeText(screen.getByLabelText("Binder name"), "School records");
    fireEvent.changeText(screen.getByLabelText("Child label"), "Child A");
    fireEvent.press(screen.getByText("Create Case Binder"));
    expect(screen.getByText("School records")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Original file name"), "school-note.pdf");
    fireEvent.changeText(screen.getByLabelText("File size in bytes"), "1200");
    fireEvent.press(screen.getByText("Prepare details"));
    expect(screen.getByLabelText("Attachment details prepared")).toBeOnTheScreen();
    expect(screen.getByText("No file was uploaded.")).toBeOnTheScreen();
  });

  it("shows validation errors without creating records", () => {
    renderApp("records");
    fireEvent.press(screen.getByText("Create Case Binder"));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a Case Binder name.");
  });
});

describe("secure invitation flow", () => {
  it("previews identity and permissions before explicit acceptance", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "calm26");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    expect(screen.getByText("Nothing is shared until you accept.")).toBeOnTheScreen();
    expect(screen.queryByText("You’re connected")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Accept invitation"));
    expect(await screen.findByText("You’re connected")).toBeOnTheScreen();
  });

  it("reports invalid codes without exposing family data", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "ABC123");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Check the code and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("Shared parenting space")).not.toBeOnTheScreen();
  });

  it("creates, shares, and revokes an invitation without connecting anyone", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
    renderApp("invite");
    fireEvent.press(screen.getByText("Create invitation"));
    expect(await screen.findByLabelText("Invitation ready")).toBeOnTheScreen();
    expect(screen.getByText("P00001")).toBeOnTheScreen();
    expect(screen.getByLabelText("Scannable invitation QR")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Share invitation"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith({ message: expect.stringContaining("Code: P00001") }));
    fireEvent.press(screen.getByText("Cancel invitation"));
    await waitFor(() => expect(screen.queryByLabelText("Invitation ready")).not.toBeOnTheScreen());
    shareSpy.mockRestore();
  });

  it("declines a preview and clears it without creating a grant", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "calm-26-extra");
    expect(screen.getByDisplayValue("CALM26")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Decline"));
    await waitFor(() => expect(screen.queryByText("Jordan invited you")).not.toBeOnTheScreen());
    expect(screen.queryByText("You’re connected")).not.toBeOnTheScreen();
  });
});

describe("layered calendar", () => {
  it("starts private, confirms sharing, switches views, and creates an event", async () => {
    renderApp("calendar");
    expect(screen.getByLabelText("month calendar")).toBeOnTheScreen();
    expect(screen.getAllByText("Private")).toHaveLength(4);
    fireEvent.press(screen.getByLabelText("Share Parenting Time"));
    expect(screen.getByText("Share this calendar?")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm sharing"));
    expect(await screen.findByText("Shared with family")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Week"));
    expect(screen.getByLabelText("week calendar")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Day"));
    expect(screen.getByLabelText("day calendar")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Event title"), "School pickup");
    fireEvent.press(screen.getByText("Save event"));
    expect((await screen.findAllByText("School pickup")).length).toBeGreaterThanOrEqual(2);
  });

  it("uses deterministic calendar proof starts with a safe fallback", () => {
    expect(resolveCalendarStartView("week")).toBe("week");
    expect(resolveCalendarStartView("day")).toBe("day");
    expect(resolveCalendarStartView("unsupported")).toBe("month");
  });

  it("uses named controls so colour is never the only layer signal", () => {
    renderApp("calendar", "week");
    expect(screen.getByLabelText("week calendar")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Hide Parenting Time" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("checkbox", { name: "Hide Parenting Time" }));
    expect(screen.getByRole("checkbox", { name: "Show Parenting Time" })).toBeOnTheScreen();
  });

  it("cancels expanded sharing and deletes an explicitly created event", async () => {
    renderApp("calendar");
    fireEvent.press(screen.getByLabelText("Share Parenting Time"));
    fireEvent.press(screen.getByText("Keep private"));
    expect(screen.getAllByText("Private").length).toBeGreaterThan(0);
    fireEvent.changeText(screen.getByLabelText("Event title"), "Dentist appointment");
    fireEvent.press(screen.getByText("Save event"));
    expect((await screen.findAllByText("Dentist appointment")).length).toBeGreaterThanOrEqual(2);
    fireEvent.press(screen.getByText("Delete event"));
    expect(screen.getByText("Delete this event? Shared participants may lose access to it.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm delete"));
    await waitFor(() => expect(screen.queryByText("Dentist appointment")).not.toBeOnTheScreen());
  });
});

describe("per-chat Message Check", () => {
  it("is off by default and requires an explicit send", async () => {
    renderApp("messages");
    expect(screen.queryByText("Check message")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Turn on"));
    await waitFor(() => expect(screen.getByText("Message Check on")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Message draft"), "You never confirm anything!!");
    fireEvent.press(screen.getByText("Check message"));
    expect(await screen.findByText("Please confirm the practical details when you can.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sent message")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Send original"));
    await waitFor(() => expect(screen.getByText("You never confirm anything!!")).toBeOnTheScreen());
  });

  it("searches only after an explicit send", async () => {
    renderApp("messages");
    fireEvent.changeText(screen.getByLabelText("Message draft"), "School pickup is at 6 PM.");
    fireEvent.press(screen.getByText("Send message"));
    await waitFor(() => expect(screen.getByText("School pickup is at 6 PM.")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Search messages"), "pickup");
    fireEvent.press(screen.getByText("Search"));
    expect(await screen.findByLabelText("Message search result")).toHaveTextContent("School pickup is at 6 PM.");
  });

  it("explains opt-in and preserves the original when a correction is saved", async () => {
    renderApp("messages");
    const disclosure = screen.getByRole("button", { name: "How Message Check works" });
    expect(disclosure.props.accessibilityState).toEqual({ expanded: false });
    fireEvent.press(disclosure);
    expect(screen.getByRole("button", { name: "How Message Check works" }).props.accessibilityState).toEqual({ expanded: true });
    fireEvent.changeText(screen.getByLabelText("Message draft"), "Pickup is at 5 PM.");
    fireEvent.press(screen.getByText("Send message"));
    await waitFor(() => expect(screen.getByText("Pickup is at 5 PM.")).toBeOnTheScreen());
    fireEvent.press(screen.getByText("Correct message"));
    expect(screen.getByText("The original remains in the record.")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Correction wording"), "Pickup is at 6 PM.");
    fireEvent.press(screen.getByText("Save correction"));
    await waitFor(() => expect(screen.getByText("Pickup is at 6 PM.")).toBeOnTheScreen());
  });

  it("supports explicit opt-out and validates short searches", async () => {
    renderApp("messages");
    fireEvent.press(screen.getByText("Turn on"));
    expect(await screen.findByText("Message Check on")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Turn off Message Check" }));
    await waitFor(() => expect(screen.queryByText("Message Check on")).not.toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Search messages"), "x");
    expect(screen.getByRole("button", { name: "Search" }).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("Search messages"), "");
    expect(screen.queryByLabelText("Message search result")).not.toBeOnTheScreen();
  });

  it("never sends when preview generation fails", async () => {
    const api = createTestApi();
    jest.spyOn(api, "previewMessage").mockRejectedValueOnce(new Error("Preview unavailable."));
    renderApp("messages", undefined, api);
    fireEvent.press(screen.getByText("Turn on"));
    await waitFor(() => expect(screen.getByText("Message Check on")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Message draft"), "Please confirm pickup.");
    fireEvent.press(screen.getByText("Check message"));
    expect(await screen.findByText("Preview unavailable.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sent message")).not.toBeOnTheScreen();
  });
});
