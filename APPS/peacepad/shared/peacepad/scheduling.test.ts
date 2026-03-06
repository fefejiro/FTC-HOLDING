import { describe, expect, it } from "vitest";
import {
  findScheduleConflicts,
  getDisplayEventTitle,
  normalizeSchedulableEvent,
} from "./scheduling";

describe("scheduling helpers", () => {
  it("uses a friendly fallback for opaque event ids", () => {
    expect(getDisplayEventTitle("htgrsFDVVS")).toBe("Untitled event");
    expect(getDisplayEventTitle("Sarah's Birthday")).toBe("Sarah's Birthday");
  });

  it("does not flag same-day events that do not overlap", () => {
    const conflicts = findScheduleConflicts([
      { title: "School Pickup", startDate: "2026-03-12T11:00:00.000Z" },
      { title: "Sarah's Birthday", startDate: "2026-03-12T20:00:00.000Z" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("detects real timed overlaps", () => {
    const conflicts = findScheduleConflicts([
      {
        title: "Doctor Appointment",
        startDate: "2026-03-12T10:00:00.000Z",
        endDate: "2026-03-12T11:00:00.000Z",
      },
      {
        title: "School Meeting",
        startDate: "2026-03-12T10:30:00.000Z",
        endDate: "2026-03-12T11:30:00.000Z",
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain("Doctor Appointment");
    expect(conflicts[0]).toContain("School Meeting");
  });

  it("treats midnight events without an end as all-day", () => {
    const normalized = normalizeSchedulableEvent({
      title: "Holiday",
      startDate: "2026-03-12T00:00:00.000Z",
    });

    expect(normalized?.isAllDay).toBe(true);

    const conflicts = findScheduleConflicts([
      { title: "Holiday", startDate: "2026-03-12T00:00:00.000Z" },
      { title: "Pickup", startDate: "2026-03-12T14:00:00.000Z" },
    ]);

    expect(conflicts).toHaveLength(1);
  });
});
