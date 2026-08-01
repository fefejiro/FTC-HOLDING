import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import App, { PeacePadLabApp, resolveLabStartScreen } from "./App";
import { SyntheticCoordinationApi } from "./api/SyntheticCoordinationApi";
import { CoordinationStateProvider } from "./coordination/CoordinationState";
import { LabStateProvider } from "./state/LabState";

function renderApp(startScreen = "home") {
  const api = new SyntheticCoordinationApi([{
    code: "CALM26",
    preview: {
      invitationId: "invitation-test",
      inviterDisplayName: "Jordan",
      familyDisplayName: "Shared parenting space",
      invitedRole: "parent",
      permissions: ["messages", "calendar"],
      expiresAt: "2099-01-01T00:00:00.000Z"
    }
  }]);
  return render(
    <CoordinationStateProvider api={api}>
      <LabStateProvider>
        <PeacePadLabApp startScreen={startScreen} />
      </LabStateProvider>
    </CoordinationStateProvider>
  );
}

describe("PeacePad task navigation", () => {
  it("renders the safe default app entry point", async () => {
    render(<App />);
    expect(await screen.findByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
  });

  it("opens a quiet, state-derived Home", () => {
    renderApp();
    expect(screen.getByText("What would you like to do?")).toBeOnTheScreen();
    expect(screen.getByText("Upcoming events")).toBeOnTheScreen();
    expect(screen.queryByText(/Premium is not just/i)).not.toBeOnTheScreen();
  });

  it.each([
    ["Messages", "Get suggestions for clarity and tone before you send. You choose what changes."],
    ["Calendar", "August 2026"],
    ["Records", "Organize information before you share it."],
    ["More", "Family connection"]
  ] as const)("opens %s from primary navigation", (label, expected) => {
    renderApp();
    fireEvent.press(screen.getByLabelText(label));
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("falls back safely for unsupported startup routes", () => {
    expect(resolveLabStartScreen("production-dashboard")).toBe("foundation");
    expect(resolveLabStartScreen("evidence-detail")).toBe("evidence-detail");
    expect(resolveLabStartScreen("home")).toBe("home");
    expect(resolveLabStartScreen()).toBe("foundation");
  });

  it("keeps internal product language out of normal Home", () => {
    renderApp();
    for (const phrase of ["Premium because", "Gate 1", "Lab-only", "prototype", "mock", "synthetic"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeOnTheScreen();
    }
  });
});

describe("secure invitation flow", () => {
  it("previews identity and access before forming a family connection", async () => {
    renderApp("invite");
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "calm26");
    fireEvent.press(screen.getByText("Review invitation"));

    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    expect(screen.getByText("Nothing is shared until you accept.")).toBeOnTheScreen();
    expect(screen.queryByText("You’re connected")).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText("Accept invitation"));
    expect(await screen.findByText("You’re connected")).toBeOnTheScreen();
  });

  it("shows a safe invalid-code error", async () => {
    renderApp("invite");
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "ABC123");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Check the code and try again.")).toBeOnTheScreen();
  });
});

describe("calendar coordination", () => {
  it("starts private, confirms sharing, switches views, and creates an event", async () => {
    renderApp("calendar");
    expect(screen.getAllByText("Private")).toHaveLength(4);
    fireEvent.press(screen.getByLabelText("Share Parenting Time"));
    expect(screen.getByText("Share this calendar?")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm sharing"));
    expect(await screen.findByText("Shared with family")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Week"));
    expect(screen.getByLabelText("week calendar")).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText("Event title"), "School pickup");
    fireEvent.press(screen.getByText("Save event"));
    expect(await screen.findByText("School pickup")).toBeOnTheScreen();
  });
});

describe("per-chat Message Check", () => {
  it("is off by default and never sends until the user chooses", async () => {
    renderApp("messages");
    expect(screen.getByText("Message Check")).toBeOnTheScreen();
    expect(screen.queryByText("Check message")).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText("Turn on"));
    await waitFor(() => expect(screen.getByText("Message Check on")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Message draft"), "You never confirm anything!!");
    fireEvent.press(screen.getByText("Check message"));

    expect(await screen.findByText("Please confirm the practical details when you can.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sent message")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Send original"));
    expect(screen.getByText("You never confirm anything!!")).toBeOnTheScreen();
  });
});

describe("records vertical slice", () => {
  it("carries user-entered record details through review, timeline, and export", () => {
    renderApp("binder");
    fireEvent.changeText(screen.getByLabelText("Binder name"), "Parenting records");
    fireEvent.changeText(screen.getByLabelText("Child label"), "A.");
    fireEvent.press(screen.getByText("Screenshots"));
    fireEvent.press(screen.getByText("Continue"));

    fireEvent.changeText(screen.getByLabelText("Evidence title"), "Weekly call note");
    fireEvent.changeText(screen.getByLabelText("Evidence event date"), "2026-07-21");
    fireEvent.changeText(screen.getByLabelText("Evidence source"), "Message thread");
    fireEvent.changeText(screen.getByLabelText("Evidence description"), "A factual note about the scheduled call." );
    fireEvent.press(screen.getByText("Review details"));

    expect(screen.getByText("Weekly call note")).toBeOnTheScreen();
    expect(screen.getByText("Source: Message thread")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm review"));
    expect(screen.getByText("Timeline")).toBeOnTheScreen();
    expect(screen.getByText("Source: Message thread")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Build export preview"));
    fireEvent.press(screen.getByText("Evidence: Weekly call note"));
    fireEvent.press(screen.getByText("Timeline: Weekly call note"));
    expect(screen.getByText(/Selected: 1 evidence and 1 timeline/)).toBeOnTheScreen();
  });

  it("requires binder and record metadata", () => {
    renderApp("binder");
    fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("Add a practical binder name with at least 3 characters.")).toBeOnTheScreen();
    expect(screen.getByText("Use initials or a short neutral label instead of a full child name.")).toBeOnTheScreen();
  });
});
