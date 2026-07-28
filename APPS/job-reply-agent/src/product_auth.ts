import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type pg from "pg";

const SESSION_COOKIE = "jobagent_session";
const CSRF_COOKIE = "jobagent_csrf";
const SESSION_DAYS = 14;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface ProductUser {
  id: string;
  email: string;
  status: "onboarding" | "active" | "paused" | "deleted";
  role: "candidate" | "operator" | "admin";
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  authenticatedAt: string;
  csrfHash: string | null;
}

export interface ProductSession {
  token: string;
  csrfToken: string;
}

export function publicProductUser(user: ProductUser) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    mfaEnabled: user.mfaEnabled
  };
}

function encode(value: Buffer): string {
  return value.toString("base64url");
}

export function hashPassword(password: string): string {
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${encode(salt)}$${encode(derived)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, saltValue, expectedValue] = stored.split("$");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
  const expected = Buffer.from(expectedValue, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function createOpaqueToken(bytes = 32): string {
  return encode(crypto.randomBytes(bytes));
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookies(req: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .flatMap((item) => {
        const index = item.indexOf("=");
        if (index <= 0) return [];
        return [[
          decodeURIComponent(item.slice(0, index)),
          decodeURIComponent(item.slice(index + 1))
        ]];
      })
  );
}

export async function createSession(db: pg.Pool, userId: string): Promise<ProductSession> {
  const token = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query("DELETE FROM product_sessions WHERE expires_at <= now()");
  await db.query(
    `INSERT INTO product_sessions
       (user_id, token_hash, csrf_hash, expires_at, rotated_at)
     VALUES ($1, $2, $3, $4, now())`,
    [userId, hashOpaqueToken(token), hashOpaqueToken(csrfToken), expiresAt]
  );
  return { token, csrfToken };
}

function secureCookieSuffix(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function setSessionCookies(res: ServerResponse, session: ProductSession): void {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secureCookieSuffix()}`,
    `${CSRF_COOKIE}=${encodeURIComponent(session.csrfToken)}; Path=/; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secureCookieSuffix()}`
  ]);
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieSuffix()}`,
    `${CSRF_COOKIE}=; Path=/; SameSite=Strict; Max-Age=0${secureCookieSuffix()}`
  ]);
}

export async function authenticatedUser(req: IncomingMessage, db: pg.Pool): Promise<ProductUser | null> {
  const token = cookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashOpaqueToken(token);
  const result = await db.query<ProductUser>(
    `SELECT u.id, u.email, u.status, u.role,
            u.email_verified_at AS "emailVerifiedAt",
            u.mfa_enabled AS "mfaEnabled",
            s.created_at AS "authenticatedAt",
            s.csrf_hash AS "csrfHash"
       FROM product_sessions s
       JOIN product_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now() AND u.status <> 'deleted'
      LIMIT 1`,
    [tokenHash]
  );
  if (!result.rows[0]) return null;
  await db.query(
    "UPDATE product_sessions SET last_seen_at=now() WHERE token_hash=$1",
    [tokenHash]
  );
  return result.rows[0];
}

export function csrfTokenAllowed(req: IncomingMessage, user: ProductUser): boolean {
  const header = String(req.headers["x-csrf-token"] || "");
  const cookie = cookies(req)[CSRF_COOKIE] || "";
  if (!header || !cookie || !user.csrfHash || header !== cookie) return false;
  const actualHash = hashOpaqueToken(header);
  const actual = Buffer.from(actualHash);
  const expected = Buffer.from(user.csrfHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function hasRecentAuthentication(user: ProductUser, maximumAgeMinutes = 15): boolean {
  const authenticatedAt = new Date(user.authenticatedAt).getTime();
  return Number.isFinite(authenticatedAt)
    && Date.now() - authenticatedAt <= maximumAgeMinutes * 60_000;
}

export async function revokeCurrentSession(req: IncomingMessage, db: pg.Pool): Promise<void> {
  const token = cookies(req)[SESSION_COOKIE];
  if (!token) return;
  await db.query("DELETE FROM product_sessions WHERE token_hash=$1", [hashOpaqueToken(token)]);
}

export async function revokeAllSessions(db: pg.Pool, userId: string): Promise<void> {
  await db.query("DELETE FROM product_sessions WHERE user_id=$1", [userId]);
}

function base32Encode(input: Buffer): string {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    output += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid MFA secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function createTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpCode(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  ) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, at = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(totpCode(secret, at + window * 30_000));
    const actual = Buffer.from(code);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  });
}
