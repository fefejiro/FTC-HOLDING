import { buildCustodyBlocks, buildCustodyPreview, custodyParentForDate, type CustodySchedule } from "./custodySchedule";

const start = "2026-08-03"; // Monday

describe("legacy parenting-time schedule parity", () => {
  it("alternates full weeks and respects the selected starting parent", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "week_on_off", startDate: start, primaryParent: "you" };
    expect(custodyParentForDate("2026-08-03", schedule)).toBe("you");
    expect(custodyParentForDate("2026-08-09", schedule)).toBe("you");
    expect(custodyParentForDate("2026-08-10", schedule)).toBe("other");
    expect(custodyParentForDate("2026-08-17", { ...schedule, primaryParent: "other" })).toBe("other");
  });

  it("keeps weekdays with the primary parent and alternates weekends", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "every_other_weekend", startDate: start, primaryParent: "you" };
    expect(custodyParentForDate("2026-08-07", schedule)).toBe("you");
    expect(custodyParentForDate("2026-08-08", schedule)).toBe("you");
    expect(custodyParentForDate("2026-08-15", schedule)).toBe("other");
    expect(custodyParentForDate("2026-08-17", schedule)).toBe("you");
  });

  it("matches the legacy 2-2-3 rotation", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "two_two_three", startDate: start, primaryParent: "you" };
    expect(buildCustodyPreview(schedule, 7).map((item) => item.parent)).toEqual([
      "you", "you", "other", "other", "you", "you", "you"
    ]);
    expect(buildCustodyPreview(schedule, 14).slice(7).map((item) => item.parent)).toEqual([
      "you", "you", "other", "other", "other", "other", "other"
    ]);
  });

  it("fails closed before the schedule starts or when input is invalid", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "week_on_off", startDate: start, primaryParent: "you" };
    expect(custodyParentForDate("2026-08-02", schedule)).toBeNull();
    expect(custodyParentForDate("not-a-date", schedule)).toBeNull();
    expect(custodyParentForDate(new Date("invalid"), schedule)).toBeNull();
    expect(custodyParentForDate("2026-08-03", { ...schedule, enabled: false })).toBeNull();
    expect(buildCustodyPreview({ ...schedule, startDate: "2026-02-30" })).toEqual([]);
    expect(buildCustodyPreview({ ...schedule, enabled: false })).toEqual([]);
  });

  it("keeps previews bounded even when a caller supplies an unsafe length", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "week_on_off", startDate: start, primaryParent: "you" };
    expect(buildCustodyPreview(schedule, Number.POSITIVE_INFINITY)).toEqual([]);
    expect(buildCustodyPreview(schedule, -1)).toEqual([]);
    expect(buildCustodyPreview(schedule, 500)).toHaveLength(366);
  });

  it("compresses the preview into bounded all-day event ranges", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "week_on_off", startDate: start, primaryParent: "you" };
    expect(buildCustodyBlocks(schedule, 14)).toEqual([
      { startDate: "2026-08-03", endDate: "2026-08-10", parent: "you" },
      { startDate: "2026-08-10", endDate: "2026-08-17", parent: "other" }
    ]);
  });

  it("applies an accepted date override without changing the recurring rule", () => {
    const schedule: CustodySchedule = { enabled: true, pattern: "week_on_off", startDate: start, primaryParent: "you" };
    expect(custodyParentForDate("2026-08-04", schedule)).toBe("you");
    expect(custodyParentForDate("2026-08-04", schedule, [{ startDate: "2026-08-04", endDate: "2026-08-05", parent: "other" }])).toBe("other");
    expect(custodyParentForDate("2026-08-06", schedule, [{ startDate: "2026-08-04", endDate: "2026-08-05", parent: "other" }])).toBe("you");
  });
});
