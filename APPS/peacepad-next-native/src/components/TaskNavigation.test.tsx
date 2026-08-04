import React from "react";
import { Dimensions } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TaskNavigation } from "./TaskNavigation";

function setFontScale(fontScale: number) {
  act(() => {
    Dimensions.set({
      screen: { fontScale, height: 844, scale: 3, width: 390 },
      window: { fontScale, height: 844, scale: 3, width: 390 }
    });
  });
}

beforeEach(() => setFontScale(1));
afterEach(() => setFontScale(1));

describe("TaskNavigation accessibility", () => {
  it("exposes five named tabs with one selected destination", () => {
    const onSelect = jest.fn();
    render(<TaskNavigation active="calendar" onSelect={onSelect} />);

    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "Calendar" }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByRole("tab", { name: "Home" }).props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(screen.getByRole("tab", { name: "Records" }));
    expect(onSelect).toHaveBeenCalledWith("records");
  });

  it("keeps every primary destination at least 48 points high", () => {
    render(<TaskNavigation active="home" onSelect={jest.fn()} />);

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveStyle({ minHeight: 48 });
    }
  });

  it("grows navigation targets and permits two-line labels at large text sizes", () => {
    setFontScale(1.6);

    render(<TaskNavigation active="home" onSelect={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Home" })).toHaveStyle({ minHeight: 68 });
    expect(screen.getByText("Home").props.numberOfLines).toBe(2);

  });
});
