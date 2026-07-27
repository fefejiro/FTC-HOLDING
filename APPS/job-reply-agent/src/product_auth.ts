import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type pg from "pg";

const SESSION_COOKIE = "jobagent_session";
const SESSION_DAYS = 14;

export interface ProductUser {
  id: string;
  email: string;
  status: "onboarding" | "active" | "paused" | "deleted";
  authenticatedAt: string;
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

function sessionHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookies(req: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

export async function createSession(db: pg.Pool, userId: string): Promise<string> {
  const token = encode(crypto.randomBytes(32));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    "INSERT INTO product_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, sessionHash(token), expiresAt]
  );
  return token;
}

export function setSessionCookie(res: ServerResponse, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`
  );
}

export function clearSessionCookie(res: ServerResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function authenticatedUser(req: IncomingMessage, db: pg.Pool): Promise<ProductUser | null> {
  const token = cookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const result = await db.query<ProductUser>(
    `SELECT u.id, u.email, u.status, s.created_at AS "authenticatedAt"
       FROM product_sessions s
       JOIN product_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now() AND u.status <> 'deleted'
      LIMIT 1`,
    [sessionHash(token)]
  );
  if (!result.rows[0]) return null;
  await db.query(
    "UPDATE product_sessions SET last_seen_at=now() WHERE token_hash=$1",
    [sessionHash(token)]
  );
  return result.rows[0];
}

export function hasRecentAuthentication(user: ProductUser, maximumAgeMinutes = 15): boolean {
  const authenticatedAt = new Date(user.authenticatedAt).getTime();
  return Number.isFinite(authenticatedAt)
    && Date.now() - authenticatedAt <= maximumAgeMinutes * 60_000;
}

export async function revokeCurrentSession(req: IncomingMessage, db: pg.Pool): Promise<void> {
  const token = cookies(req)[SESSION_COOKIE];
  if (!token) return;
  await db.query("DELETE FROM product_sessions WHERE token_hash=$1", [sessionHash(token)]);
}
