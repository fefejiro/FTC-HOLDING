import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pbkdf2Sync } from "node:crypto";

const reviewerState = vi.hoisted(() => ({
  users: new Map<string, any>(),
  sessionsById: new Map<string, any>(),
  sessionIdByGuestId: new Map<string, string>(),
  createSessionCalls: 0,
}));

vi.mock("../../server/storage", () => ({
  storage: {
    async getUser(userId: string) {
      return reviewerState.users.get(userId);
    },
    async createGuestSession(input: any) {
      reviewerState.createSessionCalls += 1;
      const session = {
        id: `row-${reviewerState.createSessionCalls}`,
        ...input,
        createdAt: new Date(),
        upgradedToUserId: null,
      };
      reviewerState.sessionsById.set(session.sessionId, session);
      reviewerState.sessionIdByGuestId.set(session.guestId, session.sessionId);
      return session;
    },
    async getGuestSession(sessionId: string) {
      return reviewerState.sessionsById.get(sessionId);
    },
    async getGuestSessionByGuestId(guestId: string) {
      const sessionId = reviewerState.sessionIdByGuestId.get(guestId);
      return sessionId ? reviewerState.sessionsById.get(sessionId) : undefined;
    },
    async updateGuestSessionActivity() {
      return undefined;
    },
  },
}));

vi.mock("../../server/db", () => ({
  pool: {},
}));

type RegisteredRoute = {
  path: string;
  handlers: Array<(req: any, res: any, next?: () => void) => unknown>;
};

class FakeExpressApp {
  private readonly settings = new Map<string, unknown>();
  readonly postRoutes: RegisteredRoute[] = [];

  set(name: string, value: unknown) {
    this.settings.set(name, value);
    return this;
  }

  use() {
    return this;
  }

  get(name: string, ...handlers: RegisteredRoute["handlers"]): unknown {
    if (handlers.length === 0 && !name.startsWith("/")) {
      return this.settings.get(name);
    }
    return this;
  }

  post(path: string, ...handlers: RegisteredRoute["handlers"]) {
    this.postRoutes.push({ path, handlers });
    return this;
  }
}

function makeHash(password: string): string {
  const iterations = 210_000;
  const saltHex = "0123456789abcdef0123456789abcdef";
  const digest = pbkdf2Sync(password, Buffer.from(saltHex, "hex"), iterations, 32, "sha256");
  return `pbkdf2-sha256$${iterations}$${saltHex}$${digest.toString("hex")}`;
}

function makeRequest(body: Record<string, unknown>, cookie?: string) {
  return {
    body,
    headers: {
      host: "peacepad.ca",
      ...(cookie ? { cookie } : {}),
    },
    session: {},
    secure: true,
    ip: "192.0.2.10",
    socket: { remoteAddress: "192.0.2.10" },
    isAuthenticated: () => false,
  } as any;
}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
    cookies: [] as Array<{ name: string; value: string; options: any }>,
    headers: new Map<string, string>(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
    cookie(name: string, value: string, options: any) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie() {
      return this;
    },
    set(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },
  };
}

const originalReviewerEnv = {
  enabled: process.env.PEACEPAD_REVIEWER_LOGIN_ENABLED,
  email: process.env.PEACEPAD_REVIEWER_EMAIL,
  passwordHash: process.env.PEACEPAD_REVIEWER_PASSWORD_HASH,
  userId: process.env.PEACEPAD_REVIEWER_USER_ID,
};

let reviewerHandler: (req: any, res: any) => Promise<unknown>;
let reviewerLimiter: (req: any, res: any, next: () => void) => unknown;
let resolveGuestIdentity: (req: any) => Promise<any>;

beforeAll(async () => {
  process.env.PEACEPAD_REVIEWER_LOGIN_ENABLED = "true";
  process.env.PEACEPAD_REVIEWER_EMAIL = "apple.review@example.com";
  process.env.PEACEPAD_REVIEWER_PASSWORD_HASH = makeHash("synthetic-review-password");
  process.env.PEACEPAD_REVIEWER_USER_ID = "apple-review-user";

  const softAuth = await import("../../server/softAuth");
  const app = new FakeExpressApp();
  await softAuth.setupSoftAuth(app as any, { includeSessionMiddleware: false });
  const route = app.postRoutes.find((candidate) => candidate.path === "/api/auth/reviewer-session");
  if (!route) {
    throw new Error("Reviewer route was not registered");
  }

  reviewerHandler = route.handlers.at(-1) as typeof reviewerHandler;
  reviewerLimiter = route.handlers[0] as typeof reviewerLimiter;
  resolveGuestIdentity = softAuth.resolveGuestIdentity;
});

afterAll(() => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  };
  restore("PEACEPAD_REVIEWER_LOGIN_ENABLED", originalReviewerEnv.enabled);
  restore("PEACEPAD_REVIEWER_EMAIL", originalReviewerEnv.email);
  restore("PEACEPAD_REVIEWER_PASSWORD_HASH", originalReviewerEnv.passwordHash);
  restore("PEACEPAD_REVIEWER_USER_ID", originalReviewerEnv.userId);
});

beforeEach(() => {
  reviewerState.users.clear();
  reviewerState.sessionsById.clear();
  reviewerState.sessionIdByGuestId.clear();
  reviewerState.createSessionCalls = 0;
});

function seedSyntheticReviewer(overrides: Record<string, unknown> = {}) {
  reviewerState.users.set("apple-review-user", {
    id: "apple-review-user",
    email: "apple.review@example.com",
    displayName: "Apple App Review",
    isGuest: false,
    isAdmin: false,
    isDeactivated: false,
    deletedAt: null,
    ...overrides,
  });
}

describe("reviewer session lifecycle", () => {
  it("creates a session only for the pre-seeded safe reviewer identity", async () => {
    seedSyntheticReviewer();
    const req = makeRequest({
      email: "APPLE.REVIEW@example.com",
      password: "synthetic-review-password",
    });
    const res = makeResponse();

    await reviewerHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.id).toBe("apple-review-user");
    expect(reviewerState.createSessionCalls).toBe(1);
    expect(res.cookies).toHaveLength(1);
    expect(req.user.id).toBe("apple-review-user");
    expect(req.session.userId).toBe("apple-review-user");
  });

  it.each([
    ["missing", undefined],
    ["guest", { isGuest: true }],
    ["admin", { isAdmin: true }],
    ["deactivated", { isDeactivated: true, deletedAt: new Date() }],
    ["deleted tombstone", { deletedAt: new Date() }],
    ["wrong seeded email", { email: "different@example.com" }],
  ])("rejects a %s reviewer record without creating a session", async (_label, override) => {
    if (override) {
      seedSyntheticReviewer(override);
    }
    const req = makeRequest({
      email: "apple.review@example.com",
      password: "synthetic-review-password",
    });
    const res = makeResponse();

    await reviewerHandler(req, res);

    expect(res.statusCode).toBe(503);
    expect(reviewerState.createSessionCalls).toBe(0);
  });

  it("does not recreate a reviewer deleted after a previous valid session", async () => {
    seedSyntheticReviewer();
    const loginReq = makeRequest({
      email: "apple.review@example.com",
      password: "synthetic-review-password",
    });
    const loginRes = makeResponse();
    await reviewerHandler(loginReq, loginRes);

    const guestCookie = loginRes.cookies[0];
    expect(guestCookie).toBeTruthy();
    reviewerState.users.delete("apple-review-user");

    const staleIdentity = await resolveGuestIdentity(
      makeRequest({}, `${guestCookie.name}=${guestCookie.value}`),
    );
    expect(staleIdentity).toBeNull();

    const retryRes = makeResponse();
    await reviewerHandler(
      makeRequest({
        email: "apple.review@example.com",
        password: "synthetic-review-password",
      }),
      retryRes,
    );

    expect(retryRes.statusCode).toBe(503);
    expect(reviewerState.createSessionCalls).toBe(1);
    expect(reviewerState.users.has("apple-review-user")).toBe(false);
  });

  it("rate-limits repeated invalid sign-in attempts before session creation", async () => {
    seedSyntheticReviewer();

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const req = makeRequest({
        email: "apple.review@example.com",
        password: "wrong-password",
      });
      // Keep this test isolated from all other limiter keys.
      req.ip = "192.0.2.77";
      req.socket.remoteAddress = "192.0.2.77";
      const res = makeResponse();
      let allowed = false;

      reviewerLimiter(req, res, () => {
        allowed = true;
      });

      if (attempt <= 5) {
        expect(allowed).toBe(true);
        await reviewerHandler(req, res);
        expect(res.statusCode).toBe(401);
      } else {
        expect(allowed).toBe(false);
        expect(res.statusCode).toBe(429);
        expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
      }
    }

    expect(reviewerState.createSessionCalls).toBe(0);
  });

  it("does not let email rotation or forwarded-for spoofing evade the IP budget", () => {
    seedSyntheticReviewer();

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const req = makeRequest({
        email: `rotated-${attempt}@example.com`,
        password: "wrong-password",
      });
      req.ip = "192.0.2.88";
      req.socket.remoteAddress = "192.0.2.88";
      req.headers["x-forwarded-for"] = `198.51.100.${attempt}`;
      const res = makeResponse();
      let allowed = false;

      reviewerLimiter(req, res, () => {
        allowed = true;
      });

      expect(allowed).toBe(attempt <= 5);
      if (attempt === 6) {
        expect(res.statusCode).toBe(429);
      }
    }

    expect(reviewerState.createSessionCalls).toBe(0);
  });
});
