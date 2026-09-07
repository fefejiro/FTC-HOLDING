import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PeacePadCoordinationApp } from "../App";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { dueDateToIso } from "./ParentingTasksScreen";

function renderTasks() {
  return render(
    <CoordinationStateProvider api={new SyntheticCoordinationApi()}>
      <PeacePadCoordinationApp startScreen="tasks" />
    </CoordinationStateProvider>
  );
}

describe("ParentingTasksScreen", () => {
  it("only accepts real calendar dates", () => {
    expect(dueDateToIso("2026-08-27")).toBe("2026-08-27T12:00:00.000Z");
    expect(dueDateToIso("2026-02-29")).toBeUndefined();
    expect(dueDateToIso("August 27")).toBeUndefined();
  });

  it("creates, completes, reopens, and removes a deliberately shared task", async () => {
    renderTasks();
    expect(await screen.findByRole("header", { name: "Tasks" })).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Task"), "Pack the school bag");
    fireEvent.changeText(screen.getByLabelText("Due date (optional)"), "2026-08-27");
    fireEvent.press(screen.getByRole("checkbox", { name: "Share with the other parent" }));
    fireEvent.press(screen.getByRole("button", { name: "Add task" }));
    expect(await screen.findByText("Pack the school bag")).toBeOnTheScreen();
    expect(screen.getByText("Shared · Due 2026-08-27")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Mark complete" }));
    expect(await screen.findByRole("button", { name: "Reopen task" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Reopen task" }));
    expect(await screen.findByRole("button", { name: "Mark complete" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Pack the school bag")).not.toBeOnTheScreen());
  });
});
