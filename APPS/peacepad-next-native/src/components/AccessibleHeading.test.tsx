import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AccessibleHeading } from "./AccessibleHeading";

it("exposes a consistent native heading semantic", () => {
  render(<AccessibleHeading>Records</AccessibleHeading>);
  expect(screen.getByRole("header", { name: "Records" })).toBeOnTheScreen();
});

