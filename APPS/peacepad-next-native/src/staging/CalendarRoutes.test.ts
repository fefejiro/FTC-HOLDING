import { PEACEPAD_V2_SCHEMA_VERSION } from "../domain/v2";
import { CompositeStagingRoutes, StagingCalendarRoutes } from "./CalendarRoutes";
import type { CalendarService } from "./CalendarService";
import type { StagingActor } from "./InvitationService";
import type { StagingInvitationRequest } from "./InvitationRoutes";

const actor: StagingActor = {
  identityId: "identity-owner",
  displayName: "Alex Example",
  sessionId: "session-owner",
  familyPermissions: { "family-1": ["calendar:read", "calendar:write"] }
};

const request = (overrides: Partial<StagingInvitationRequest> = {}): StagingInvitationRequest => ({
  method: "GET",
  path: "/api/v2/calendar-layers?familyCircleId=family-1",
  headers: {},
  requesterKey: "requester-hash",
  actor,
  ...overrides
});

const service = () => ({
  listLayers: jest.fn(async () => []),
  createLayer: jest.fn(async (value: unknown) => value),
  updateLayer: jest.fn(async (value: unknown) => value),
  deleteLayer: jest.fn(async () => undefined),
  listEvents: jest.fn(async () => []),
  createEvent: jest.fn(async (value: unknown) => value),
  updateEvent: jest.fn(async (value: unknown) => value),
  deleteEvent: jest.fn(async () => undefined)
});

const writeHeaders = {
  "Idempotency-Key": "calendar-write",
  "X-PeacePad-Region": "ca",
  "X-PeacePad-Schema-Version": PEACEPAD_V2_SCHEMA_VERSION
};

describe("StagingCalendarRoutes", () => {
  it("requires authentication and a family query for reads", async () => {
    const routes = new StagingCalendarRoutes(service() as unknown as CalendarService);
    await expect(routes.handle(request({ actor: undefined }))).resolves.toMatchObject({ status: 401 });
    await expect(routes.handle(request({ path: "/api/v2/calendar-layers" }))).resolves.toMatchObject({ status: 400 });
  });

  it("routes calendar and event reads with the authenticated actor", async () => {
    const api = service();
    const routes = new StagingCalendarRoutes(api as unknown as CalendarService);
    await expect(routes.handle(request())).resolves.toEqual({ status: 200, body: [] });
    await expect(routes.handle(request({ path: "/api/v2/schedule-events?familyCircleId=family-1" }))).resolves.toEqual({ status: 200, body: [] });
    expect(api.listLayers).toHaveBeenCalledWith("family-1", actor);
    expect(api.listEvents).toHaveBeenCalledWith("family-1", actor);
  });

  it("requires write isolation headers and rejects path/body ID mismatches", async () => {
    const routes = new StagingCalendarRoutes(service() as unknown as CalendarService);
    await expect(routes.handle(request({
      method: "POST",
      path: "/api/v2/calendar-layers",
      body: {}
    }))).resolves.toMatchObject({ status: 400 });
    await expect(routes.handle(request({
      method: "PATCH",
      path: "/api/v2/calendar-layers/layer-1",
      headers: { ...writeHeaders, "If-Match": "1" },
      body: { id: "layer-2" }
    }))).resolves.toMatchObject({ status: 400 });
    await expect(routes.handle(request({
      method: "PATCH",
      path: "/api/v2/schedule-events/event-1",
      headers: { ...writeHeaders, "If-Match": "not-a-version" },
      body: { id: "event-1" }
    }))).resolves.toMatchObject({ status: 400 });
  });

  it("dispatches only calendar paths away from invitation routes", async () => {
    const invitations = { handle: jest.fn(async () => ({ status: 202, body: "invitation" })) };
    const calendar = new StagingCalendarRoutes(service() as unknown as CalendarService);
    const calendarHandle = jest.spyOn(calendar, "handle");
    const routes = new CompositeStagingRoutes(invitations, calendar);

    await expect(routes.handle(request())).resolves.toMatchObject({ status: 200 });
    await expect(routes.handle(request({ path: "/api/v2/invitations", method: "POST" }))).resolves.toEqual({ status: 202, body: "invitation" });
    expect(calendarHandle).toHaveBeenCalledTimes(1);
    expect(invitations.handle).toHaveBeenCalledTimes(1);
  });
});
