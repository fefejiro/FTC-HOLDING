import { afterEach, describe, expect, it, vi } from "vitest";
import { createUpgradeFromGuestHandler } from "../../server/guestUpgrade";

type MockGuestIdentity = {
  session: {
    sessionId: string;
    guestId: string;
    userId: string;
    expiresAt: string;
  };
  trial: {
    expiresAt: string;
    isExpired: boolean;
  };
};

function createMockReq(options: {
  body?: unknown;
  cookie?: string;
  guestIdentity: MockGuestIdentity | null;
}) {
  return {
    body: options.body ?? {},
    headers: {
      cookie: options.cookie || "",
    },
    isAuthenticated: () => true,
    user: { claims: { sub: "auth-user-1" } },
    session: {
      userId: "guest-user-1",
      sessionId: "guest-session-1",
      guestId: "guest-cookie-id-1",
    },
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null as any,
    clearedCookies: [] as Array<{ name: string; options?: any }>,
  };

  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload: any) => {
    res.body = payload;
    return res;
  };

  res.clearCookie = (name: string, options?: any) => {
    res.clearedCookies.push({ name, options });
    return res;
  };

  return res;
}

describe("POST /api/auth/upgrade-from-guest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("migrates guest data and invalidates the guest cookie", async () => {
    const guestIdentity: MockGuestIdentity = {
      session: {
        sessionId: "guest-session-1",
        guestId: "guest-cookie-id-1",
        userId: "guest-user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      trial: {
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        isExpired: false,
      },
    };

    const migrateGuestDataToUser = vi.fn(async () => {});
    const markGuestSessionUpgradedBySessionId = vi.fn(async () => {});
    const markGuestSessionUpgraded = vi.fn(async () => {});
    const clearGuestCookie = vi.fn((req: any, res: any) => {
      res.clearCookie("peacepad_guest", { path: "/", httpOnly: true, sameSite: "lax" });
    });
    const resolveGuestIdentity = vi.fn(async (req: any) => {
      const hasGuestCookie = String(req.headers.cookie || "").includes("peacepad_guest=");
      if (!hasGuestCookie) {
        return null;
      }
      return guestIdentity;
    });

    const handler = createUpgradeFromGuestHandler({
      storage: {
        migrateGuestDataToUser,
        markGuestSessionUpgradedBySessionId,
        markGuestSessionUpgraded,
      },
      resolveGuestIdentity,
      clearGuestCookie,
    });

    const req = createMockReq({
      body: { confirmUpgrade: true },
      cookie: "peacepad_guest=guest-cookie-id-1",
      guestIdentity,
    });
    const res = createMockRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      upgraded: true,
      guestSessionId: "guest-session-1",
      upgradedToUserId: "auth-user-1",
      mergeStrategy: "prefer-authenticated-user",
    });
    expect(migrateGuestDataToUser).toHaveBeenCalledWith("guest-user-1", "auth-user-1");
    expect(markGuestSessionUpgradedBySessionId).toHaveBeenCalledWith("guest-session-1", "auth-user-1");
    expect(clearGuestCookie).toHaveBeenCalledTimes(1);
    expect(res.clearedCookies.some((c) => c.name === "peacepad_guest")).toBe(true);
    expect(req.session.userId).toBeUndefined();
    expect(req.session.sessionId).toBeUndefined();
    expect(req.session.guestId).toBeUndefined();
  });

  it("handles expired guest sessions without migration", async () => {
    const guestIdentity: MockGuestIdentity = {
      session: {
        sessionId: "guest-session-expired",
        guestId: "guest-cookie-expired",
        userId: "guest-user-expired",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
      trial: {
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        isExpired: true,
      },
    };

    const migrateGuestDataToUser = vi.fn(async () => {});
    const markGuestSessionUpgradedBySessionId = vi.fn(async () => {});
    const clearGuestCookie = vi.fn();
    const resolveGuestIdentity = vi.fn(async () => guestIdentity);

    const handler = createUpgradeFromGuestHandler({
      storage: {
        migrateGuestDataToUser,
        markGuestSessionUpgradedBySessionId,
        markGuestSessionUpgraded: vi.fn(async () => {}),
      },
      resolveGuestIdentity,
      clearGuestCookie,
    });

    const req = createMockReq({
      body: { confirmUpgrade: true },
      cookie: "peacepad_guest=guest-cookie-expired",
      guestIdentity,
    });
    const res = createMockRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("TRIAL_EXPIRED");
    expect(migrateGuestDataToUser).not.toHaveBeenCalled();
    expect(markGuestSessionUpgradedBySessionId).not.toHaveBeenCalled();
    expect(clearGuestCookie).not.toHaveBeenCalled();
  });

  it("requires explicit upgrade confirmation intent", async () => {
    const guestIdentity: MockGuestIdentity = {
      session: {
        sessionId: "guest-session-2",
        guestId: "guest-cookie-id-2",
        userId: "guest-user-2",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      trial: {
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        isExpired: false,
      },
    };

    const migrateGuestDataToUser = vi.fn(async () => {});
    const handler = createUpgradeFromGuestHandler({
      storage: {
        migrateGuestDataToUser,
        markGuestSessionUpgradedBySessionId: vi.fn(async () => {}),
        markGuestSessionUpgraded: vi.fn(async () => {}),
      },
      resolveGuestIdentity: vi.fn(async () => guestIdentity),
      clearGuestCookie: vi.fn(),
    });

    const req = createMockReq({
      body: { confirmUpgrade: false },
      cookie: "peacepad_guest=guest-cookie-id-2",
      guestIdentity,
    });
    const res = createMockRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("UPGRADE_CONFIRMATION_REQUIRED");
    expect(migrateGuestDataToUser).not.toHaveBeenCalled();
  });
});
