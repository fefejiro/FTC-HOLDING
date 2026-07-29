import { afterEach, describe, expect, it } from "vitest";
import {
  sendPasswordResetEmail,
  transactionalEmailConfigured
} from "../src/product_email.js";

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  APP_ORIGIN: process.env.APP_ORIGIN
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
});
