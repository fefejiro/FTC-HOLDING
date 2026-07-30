import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PeacePadLabApp, resolveLabStartScreen } from "./App";
import { LabStateProvider } from "./state/LabState";

function renderLab(startScreen?: string) {
  return render(
    <LabStateProvider>
      <PeacePadLabApp startScreen={startScreen ?? "home"} />
    </LabStateProvider>
  );
}

describe("PeacePad lab navigation", () => {
  const quickActions = [
    ["Goal Setup", "What do you need first?"],
    ["Case Binder", "Case Binder setup"],
    ["Calm Compose", "Calm Compose"],
    ["Parenting Logs", "Parenting-time and child-call logs"],
    ["Evidence Vault", "Evidence Vault concept"],
    ["Evidence Detail", "Evidence detail"],
    ["Timeline", "Source-linked timeline"],
    ["Export Preview", "Premium export preview"]
  ] as const;

  it("opens Home when the lab route is requested", () => {
    renderLab();
    expect(screen.getByText("A calm operating system for parenting records.")).toBeOnTheScreen();
  });

  it.each(quickActions)("Home quick action %s opens its screen", (label, expectedText) => {
    renderLab();
    fireEvent.press(screen.getByLabelText(`Open ${label}`));
    expect(screen.getByText(expectedText)).toBeOnTheScreen();
  });

  it("opens Evidence Detail for the supported startup route", () => {
    renderLab("evidence-detail");
    expect(screen.getByText("Evidence detail")).toBeOnTheScreen();
  });

  it("falls back safely to the foundation for an unsupported startup route", () => {
    expect(resolveLabStartScreen("production-dashboard")).toBe("foundation");
  });

  it("resolves startup-route values without widening the allowed route set", () => {
    expect(resolveLabStartScreen("evidence-detail")).toBe("evidence-detail");
    expect(resolveLabStartScreen("home")).toBe("home");
    expect(resolveLabStartScreen("anything-else")).toBe("foundation");
    expect(resolveLabStartScreen()).toBe("foundation");
  });
});

describe("synthetic vertical slice", () => {
  it("carries one typed lab record from goal selection through export selection", () => {
    renderLab();

    fireEvent.press(screen.getByLabelText("Open Goal Setup"));
    fireEvent.press(screen.getByText("Organize my records"));
    fireEvent.press(screen.getByText("Continue to binder"));

    expect(screen.getByText("Case Binder setup")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Validate and continue to evidence vault"));

    expect(screen.getByText("Evidence Vault concept")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Validate metadata and open detail"));

    expect(screen.getByText("Weekly child call screenshot")).toBeOnTheScreen();
    expect(screen.getByText("Event date: 2026-07-21")).toBeOnTheScreen();
    expect(screen.getByText("Source: Synthetic parenting communication")).toBeOnTheScreen();
    expect(screen.getByText(/Original placeholder: weekly-child-call-placeholder\.png/)).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Confirm evidence review"));

    expect(screen.getByText("Linked evidence: evidence-synthetic-001")).toBeOnTheScreen();
    expect(screen.getByText("Date: 2026-07-21")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Build export preview"));

    fireEvent.press(screen.getByText("Evidence: Weekly child call screenshot"));
    fireEvent.press(screen.getByText("Timeline: Weekly child call screenshot"));
    expect(screen.getByText(/Selected: 1 evidence and 1 timeline/)).toBeOnTheScreen();
  });

  it("keeps the saved synthetic state while navigating in the active session", () => {
    renderLab();
    fireEvent.press(screen.getByLabelText("Open Case Binder"));
    fireEvent.changeText(screen.getByLabelText("Binder name"), "Synthetic evidence binder");
    fireEvent.press(screen.getByText("Validate and continue to evidence vault"));
    fireEvent.changeText(screen.getByLabelText("Evidence title"), "Synthetic schedule screenshot");
    fireEvent.press(screen.getByText("Validate metadata and open detail"));
    expect(screen.getByText("Synthetic schedule screenshot")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Back to vault"));
    expect(screen.getByDisplayValue("Synthetic schedule screenshot")).toBeOnTheScreen();
  });
});

describe("lab form validation", () => {
  it("requires binder name and child label", () => {
    renderLab();
    fireEvent.press(screen.getByLabelText("Open Case Binder"));
    fireEvent.changeText(screen.getByLabelText("Binder name"), "");
    fireEvent.changeText(screen.getByLabelText("Child label"), "");
    fireEvent.press(screen.getByText("Validate and continue to evidence vault"));
    expect(screen.getByText("Add a practical binder name with at least 3 characters.")).toBeOnTheScreen();
    expect(screen.getByText("Use initials or a short neutral label instead of a full child name.")).toBeOnTheScreen();
  });

  it("blocks missing required evidence metadata and an invalid event date", () => {
    renderLab();
    fireEvent.press(screen.getByLabelText("Open Evidence Vault"));
    fireEvent.changeText(screen.getByLabelText("Evidence title"), "");
    fireEvent.changeText(screen.getByLabelText("Evidence event date"), "July 21");
    fireEvent.changeText(screen.getByLabelText("Evidence source"), "");
    fireEvent.changeText(screen.getByLabelText("Evidence description"), "");
    fireEvent.changeText(screen.getByLabelText("Original file placeholder"), "");
    fireEvent.press(screen.getByText("Validate metadata and open detail"));

    expect(screen.getByText("Add a practical title so this source is recognizable later.")).toBeOnTheScreen();
    expect(screen.getByText("Use YYYY-MM-DD so timeline ordering stays reliable.")).toBeOnTheScreen();
    expect(screen.getByText("Describe where this synthetic record came from.")).toBeOnTheScreen();
    expect(screen.getByText("Add a short factual description.")).toBeOnTheScreen();
    expect(screen.getByText("Keep placeholder metadata for the original file.")).toBeOnTheScreen();
  });
});
