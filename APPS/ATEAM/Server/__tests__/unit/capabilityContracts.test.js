import {
  CAPABILITY_CONTRACT_HEADER,
  CAPABILITY_REQUEST_ID_HEADER,
  readCapabilityEnvelope,
  capabilityOk,
  capabilityError
} from "../../lib/capability/contracts.js";

function createMockRes() {
  const headers = {};
  const response = {
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return { response, headers };
}

describe("capability contracts", () => {
  test("reads envelope from headers/body and falls back to principal scope", () => {
    const req = {
      headers: {
        [CAPABILITY_CONTRACT_HEADER]: "v1alpha1-test",
        [CAPABILITY_REQUEST_ID_HEADER]: "req_12345"
      },
      principal: {
        tenantId: "tenant_a",
        workspaceId: "workspace_a",
        userId: "user_a",
        role: "member"
      },
      body: {
        data: {
          mode: "learning"
        }
      }
    };
    const envelope = readCapabilityEnvelope(req);
    expect(envelope.requestId).toBe("req_12345");
    expect(envelope.contractVersion).toBe("v1alpha1-test");
    expect(envelope.data.mode).toBe("learning");
    expect(envelope.scope).toEqual({
      tenant_id: "tenant_a",
      workspace_id: "workspace_a",
      user_id: "user_a",
      role: "member"
    });
  });

  test("capabilityOk emits normalized payload and headers", () => {
    const { response, headers } = createMockRes();
    const envelope = {
      requestId: "req_ok",
      contractVersion: "v1alpha1",
      scope: { tenant_id: "t1", workspace_id: "w1", user_id: "u1", role: "member" }
    };
    capabilityOk(response, envelope, { value: 42 }, 201);
    expect(response.statusCode).toBe(201);
    expect(headers["x-request-id"]).toBe("req_ok");
    expect(headers["x-ateam-contract-version"]).toBe("v1alpha1");
    expect(response.body).toMatchObject({
      ok: true,
      requestId: "req_ok",
      contractVersion: "v1alpha1",
      value: 42
    });
  });

  test("capabilityError emits standard error shape", () => {
    const { response, headers } = createMockRes();
    const envelope = {
      requestId: "req_err",
      contractVersion: "v1alpha1"
    };
    capabilityError(response, envelope, {
      status: 403,
      error: "SCOPE_FORBIDDEN",
      details: "cross_workspace",
      code: "SCOPE_FORBIDDEN"
    });
    expect(response.statusCode).toBe(403);
    expect(headers["x-request-id"]).toBe("req_err");
    expect(response.body).toEqual({
      ok: false,
      requestId: "req_err",
      contractVersion: "v1alpha1",
      error: "SCOPE_FORBIDDEN",
      details: "cross_workspace",
      code: "SCOPE_FORBIDDEN"
    });
  });
});
