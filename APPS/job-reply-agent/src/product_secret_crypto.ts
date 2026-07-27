import crypto from "node:crypto";

export interface SecretKeyring {
  activeVersion: string;
  keys: Map<string, Buffer>;
}

export interface EncryptedSecret {
  encryptedPayload: string;
  keyVersion: string;
}

function decodeKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("OAuth encryption keys must decode to exactly 32 bytes.");
  return key;
}

export function productSecretKeyring(): SecretKeyring {
  const activeVersion = String(process.env.OAUTH_TOKEN_ACTIVE_KEY_VERSION || "v1").trim();
  const encodedKeyring = String(process.env.OAUTH_TOKEN_ENCRYPTION_KEYS || "").trim();
  const keys = new Map<string, Buffer>();
  if (encodedKeyring) {
    const parsed = JSON.parse(encodedKeyring) as Record<string, string>;
    for (const [version, value] of Object.entries(parsed)) keys.set(version, decodeKey(value));
  } else {
    const singleKey = String(process.env.OAUTH_TOKEN_ENCRYPTION_KEY || "").trim();
    if (singleKey) keys.set(activeVersion, decodeKey(singleKey));
  }
  if (!activeVersion || !keys.has(activeVersion)) {
    throw new Error("The active OAuth token encryption key is not configured.");
  }
  return { activeVersion, keys };
}

export function encryptProductSecret(
  value: unknown,
  additionalAuthenticatedData: string,
  keyring = productSecretKeyring()
): EncryptedSecret {
  const key = keyring.keys.get(keyring.activeVersion);
  if (!key) throw new Error("Active OAuth encryption key is unavailable.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(additionalAuthenticatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedPayload: Buffer.concat([iv, tag, ciphertext]).toString("base64url"),
    keyVersion: keyring.activeVersion
  };
}

export function decryptProductSecret<T>(
  encryptedPayload: string,
  keyVersion: string,
  additionalAuthenticatedData: string,
  keyring = productSecretKeyring()
): T {
  const key = keyring.keys.get(keyVersion);
  if (!key) throw new Error(`OAuth encryption key version ${keyVersion} is unavailable.`);
  const packed = Buffer.from(encryptedPayload, "base64url");
  if (packed.length < 29) throw new Error("Encrypted OAuth payload is malformed.");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(additionalAuthenticatedData, "utf8"));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
