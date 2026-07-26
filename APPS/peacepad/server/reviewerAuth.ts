import { pbkdf2, timingSafeEqual } from "crypto";
import type { RequestHandler } from "express";
import { createRateLimiter } from "./rateLimiter";

const REVIEWER_HASH_ALGORITHM = "sha256";
const REVIEWER_HASH_PREFIX = "pbkdf2-sha256";
const MIN_REVIEWER_ITERATIONS = 210_000;
const REVIEWER_KEY_BYTES = 32;

export type ReviewerAuthConfig = {
  email: string;
  passwordHash: string;
  userId: string;
};

function readEnvValue(
  name: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const value = env[name];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

export function normalizeReviewerEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getReviewerAuthConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ReviewerAuthConfig | null {
  if (!isEnabled(readEnvValue("PEACEPAD_REVIEWER_LOGIN_ENABLED", env))) {
    return null;
  }

  const email = readEnvValue("PEACEPAD_REVIEWER_EMAIL", env);
  const passwordHash = readEnvValue("PEACEPAD_REVIEWER_PASSWORD_HASH", env);
  const userId = readEnvValue("PEACEPAD_REVIEWER_USER_ID", env);

  if (!email || !passwordHash || !userId) {
    throw new Error(
      "Reviewer login is enabled but PEACEPAD_REVIEWER_EMAIL, " +
        "PEACEPAD_REVIEWER_PASSWORD_HASH, or PEACEPAD_REVIEWER_USER_ID is missing.",
    );
  }

  return {
    email: normalizeReviewerEmail(email),
    passwordHash,
    userId,
  };
}

function parsePasswordHash(encodedHash: string): {
  iterations: number;
  salt: Buffer;
  expected: Buffer;
} | null {
  const [prefix, iterationsText, saltHex, expectedHex, ...extra] = encodedHash.split("$");
  const iterations = Number.parseInt(iterationsText || "", 10);

  if (
    prefix !== REVIEWER_HASH_PREFIX ||
    extra.length > 0 ||
    !Number.isSafeInteger(iterations) ||
    iterations < MIN_REVIEWER_ITERATIONS ||
    !/^[a-f0-9]{32,}$/i.test(saltHex || "") ||
    !/^[a-f0-9]{64}$/i.test(expectedHex || "")
  ) {
    return null;
  }

  return {
    iterations,
    salt: Buffer.from(saltHex, "hex"),
    expected: Buffer.from(expectedHex, "hex"),
  };
}

export async function verifyReviewerPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed || typeof password !== "string" || password.length > 512) {
    return false;
  }

  const actual = await new Promise<Buffer>((resolve, reject) => {
    pbkdf2(
      password,
      parsed.salt,
      parsed.iterations,
      REVIEWER_KEY_BYTES,
      REVIEWER_HASH_ALGORITHM,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
  return actual.length === parsed.expected.length && timingSafeEqual(actual, parsed.expected);
}

export async function reviewerCredentialsMatch(
  config: ReviewerAuthConfig,
  email: string,
  password: string,
): Promise<boolean> {
  const normalizedEmail = normalizeReviewerEmail(email);
  const suppliedEmail = Buffer.from(normalizedEmail.padEnd(config.email.length, "\0"));
  const expectedEmail = Buffer.from(config.email.padEnd(normalizedEmail.length, "\0"));
  const emailMatches =
    suppliedEmail.length === expectedEmail.length && timingSafeEqual(suppliedEmail, expectedEmail);

  // Always perform the intentionally expensive password check, even when the
  // email is wrong, so the endpoint does not expose the configured address by timing.
  const passwordMatches = await verifyReviewerPassword(password, config.passwordHash);
  return emailMatches && passwordMatches;
}

function getClientIp(req: any): string {
  // Express resolves req.ip through the configured trust-proxy boundary. Do
  // not parse the left-most X-Forwarded-For value directly; clients can spoof it.
  return req?.ip || req?.socket?.remoteAddress || "unknown";
}

export const reviewerLoginRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many sign-in attempts. Please wait before trying again.",
  // IP-only prevents an attacker from resetting the expensive password-check
  // budget by varying the submitted email address.
  keyGenerator: (req: any) => getClientIp(req),
});
