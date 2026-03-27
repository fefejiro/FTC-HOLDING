import { createPrincipalScopeMiddleware } from "../../lib/auth/principalScope.js";
import { jest } from "@jest/globals";

function createMockReq({ headers = {} } = {}) {
  return { headers };
}

function createMockRes() {
  const out = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return out;
}

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

describe("principalScope middleware", () => {
  test("local mode sets synthetic principal", () => {
    const mw = createPrincipalScopeMiddleware({ mode: "local" });
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.principal).toMatchObject({
      mode: "local",
      authenticated: false
    });
  });

  test("header mode requires x-ateam-* headers", () => {
    const mw = createPrincipalScopeMiddleware({ mode: "header" });
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body?.error).toBe("AUTH_REQUIRED");
  });

  test("jwt mode resolves principal from provider-agnostic claims", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createJwt({
      tenant_id: "tenant_p",
      workspace_id: "workspace_p",
      user_id: "user_p",
      role: "owner",
      exp: futureExp
    });
    const mw = createPrincipalScopeMiddleware({ mode: "jwt" });
    const req = createMockReq({
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.principal).toMatchObject({
      mode: "jwt",
      tenantId: "tenant_p",
      workspaceId: "workspace_p",
      userId: "user_p",
      role: "owner",
      authenticated: true
    });
  });

  test("jwt mode rejects expired token", () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 10;
    const token = createJwt({
      tenant_id: "tenant_p",
      workspace_id: "workspace_p",
      user_id: "user_p",
      role: "owner",
      exp: expiredExp
    });
    const mw = createPrincipalScopeMiddleware({ mode: "jwt" });
    const req = createMockReq({
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body?.error).toBe("AUTH_REQUIRED");
  });

  test("trusted_proxy mode resolves operator scope from server-side injected headers", () => {
    process.env.ATEAM_TRUSTED_PROXY_KEY = "proxy_secret_123";
    const mw = createPrincipalScopeMiddleware({ mode: "trusted_proxy" });
    const req = createMockReq({
      headers: {
        "x-ateam-proxy-key": "proxy_secret_123",
        "x-ateam-tenant-id": "owner_tenant",
        "x-ateam-workspace-id": "owner_workspace",
        "x-ateam-user-id": "mike_owner",
        "x-ateam-role": "owner",
        "x-ateam-operator-email": "mike.fejiro@gmail.com"
      }
    });
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.principal).toMatchObject({
      mode: "trusted_proxy",
      authenticated: true,
      tenantId: "owner_tenant",
      workspaceId: "owner_workspace",
      userId: "mike_owner",
      role: "owner",
      email: "mike.fejiro@gmail.com"
    });
    delete process.env.ATEAM_TRUSTED_PROXY_KEY;
  });

  test("trusted_proxy mode rejects invalid proxy keys", () => {
    process.env.ATEAM_TRUSTED_PROXY_KEY = "proxy_secret_123";
    const mw = createPrincipalScopeMiddleware({ mode: "trusted_proxy" });
    const req = createMockReq({
      headers: {
        "x-ateam-proxy-key": "bad_key",
        "x-ateam-tenant-id": "owner_tenant",
        "x-ateam-workspace-id": "owner_workspace",
        "x-ateam-user-id": "mike_owner"
      }
    });
    const res = createMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body?.error).toBe("AUTH_REQUIRED");
    delete process.env.ATEAM_TRUSTED_PROXY_KEY;
  });
});
