import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type MockState = {
  sessionCounter: number;
  userCounter: number;
  guestDataCounter: number;
  sessions: Map<string, any>;
  sessionByGuestId: Map<string, string>;
  users: Map<string, any>;
  usageMetrics: Map<string, any>;
  guestDataBySessionId: Map<string, any>;
};

const mockState: MockState = {
  sessionCounter: 0,
  userCounter: 0,
  guestDataCounter: 0,
  sessions: new Map(),
  sessionByGuestId: new Map(),
  users: new Map(),
  usageMetrics: new Map(),
  guestDataBySessionId: new Map(),
};

const storageMock = {
  async upsertUser(input: any) {
    const id = input.id || `guest-user-${++mockState.userCounter}`;
    const now = new Date();
    const user = {
      id,
      displayName: input.displayName || `Guest${mockState.userCounter}`,
      isGuest: Boolean(input.isGuest),
      guestId: input.guestId || null,
      profileImageUrl: input.profileImageUrl || null,
      expires_at: null,
      createdAt: now,
      updatedAt: now,
    };
    mockState.users.set(id, user);
    return { user, isNewUser: !input.id };
  },

  async getUser(userId: string) {
    return mockState.users.get(userId);
  },

  async createGuestSession(input: any) {
    const now = new Date();
    const row = {
      id: `guest-session-row-${++mockState.sessionCounter}`,
      guestId: input.guestId,
      sessionId: input.sessionId,
      userId: input.userId,
      displayName: input.displayName || null,
      lastActive: input.lastActive || now,
      lastSeenAt: input.lastSeenAt || now,
      expiresAt: input.expiresAt,
      upgradedToUserId: null,
      createdAt: now,
    };
    mockState.sessions.set(row.sessionId, row);
    mockState.sessionByGuestId.set(row.guestId, row.sessionId);
    return row;
  },

  async getGuestSession(sessionId: string) {
    return mockState.sessions.get(sessionId);
  },

  async getGuestSessionByGuestId(guestId: string) {
    const sessionId = mockState.sessionByGuestId.get(guestId);
    return sessionId ? mockState.sessions.get(sessionId) : undefined;
  },

  async updateGuestSessionActivity(sessionId: string) {
    const row = mockState.sessions.get(sessionId);
    if (!row) {
      return;
    }
    const now = new Date();
    row.lastActive = now;
    row.lastSeenAt = now;
  },

  async createUsageMetric(input: any) {
    mockState.usageMetrics.set(input.sessionId, input);
    return { ...input, id: `usage-${input.sessionId}` };
  },

  async getUsageMetrics(sessionId: string) {
    return mockState.usageMetrics.get(sessionId);
  },

  async updateUsageMetric(sessionId: string, updates: any) {
    const existing = mockState.usageMetrics.get(sessionId);
    if (!existing) {
      return;
    }
    mockState.usageMetrics.set(sessionId, { ...existing, ...updates });
  },

  async upsertGuestSessionData(input: any) {
    const existing = mockState.guestDataBySessionId.get(input.guestSessionId);
    const now = new Date();
    if (existing) {
      const updated = { ...existing, data: input.data, updatedAt: now };
      mockState.guestDataBySessionId.set(input.guestSessionId, updated);
      return updated;
    }

    const created = {
      id: `guest-data-${++mockState.guestDataCounter}`,
      guestSessionId: input.guestSessionId,
      data: input.data,
      createdAt: now,
      updatedAt: now,
    };
    mockState.guestDataBySessionId.set(input.guestSessionId, created);
    return created;
  },

  async cleanupExpiredSessions() {
    const now = Date.now();
    let deletedSessions = 0;
    let deletedGuestData = 0;
    let deletedUsageMetrics = 0;

    for (const [sessionId, row] of mockState.sessions.entries()) {
      if (new Date(row.expiresAt).getTime() >= now) {
        continue;
      }

      deletedSessions += 1;
      mockState.sessions.delete(sessionId);
      mockState.sessionByGuestId.delete(row.guestId);
      if (mockState.guestDataBySessionId.delete(sessionId)) {
        deletedGuestData += 1;
      }
      if (mockState.usageMetrics.delete(sessionId)) {
        deletedUsageMetrics += 1;
      }
    }

    return { deletedSessions, deletedGuestData, deletedUsageMetrics };
  },
};

vi.mock("../../server/storage", () => ({
  storage: storageMock,
}));

vi.mock("../../server/db", () => ({
  pool: {},
}));

let guestLegacyStartHandler: any;
let getSessionState: any;
let requireSession: any;
let guestCreationLimiter: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  const mod = await import("../../server/softAuth");
  guestLegacyStartHandler = mod.guestLegacyStartHandler;
  getSessionState = mod.getSessionState;
  requireSession = mod.requireSession;
  guestCreationLimiter = mod.guestCreationLimiter;
});

beforeEach(() => {
  mockState.sessionCounter = 0;
  mockState.userCounter = 0;
  mockState.guestDataCounter = 0;
  mockState.sessions.clear();
  mockState.sessionByGuestId.clear();
  mockState.users.clear();
  mockState.usageMetrics.clear();
  mockState.guestDataBySessionId.clear();
});

function createReq(overrides: Record<string, any> = {}) {
  const req: any = {
    method: "GET",
    headers: {
      host: "peacepad.ca",
      ...overrides.headers,
    },
    body: overrides.body || {},
    session: overrides.session || {},
    secure: overrides.secure || false,
    ip: overrides.ip || "127.0.0.1",
    isAuthenticated: overrides.isAuthenticated || (() => false),
    user: overrides.user,
    originalUrl: overrides.originalUrl || "/",
  };
  return req;
}

function createRes() {
  const headers = new Map<string, string>();
  const cookies: Array<{ name: string; value: string; options: any }> = [];
  const clearedCookies: Array<{ name: string; options: any }> = [];

  const res: any = {
    statusCode: 200,
    body: undefined,
    headers,
    cookies,
    clearedCookies,
    set(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    cookie(name: string, value: string, options: any) {
      cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name: string, options: any) {
      clearedCookies.push({ name, options });
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };

  return res;
}

async function runMiddleware(middleware: any, req: any, res: any): Promise<boolean> {
  let nextCalled = false;
  await Promise.resolve(
    middleware(req, res, () => {
      nextCalled = true;
    }),
  );
  return nextCalled;
}

describe("Guest auth integration", () => {
  it("creates guest session via POST /api/auth/guest and sets secure cookie attributes", async () => {
    const req = createReq({
      method: "POST",
      ip: "198.51.100.10",
      headers: {
        "x-forwarded-for": "198.51.100.10",
      },
      body: { displayName: "Guest Tester" },
      originalUrl: "/api/auth/guest",
    });
    const res = createRes();

    await guestLegacyStartHandler(req, res, () => undefined);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.guestId).toBeTruthy();
    expect(res.body.guestSessionId).toBeTruthy();
    expect(res.body.sessionId).toBe(res.body.guestSessionId);

    const ttlMs = new Date(res.body.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThan(15 * 24 * 60 * 60 * 1000);

    const guestCookie = res.cookies.find((cookie) => cookie.name === "peacepad_guest");
    expect(guestCookie).toBeTruthy();
    expect(guestCookie.options.httpOnly).toBe(true);
    expect(String(guestCookie.options.sameSite).toLowerCase()).toBe("lax");

    const saved = mockState.sessions.get(res.body.guestSessionId);
    expect(saved).toBeTruthy();
    expect(new Date(saved.expiresAt).getTime()).toBeGreaterThan(new Date(saved.createdAt).getTime());
  });

  it("returns guest session from GET /api/session and allows requireSession middleware", async () => {
    const createReqObj = createReq({
      method: "POST",
      ip: "198.51.100.20",
      headers: {
        "x-forwarded-for": "198.51.100.20",
      },
      body: { displayName: "Guest Session User" },
      originalUrl: "/api/auth/guest",
    });
    const createResObj = createRes();

    await guestLegacyStartHandler(createReqObj, createResObj, () => undefined);
    const cookieValue = createResObj.body.guestId as string;

    const sessionReq = createReq({
      headers: {
        cookie: `peacepad_guest=${encodeURIComponent(cookieValue)}`,
      },
      originalUrl: "/api/session",
    });
    const sessionRes = createRes();
    await getSessionState(sessionReq, sessionRes, () => undefined);

    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.body.sessionType).toBe("guest");
    expect(sessionRes.body.guest.expiresAt).toBeTruthy();
    expect(sessionRes.body.guest.guestSessionId).toBeTruthy();

    const protectedReq = createReq({
      headers: {
        cookie: `peacepad_guest=${encodeURIComponent(cookieValue)}`,
      },
      originalUrl: "/api/protected",
    });
    const protectedRes = createRes();
    const nextCalled = await runMiddleware(requireSession, protectedReq, protectedRes);

    expect(nextCalled).toBe(true);
    expect(protectedReq.identityMode).toBe("guest");
    expect(protectedReq.guest.guestSessionId).toBe(sessionRes.body.guest.guestSessionId);
  });

  it("returns authenticated session type when authenticated user context exists", async () => {
    mockState.users.set("auth-user-1", {
      id: "auth-user-1",
      displayName: "Authenticated User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "auth-user-1" },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      originalUrl: "/api/session",
    });
    const res = createRes();

    await getSessionState(req, res, () => undefined);

    expect(res.statusCode).toBe(200);
    expect(res.body.sessionType).toBe("authenticated");
    expect(res.body.guest).toBeNull();
    expect(res.body.user.id).toBe("auth-user-1");
  });

  it("treats expired guest cookie as unauthenticated and requireSession returns 401", async () => {
    const createReqObj = createReq({
      method: "POST",
      ip: "198.51.100.30",
      headers: {
        "x-forwarded-for": "198.51.100.30",
      },
      body: { displayName: "Expiring Guest" },
      originalUrl: "/api/auth/guest",
    });
    const createResObj = createRes();
    await guestLegacyStartHandler(createReqObj, createResObj, () => undefined);

    const guestId = createResObj.body.guestId;
    const sessionId = createResObj.body.guestSessionId;
    const row = mockState.sessions.get(sessionId);
    row.expiresAt = new Date(Date.now() - 5 * 60 * 1000);

    const sessionReq = createReq({
      headers: {
        cookie: `peacepad_guest=${encodeURIComponent(guestId)}`,
      },
      originalUrl: "/api/session",
    });
    const sessionRes = createRes();
    await getSessionState(sessionReq, sessionRes, () => undefined);

    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.body.sessionType).toBe("none");

    const protectedReq = createReq({
      headers: {
        cookie: `peacepad_guest=${encodeURIComponent(guestId)}`,
      },
      originalUrl: "/api/protected",
    });
    const protectedRes = createRes();
    const nextCalled = await runMiddleware(requireSession, protectedReq, protectedRes);

    expect(nextCalled).toBe(false);
    expect(protectedRes.statusCode).toBe(401);
  });

  it("rate limits guest creation per IP", async () => {
    const ip = "198.51.100.99";

    for (let i = 0; i < 10; i += 1) {
      const req = createReq({
        method: "POST",
        ip,
        headers: {
          "x-forwarded-for": ip,
        },
        originalUrl: "/api/auth/guest",
      });
      const res = createRes();
      const nextCalled = await runMiddleware(guestCreationLimiter, req, res);
      expect(nextCalled).toBe(true);
    }

    const blockedReq = createReq({
      method: "POST",
      ip,
      headers: {
        "x-forwarded-for": ip,
      },
      originalUrl: "/api/auth/guest",
    });
    const blockedRes = createRes();
    const nextCalled = await runMiddleware(guestCreationLimiter, blockedReq, blockedRes);

    expect(nextCalled).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
  });
});
