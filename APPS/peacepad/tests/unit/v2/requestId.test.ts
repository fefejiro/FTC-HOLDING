import { describe, expect, it } from "vitest";
import {
  readRequestId,
  resolveRequestId,
  V2_REQUEST_ID_LOCALS_KEY,
} from "../../../server/v2/services/requestId";

describe("v2 request id helpers", () => {
  it("keeps a valid incoming request id", () => {
    const requestId = resolveRequestId("req-12345");
    expect(requestId).toBe("req-12345");
  });

  it("generates a fallback request id for invalid values", () => {
    const requestId = resolveRequestId("bad id with spaces");
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("reads request id from response locals", () => {
    const locals = {
      [V2_REQUEST_ID_LOCALS_KEY]: "req-from-locals",
    };

    expect(readRequestId(locals)).toBe("req-from-locals");
    expect(readRequestId(undefined)).toBeUndefined();
    expect(readRequestId({})).toBeUndefined();
  });
});
