import crypto from "crypto";
import type { Request } from "express";

const DEFAULT_ADMIN_USERNAME = "mike.fejiro@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Efiuvwere@1234!";

function resolveAdminUsername(): string {
  return (process.env.SAYWETIN_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim().toLowerCase();
}

function resolveAdminPassword(): string {
  const configured = (process.env.SAYWETIN_ADMIN_PASSWORD || "").trim();
  return configured || DEFAULT_ADMIN_PASSWORD;
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function authenticateAdminCredentials(usernameRaw: string, passwordRaw: string): { ok: boolean; username?: string } {
  const normalizedUsername = (usernameRaw || "").trim().toLowerCase();
  const suppliedPassword = passwordRaw || "";
  const expectedUsername = resolveAdminUsername();
  const expectedPassword = resolveAdminPassword();

  if (!normalizedUsername || !suppliedPassword) {
    return { ok: false };
  }

  const validUser = timingSafeEqualText(normalizedUsername, expectedUsername);
  const validPassword = timingSafeEqualText(suppliedPassword, expectedPassword);

  if (!validUser || !validPassword) {
    return { ok: false };
  }

  return { ok: true, username: expectedUsername };
}

type AdminSessionPayload = {
  authenticated?: boolean;
  username?: string;
  loggedInAt?: string;
};

function getAdminSession(req: Request): AdminSessionPayload {
  const session = (req as any).session;
  if (!session || typeof session !== "object") {
    return {};
  }

  return (session.saywetinAdmin as AdminSessionPayload) || {};
}

export function isAdminAuthenticated(req: Request): boolean {
  const state = getAdminSession(req);
  return state.authenticated === true;
}

export function setAdminAuthenticated(req: Request, username: string): void {
  const session = (req as any).session;
  if (!session || typeof session !== "object") {
    return;
  }

  session.saywetinAdmin = {
    authenticated: true,
    username,
    loggedInAt: new Date().toISOString(),
  };
}

export function clearAdminAuthenticated(req: Request): void {
  const session = (req as any).session;
  if (!session || typeof session !== "object") {
    return;
  }

  delete session.saywetinAdmin;
}

export function getAdminSessionSummary(req: Request): { authenticated: boolean; username?: string; loggedInAt?: string } {
  const state = getAdminSession(req);
  if (!state.authenticated) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    username: state.username,
    loggedInAt: state.loggedInAt,
  };
}
