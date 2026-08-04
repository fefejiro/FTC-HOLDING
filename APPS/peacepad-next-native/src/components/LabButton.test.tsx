import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LabButton } from "./LabButton";

describe("LabButton", () => {
  it("exposes one named native button and handles its press", () => {
    const onPress = jest.fn();

    render(<LabButton label="Create invitation" onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Create invitation" });
    expect(button.props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes its disabled state", () => {
    render(<LabButton disabled label="Save event" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Save event" }).props.accessibilityState).toEqual({
      disabled: true
    });
  });
});
