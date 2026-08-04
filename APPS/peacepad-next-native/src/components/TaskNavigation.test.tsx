import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TaskNavigation } from "./TaskNavigation";

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
});
