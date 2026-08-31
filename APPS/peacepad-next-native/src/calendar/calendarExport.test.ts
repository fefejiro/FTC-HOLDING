import { buildPeacePadCalendar } from "./calendarExport";

describe("PeacePad calendar export", () => {
  it("exports the recurring plan and accepted exceptions without private IDs", () => {
    const calendar = buildPeacePadCalendar({
      schedule: { enabled: true, pattern: "week_on_off", startDate: "2026-09-01", primaryParent: "you" },
      scheduleEvents: [],
      exceptions: [{
        id: "private-exception-id", familyCircleId: "private-family-id", parentingSchedulePlanId: "private-plan-id",
        requestedByIdentityId: "private-requester", assignedParentIdentityId: "me", kind: "holiday", startDate: "2026-12-24",
        endDate: "2026-12-26", note: "Christmas, morning handover", status: "accepted", resolvedByIdentityId: "other",
        resolvedAt: "2026-09-02T00:00:00.000Z", schemaVersion: "2.0", version: 2, region: "ca",
        provenance: { createdAt: "2026-09-01T00:00:00.000Z", createdBy: { identityId: "private-requester", sessionId: "private-session" }, source: "app" }
      }],
      actorIdentityId: "me",
      generatedAt: new Date("2026-09-01T12:00:00.000Z")
    });
    expect(calendar).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendar).toContain("SUMMARY:Parenting change - your time");
    expect(calendar).toContain("DESCRIPTION:Christmas\\, morning handover");
    expect(calendar).toContain("DTEND;VALUE=DATE:20261227");
    expect(calendar).not.toContain("private-family-id");
    expect(calendar).toMatch(/END:VCALENDAR\r\n$/);
  });

  it("excludes proposals until both parents accept them", () => {
    const calendar = buildPeacePadCalendar({ scheduleEvents: [], exceptions: [{
      id: "request", familyCircleId: "family", parentingSchedulePlanId: "plan", requestedByIdentityId: "me",
      assignedParentIdentityId: "other", kind: "swap", startDate: "2026-10-01", endDate: "2026-10-01", note: null,
      status: "proposed", resolvedByIdentityId: null, resolvedAt: null, schemaVersion: "2.0", version: 1, region: "ca",
      provenance: { createdAt: "2026-09-01T00:00:00.000Z", createdBy: { identityId: "me", sessionId: "session" }, source: "app" }
    }] });
    expect(calendar).not.toContain("Parenting change");
  });
});
