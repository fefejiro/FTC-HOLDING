import { beforeAll, describe, expect, it, vi } from "vitest";

// Set required environment variables before any module imports to prevent
// the config validator from throwing at module load time.
process.env.SESSION_SECRET = "test-session-secret-for-admin-auth-tests";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// ---------------------------------------------------------------------------
// Minimal mock for storage – only the method the isAdmin middleware uses
// ---------------------------------------------------------------------------
const storageMock = {
  async getUser(userId: string) {
    if (userId === "admin-user-1") {
      return { id: userId, isAdmin: true };
    }
    if (userId === "regular-user-1") {
      return { id: userId, isAdmin: false };
    }
    return undefined;
  },
};

vi.mock("../../server/storage", () => ({ storage: storageMock }));
vi.mock("../../server/db", () => ({ pool: {}, db: {} }));
vi.mock("../../server/email", () => ({
  sendNewUserAdminNotification: vi.fn().mockResolvedValue(undefined),
}));
// Prevent passport / OpenID-client initialisation from failing in test env
vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  randomNonce: vi.fn(),
  randomState: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
}));
vi.mock("openid-client/passport", () => ({
  Strategy: class {},
}));
vi.mock("passport", () => ({
  default: { use: vi.fn(), serializeUser: vi.fn(), deserializeUser: vi.fn() },
}));
vi.mock("express-session", () => ({ default: vi.fn(() => vi.fn()) }));
vi.mock("connect-pg-simple", () => ({ default: vi.fn(() => class {}) }));
vi.mock("memoizee", () => ({ default: (fn: any) => fn }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createReq(overrides: Record<string, any> = {}) {
  return {
    isAuthenticated: overrides.isAuthenticated ?? (() => false),
    user: overrides.user,
    ...overrides,
  } as any;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
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

async function runMiddleware(
  middleware: any,
  req: any,
  res: any,
): Promise<boolean> {
  let nextCalled = false;
  await Promise.resolve(
    middleware(req, res, () => {
      nextCalled = true;
    }),
  );
  return nextCalled;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
let isAdmin: any;

beforeAll(async () => {
  const mod = await import("../../server/replitAuth");
  isAdmin = mod.isAdmin;
});

describe("isAdmin middleware — admin route authorization", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const req = createReq({ isAuthenticated: () => false });
    const res = createRes();

    const next = await runMiddleware(isAdmin, req, res);

    expect(next).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("rejects authenticated non-admin users with 403", async () => {
    const req = createReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "regular-user-1" },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const res = createRes();

    const next = await runMiddleware(isAdmin, req, res);

    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  it("allows authenticated admin users through", async () => {
    const req = createReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "admin-user-1" },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const res = createRes();

    const next = await runMiddleware(isAdmin, req, res);

    expect(next).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("rejects authenticated users with unknown userId with 403", async () => {
    const req = createReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "nonexistent-user" },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const res = createRes();

    const next = await runMiddleware(isAdmin, req, res);

    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

