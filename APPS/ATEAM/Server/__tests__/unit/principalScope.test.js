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
});
