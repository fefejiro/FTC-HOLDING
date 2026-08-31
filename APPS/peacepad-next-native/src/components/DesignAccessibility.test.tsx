import React from "react";
import { render, screen } from "@testing-library/react-native";
import { LabButton } from "./LabButton";
import { ScreenHeader } from "./ScreenHeader";

describe("family-first shared accessibility", () => {
  it("exposes headings and supporting copy to assistive technology", () => {
    render(<ScreenHeader kicker="Shared plans" subtitle="Keep the week clear for everyone." title="Calendar" />);

    expect(screen.getByRole("header", { name: "Calendar" })).toBeOnTheScreen();
    expect(screen.getByText("SHARED PLANS")).toBeOnTheScreen();
    expect(screen.getByText("Keep the week clear for everyone.")).toBeOnTheScreen();
  });

  it("gives shared actions a name, hint, state and forgiving touch area", () => {
    render(<LabButton accessibilityHint="Saves this plan for both parents." disabled label="Save plan" onPress={jest.fn()} />);

    const action = screen.getByRole("button", { name: "Save plan" });
    expect(action).toBeDisabled();
    expect(action).toHaveProp("accessibilityHint", "Saves this plan for both parents.");
    expect(action).toHaveProp("hitSlop", 4);
  });
});
