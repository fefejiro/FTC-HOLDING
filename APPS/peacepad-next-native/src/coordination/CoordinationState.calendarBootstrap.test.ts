import type { CalendarLayer } from "../domain/v2";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { provisionDefaultCalendarLayers, type CoordinationRuntime } from "./CoordinationState";

const runtime: CoordinationRuntime = {
  actorIdentityId: "10000000-0000-4000-8000-000000000001",
  identityVersion: 1,
  sessionId: "10000000-0000-4000-8000-000000000002",
  familyCircleId: "10000000-0000-4000-8000-000000000003",
  participantGrantId: "10000000-0000-4000-8000-000000000004",
  participantGrantVersion: 1,
  region: "ca"
};

describe("fresh family calendar bootstrap", () => {
  it("creates the four private family-first calendars with authenticated scope", async () => {
    const createCalendarLayer = jest.fn(async (input) => ({
      ...input,
      id: `layer-${input.kind}`,
      version: 1,
      schemaVersion: "2.0"
    } as CalendarLayer));

    const layers = await provisionDefaultCalendarLayers(
      { createCalendarLayer } as Pick<PeacePadCoordinationApi, "createCalendarLayer">,
      runtime
    );

    expect(layers.map((layer) => layer.name)).toEqual([
      "Parenting Time",
      "Expenses & Requests",
      "Events & Activities",
      "Calls"
    ]);
    expect(createCalendarLayer).toHaveBeenCalledTimes(4);
    expect(createCalendarLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        familyCircleId: runtime.familyCircleId,
        ownerIdentityId: runtime.actorIdentityId,
        visibility: { scope: "private" }
      }),
      expect.objectContaining({
        actor: expect.objectContaining({ identityId: runtime.actorIdentityId }),
        region: runtime.region
      })
    );
  });
});
