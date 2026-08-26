import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AccessibleHeading } from "./AccessibleHeading";

it("exposes a consistent native heading semantic", () => {
  render(<AccessibleHeading maxFontSizeMultiplier={2}>Records</AccessibleHeading>);
  const heading = screen.getByRole("header", { name: "Records" });
  expect(heading).toBeOnTheScreen();
  expect(heading.props.maxFontSizeMultiplier).toBe(2);
});
