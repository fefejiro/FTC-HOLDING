import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  transactionalEmailConfigured
} from "../src/product_email.js";

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  APP_ORIGIN: process.env.APP_ORIGIN,
  JOBAGENT_EMAIL_GATEWAY_URL: process.env.JOBAGENT_EMAIL_GATEWAY_URL,
  JOBAGENT_BILLING_SHARED_SECRET: process.env.JOBAGENT_BILLING_SHARED_SECRET
};

function restore(name: keyof typeof originalEnvironment): void {
  const value = originalEnvironment[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("NODE_ENV");
  restore("RESEND_API_KEY");
  restore("APP_ORIGIN");
  restore("JOBAGENT_EMAIL_GATEWAY_URL");
  restore("JOBAGENT_BILLING_SHARED_SECRET");
  vi.unstubAllGlobals();
});

describe("product transactional email", () => {
  it("reports missing production delivery configuration", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.APP_ORIGIN = "https://jobagent.unalabs.cloud";

    expect(transactionalEmailConfigured()).toBe(false);
  });

  it("turns configuration failures into rejected promises", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.APP_ORIGIN = "https://jobagent.unalabs.cloud";

    const delivery = sendPasswordResetEmail("candidate@example.com", "reset-token");

    expect(delivery).toBeInstanceOf(Promise);
    await expect(delivery).rejects.toThrow(
      "Transactional email and HTTPS application origin must be configured."
    );
  });

  it("uses the existing authenticated Mailjet gateway when Resend is not configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.APP_ORIGIN = "https://jobagent.unalabs.cloud";
    process.env.JOBAGENT_EMAIL_GATEWAY_URL = "https://una-stripe-api.example";
    process.env.JOBAGENT_BILLING_SHARED_SECRET = "shared-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: "mailjet-message-1" }),
      { status: 202, headers: { "content-type": "application/json" } }
    ));
    vi.stubGlobal("fetch", fetchMock);

    expect(transactionalEmailConfigured()).toBe(true);
    await expect(sendVerificationEmail("candidate@example.com", "verify-token"))
      .resolves.toBe("mailjet-message-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://una-stripe-api.example/api/jobagent/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer shared-secret" })
      })
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.to).toBe("candidate@example.com");
    expect(requestBody.text).toContain("https://jobagent.unalabs.cloud/verify-email?token=verify-token");
  });
});
