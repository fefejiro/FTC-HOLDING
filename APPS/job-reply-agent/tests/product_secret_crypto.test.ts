import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptProductSecret,
  encryptProductSecret,
  productSecretKeyring,
  type SecretKeyring
} from "../src/product_secret_crypto.js";

function keyring(): SecretKeyring {
  return {
    activeVersion: "v2",
    keys: new Map([
      ["v1", crypto.randomBytes(32)],
      ["v2", crypto.randomBytes(32)]
    ])
  };
}

afterEach(() => {
  delete process.env.OAUTH_TOKEN_ACTIVE_KEY_VERSION;
  delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  delete process.env.OAUTH_TOKEN_ENCRYPTION_KEYS;
});

describe("product OAuth secret encryption", () => {
  it("encrypts with AES-GCM and decrypts by key version", () => {
    const keys = keyring();
    const value = { refresh_token: "private-refresh-token", expiry_date: 1234 };
    const encrypted = encryptProductSecret(value, "connection:user-a:gmail", keys);
    expect(encrypted.keyVersion).toBe("v2");
    expect(encrypted.encryptedPayload).not.toContain("private-refresh-token");
    expect(decryptProductSecret(
      encrypted.encryptedPayload,
      encrypted.keyVersion,
      "connection:user-a:gmail",
      keys
    )).toEqual(value);
  });

  it("rejects ciphertext copied to another user or provider", () => {
    const keys = keyring();
    const encrypted = encryptProductSecret({ token: "secret" }, "connection:user-a:gmail", keys);
    expect(() => decryptProductSecret(
      encrypted.encryptedPayload,
      encrypted.keyVersion,
      "connection:user-b:gmail",
      keys
    )).toThrow();
  });

  it("loads a rotatable environment key ring and validates key length", () => {
    process.env.OAUTH_TOKEN_ACTIVE_KEY_VERSION = "v2";
    process.env.OAUTH_TOKEN_ENCRYPTION_KEYS = JSON.stringify({
      v1: crypto.randomBytes(32).toString("base64"),
      v2: crypto.randomBytes(32).toString("base64")
    });
    expect(productSecretKeyring().keys.size).toBe(2);
    process.env.OAUTH_TOKEN_ENCRYPTION_KEYS = JSON.stringify({ v2: "too-short" });
    expect(() => productSecretKeyring()).toThrow(/32 bytes/);
  });
});
