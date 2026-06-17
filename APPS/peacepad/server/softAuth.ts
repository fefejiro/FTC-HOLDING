import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { pool } from "./db";
import { createRateLimiter } from "./rateLimiter";

export const GUEST_COOKIE_NAME = "peacepad_guest";
const GUEST_TRIAL_MS = 14 * 24 * 60 * 60 * 1000;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const isDevLogging = process.env.NODE_ENV !== "production";

function getClientIp(req: any): string {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req?.ip || req?.socket?.remoteAddress || "unknown";
}

const guestCreationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many guest session requests. Please try again shortly.",
  keyGenerator: (req) => getClientIp(req),
});

type GuestIdentity = {
  session: any;
  user: any;
  trial: {
    expiresAt: string;
    daysRemaining: number;
    isExpired: boolean;
  };
};

function parseCookieValue(req: any, cookieName: string): string | undefined {
  const rawCookieHeader = req?.headers?.cookie;
  if (!rawCookieHeader || typeof rawCookieHeader !== "string") {
    return undefined;
  }

  const pairs = rawCookieHeader.split(";");
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return undefined;
}

function isSecureRequest(req: any): boolean {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return Boolean(req?.secure) || forwardedProto === "https";
}

function isCrossSiteRequest(req: any): boolean {
  const origin = req?.headers?.origin;
  const host = req?.headers?.host;
  if (!origin || !host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestProtocol = isSecureRequest(req) ? "https" : "http";
    const requestUrl = new URL(`${requestProtocol}://${host}`);
    return originUrl.origin !== requestUrl.origin;
  } catch {
    return false;
  }
}

export function getGuestCookieOptions(req: any, maxAgeMs?: number) {
  const secure = isSecureRequest(req);
  const crossSite = isCrossSiteRequest(req);
  // SameSite policy:
  // - "lax" for same-origin web usage (best CSRF baseline while keeping normal nav flows)
  // - "none" only for secure cross-site contexts (e.g. native webview + API on different origin)
  const sameSite: "none" | "lax" = crossSite && secure ? "none" : "lax";

  const options: any = {
    httpOnly: true,
    secure: sameSite === "none" ? true : secure,
    sameSite,
    path: "/",
  };

  if (typeof maxAgeMs === "number" && Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
    options.maxAge = maxAgeMs;
  }

  return options;
}

export function setGuestCookie(req: any, res: any, guestId: string, expiresAt: Date) {
  const maxAge = Math.max(1, expiresAt.getTime() - Date.now());
  const cookieOptions = getGuestCookieOptions(req, maxAge);
  res.cookie(GUEST_COOKIE_NAME, guestId, cookieOptions);

  if (isDevLogging) {
    console.log("[Guest Cookie] set", {
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
      maxAgeMs: cookieOptions.maxAge,
      origin: req?.headers?.origin || null,
      host: req?.headers?.host || null,
    });
  }
}

export function clearGuestCookie(req: any, res: any) {
  const cookieOptions = getGuestCookieOptions(req);
  res.clearCookie(GUEST_COOKIE_NAME, cookieOptions);
}

function attachGuestIdentityToRequest(req: any, identity: GuestIdentity) {
  if (!req.session || typeof req.session !== "object") {
    req.session = {};
  }

  req.user = {
    id: identity.session.userId,
    sessionId: identity.session.sessionId,
    guestId: identity.session.guestId,
    isGuest: true,
  };
  req.guest = {
    guestId: identity.session.guestId,
    guestSessionId: identity.session.sessionId,
    userId: identity.session.userId,
    createdAt: identity.session.createdAt,
    expiresAt: identity.session.expiresAt,
  };
  req.guestSession = identity.session;
  req.trial = identity.trial;
  req.session.userId = identity.session.userId;
  req.session.sessionId = identity.session.sessionId;
  req.session.guestId = identity.session.guestId;
}

export async function resolveGuestIdentity(
  req: any,
  options: { allowExpired?: boolean } = {},
): Promise<GuestIdentity | null> {
  const allowExpired = options.allowExpired ?? false;
  const guestCookieId = parseCookieValue(req, GUEST_COOKIE_NAME);
  let sessionRecord: any | undefined;

  if (guestCookieId) {
    sessionRecord = await storage.getGuestSessionByGuestId(guestCookieId);
  }

  if (!sessionRecord && req?.session?.sessionId) {
    sessionRecord = await storage.getGuestSession(req.session.sessionId);
  }

  if (!sessionRecord) {
    return null;
  }

  if (sessionRecord.upgradedToUserId) {
    return null;
  }

  const expiresAtDate = new Date(sessionRecord.expiresAt);
  const isExpired = expiresAtDate.getTime() <= Date.now();
  if (isExpired && !allowExpired) {
    return null;
  }

  const user = await storage.getUser(sessionRecord.userId);
  if (!user) {
    return null;
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return {
    session: sessionRecord,
    user,
    trial: {
      expiresAt: expiresAtDate.toISOString(),
      daysRemaining,
      isExpired,
    },
  };
}

async function createGuestSession(req: any, payload: any) {
  const displayName =
    typeof payload?.displayName === "string" ? payload.displayName.trim().slice(0, 80) : "";
  const profileImageUrl = payload?.profileImageUrl;
  const hasAcceptedConsent = Boolean(payload?.hasAcceptedConsent);

  const shortGuestId = nanoid(6);
  const sessionId = payload?.sessionId || nanoid(16);
  const guestSessionId = randomUUID();
  const finalDisplayName = displayName || `Guest${shortGuestId}`;
  const now = new Date();
  const expiresAt = new Date(Date.now() + GUEST_TRIAL_MS);

  const { user } = await storage.upsertUser({
    displayName: finalDisplayName,
    isGuest: true,
    guestId: shortGuestId,
    profileImageUrl: profileImageUrl || undefined,
    termsAcceptedAt: hasAcceptedConsent ? now : undefined,
  });

  const session = await storage.createGuestSession({
    guestId: guestSessionId,
    sessionId,
    userId: user.id,
    displayName: finalDisplayName,
    lastActive: now,
    lastSeenAt: now,
    expiresAt,
  });

  try {
    await storage.upsertGuestSessionData({
      guestSessionId: session.sessionId,
      data: {
        displayName: finalDisplayName,
        createdAt: now.toISOString(),
        ip: getClientIp(req),
        userAgent: req?.headers?.["user-agent"] || null,
      },
    });
  } catch (error) {
    // Keep guest creation resilient even if guest_session_data is unavailable during rollout.
    if (isDevLogging) {
      console.warn("[Guest Session] Failed to persist guest_session_data:", error);
    }
  }

  await storage.createUsageMetric({
    sessionId: session.sessionId,
    userId: user.id,
    messagesSent: "0",
    toneAnalyzed: "0",
    therapistSearches: "0",
    callActivity: "0",
  });

  // Demo data is opt-in only. Production guest users should start in a real solo
  // workspace, then invite a real co-parent when they are ready.
  if (process.env.PEACEPAD_SEED_DEMO_PARTNERSHIP === "1" && process.env.NODE_ENV !== "test") {
    createDemoPartnership(user.id, "guest").catch((error) => {
      if (isDevLogging) {
        console.error("[Guest] Demo setup failed:", error);
      }
    });
  }

  return { user, session };
}

async function startOrRestoreGuest(req: any, payload: any) {
  const clientSessionId = payload?.sessionId as string | undefined;
  const guestCookieId = parseCookieValue(req, GUEST_COOKIE_NAME);
  let existingSession: any | undefined;

  if (guestCookieId) {
    existingSession = await storage.getGuestSessionByGuestId(guestCookieId);
  }

  if (!existingSession && clientSessionId) {
    existingSession = await storage.getGuestSession(clientSessionId);
  }

  if (existingSession && !existingSession.upgradedToUserId) {
    const expiresAtDate = new Date(existingSession.expiresAt);
    const isExpired = expiresAtDate.getTime() <= Date.now();
    const user = await storage.getUser(existingSession.userId);

    if (!user) {
      throw new Error("Guest user not found for existing session");
    }

    if (isExpired) {
      return {
        status: "expired" as const,
        user,
        session: existingSession,
      };
    }

    await storage.updateGuestSessionActivity(existingSession.sessionId);
    return {
      status: "restored" as const,
      user,
      session: existingSession,
    };
  }

  const { user, session } = await createGuestSession(req, payload);
  return {
    status: "created" as const,
    user,
    session,
  };
}

async function handleGuestStart(req: any, res: any, mode: "contract" | "legacy") {
  try {
    const result = await startOrRestoreGuest(req, req.body || {});

    if (result.status === "expired") {
      const expiresAt = new Date(result.session.expiresAt);
      setGuestCookie(req, res, result.session.guestId, expiresAt);
      attachGuestIdentityToRequest(req, {
        session: result.session,
        user: result.user,
        trial: {
          expiresAt: expiresAt.toISOString(),
          daysRemaining: 0,
          isExpired: true,
        },
      });
      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "Guest trial has expired. Authenticate to continue and retain data.",
        guestId: result.session.guestId,
        expiresAt: expiresAt.toISOString(),
      });
    }

    const expiresAt = new Date(result.session.expiresAt);
    setGuestCookie(req, res, result.session.guestId, expiresAt);
    attachGuestIdentityToRequest(req, {
      session: result.session,
      user: result.user,
      trial: {
        expiresAt: expiresAt.toISOString(),
        daysRemaining: Math.max(
          0,
          Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        ),
        isExpired: false,
      },
    });

    if (mode === "contract") {
      return res.json({
        guestId: result.session.guestId,
        guestSessionId: result.session.sessionId,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return res.json({
      success: true,
      user: result.user,
      guestSessionId: result.session.sessionId,
      sessionId: result.session.sessionId,
      guestId: result.session.guestId,
      expiresAt: expiresAt.toISOString(),
      message: result.status === "restored"
        ? `Welcome back, ${result.user?.displayName || "Guest"}!`
        : `Welcome, ${result.user?.displayName || "Guest"}!`,
    });
  } catch (error: any) {
    console.error("[Guest Start] Error:", error);
    return res.status(500).json({ message: "Failed to authenticate guest" });
  }
}

export const guestCreationLimiter: RequestHandler = guestCreationRateLimiter;
export const guestContractStartHandler: RequestHandler = async (req: any, res: any) =>
  handleGuestStart(req, res, "contract");
export const guestLegacyStartHandler: RequestHandler = async (req: any, res: any) =>
  handleGuestStart(req, res, "legacy");

export function getSession() {
  const sessionTtl = GUEST_TRIAL_MS;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    schemaName: process.env.SESSION_SCHEMA || "public",
    tableName: "sessions",
    errorLog: (error) => {
      if (error.message?.includes("disabled") || error.message?.includes("suspended")) {
        console.warn("[Session Store] Database suspended - sessions may not persist until database wakes");
      } else {
        console.error("[Session Store] Error:", error.message);
      }
    },
  });

  sessionStore.on?.("error", (error) => {
    console.error("[Session Store] Store error:", error.message);
  });

  const isProduction = process.env.NODE_ENV === "production";

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    name: "peacepad.sid",
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: sessionTtl,
      path: "/",
    },
  });
}

// Helper to create demo partnership with sample messages for guests and new authenticated users
export async function createDemoPartnership(userId: string, userType: "guest" | "authenticated" = "guest") {
  try {
    const { user: demoParent } = await storage.upsertUser({
      displayName: "Demo Co-Parent",
      isGuest: true,
      // users.guestId is varchar(6); keep demo IDs within that bound
      guestId: nanoid(6),
    });

    const partnership = await storage.createPartnership({
      user1Id: userId,
      user2Id: demoParent.id,
      inviteCode: await storage.generateInviteCode(),
    });

    const conversation = await storage.createConversation({
      type: "direct",
      createdBy: userId,
    });

    await storage.addConversationMember({
      conversationId: conversation.id,
      userId,
    });
    await storage.addConversationMember({
      conversationId: conversation.id,
      userId: demoParent.id,
    });

    const DEMO_MESSAGES = [
      { content: "Hi there! How's everything going?", tone: "cooperative", senderId: 1 },
      { content: "Doing well, thanks for asking! Ready to coordinate this week.", tone: "cooperative", senderId: 2 },
      { content: "Can we discuss the pickup time for this weekend?", tone: "neutral", senderId: 1 },
      { content: "Sure! I'm thinking Saturday at 2 PM works best. Does that work for you?", tone: "neutral", senderId: 2 },
      { content: "That's perfect! I really appreciate your flexibility with scheduling.", tone: "calm", senderId: 1 },
      { content: "Of course - the kids' needs come first. Let me know if anything changes.", tone: "calm", senderId: 2 },
    ];

    for (const msg of DEMO_MESSAGES) {
      const senderId = msg.senderId === 1 ? userId : demoParent.id;
      await storage.createMessage({
        conversationId: conversation.id,
        content: msg.content,
        senderId,
        tone: msg.tone,
      });
    }

    const now = new Date();
    const demoEvents = [
      {
        title: "Sarah's Birthday",
        type: "birthday",
        startDate: new Date(now.getFullYear(), now.getMonth(), 15),
        createdBy: userId,
      },
      {
        title: "School Pickup",
        type: "custody",
        startDate: new Date(now.getFullYear(), now.getMonth(), 10, 15, 0),
        createdBy: demoParent.id,
      },
      {
        title: "Doctor Appointment",
        type: "shared_event",
        startDate: new Date(now.getFullYear(), now.getMonth(), 20, 14, 0),
        createdBy: userId,
      },
    ];

    for (const event of demoEvents) {
      await storage.createEvent(event as any);
    }

    await storage.upsertUser({
      id: userId,
      activePartnershipId: partnership.id,
    });

    console.log(`[${userType === "authenticated" ? "Auth" : "Guest"}] Created demo partnership ${partnership.id} for user ${userId}`);
  } catch (error) {
    console.error("[Demo Partnership] Failed to create:", error);
  }
}

export const getSessionState: RequestHandler = async (req: any, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.expires_at) {
      const authUserId = req.user?.claims?.sub;
      const authUser = authUserId ? await storage.getUser(authUserId) : null;
      return res.json({
        sessionType: "authenticated",
        mode: "user",
        user: authUser,
        guest: null,
        trial: null,
      });
    }

    const guestIdentity = await resolveGuestIdentity(req);
    if (!guestIdentity) {
      return res.json({
        sessionType: "none",
        mode: "anonymous",
        user: null,
        guest: null,
        trial: null,
      });
    }

    attachGuestIdentityToRequest(req, guestIdentity);
    return res.json({
      sessionType: "guest",
      mode: "guest",
      user: guestIdentity.user,
      guest: {
        guestId: guestIdentity.session.guestId,
        guestSessionId: guestIdentity.session.sessionId,
        sessionId: guestIdentity.session.sessionId,
        createdAt: guestIdentity.session.createdAt,
        lastSeenAt: guestIdentity.session.lastSeenAt || guestIdentity.session.lastActive,
        expiresAt: guestIdentity.session.expiresAt,
        upgradedToUserId: guestIdentity.session.upgradedToUserId || null,
      },
      trial: guestIdentity.trial,
    });
  } catch (error) {
    console.error("Error fetching session state:", error);
    return res.status(500).json({ message: "Failed to fetch session state" });
  }
};

type SetupSoftAuthOptions = {
  includeSessionMiddleware?: boolean;
  sessionMiddleware?: RequestHandler;
};

export async function setupSoftAuth(app: Express, options: SetupSoftAuthOptions = {}) {
  const includeSessionMiddleware = options.includeSessionMiddleware ?? true;
  app.set("trust proxy", 1);

  if (includeSessionMiddleware && !app.get("softAuthSessionConfigured")) {
    app.use(options.sessionMiddleware || getSession());
    app.set("softAuthSessionConfigured", true);
  }

  app.use((req: any, _res, next) => {
    if (!req.session || typeof req.session !== "object") {
      req.session = {};
    }
    next();
  });

  app.get("/api/session", getSessionState);

  // Contract endpoint for instant guest trial start.
  app.post("/api/guest/start", guestCreationLimiter, guestContractStartHandler);

  // Backward-compatible endpoint used by current client code.
  app.post("/api/auth/guest", guestCreationLimiter, guestLegacyStartHandler);

  app.get("/api/auth/me", async (req: any, res) => {
    const guestIdentity = await resolveGuestIdentity(req);
    if (!guestIdentity) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    attachGuestIdentityToRequest(req, guestIdentity);
    return res.json({
      user: guestIdentity.user,
      sessionId: guestIdentity.session.sessionId,
      guestId: guestIdentity.session.guestId,
      expiresAt: guestIdentity.trial.expiresAt,
    });
  });

  app.post("/api/auth/logout", (req: any, res) => {
    clearGuestCookie(req, res);
    if (typeof req.session?.destroy !== "function") {
      const cookieOptions = getGuestCookieOptions(req);
      res.clearCookie("connect.sid", cookieOptions);
      res.clearCookie("peacepad.sid", cookieOptions);
      return res.json({ success: true });
    }

    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      const cookieOptions = getGuestCookieOptions(req);
      res.clearCookie("connect.sid", cookieOptions);
      res.clearCookie("peacepad.sid", cookieOptions);
      res.json({ success: true });
    });
  });
}

export const isSoftAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const guestIdentity = await resolveGuestIdentity(req);
    if (!guestIdentity || guestIdentity.trial.isExpired) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await storage.updateGuestSessionActivity(guestIdentity.session.sessionId);
    attachGuestIdentityToRequest(req, guestIdentity);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireSession: RequestHandler = async (req: any, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.expires_at) {
    req.guest = null;
    req.identityMode = "user";
    return next();
  }

  try {
    const guestIdentity = await resolveGuestIdentity(req);
    if (!guestIdentity) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await storage.updateGuestSessionActivity(guestIdentity.session.sessionId);
    attachGuestIdentityToRequest(req, guestIdentity);
    req.identityMode = "guest";
    return next();
  } catch (error) {
    if (isDevLogging) {
      console.error("[Auth] Guest auth check failed:", error);
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAnyIdentity: RequestHandler = requireSession;

export const requireAuthOnly: RequestHandler = async (req: any, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.expires_at) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export const trialEnforcer: RequestHandler = async (req: any, res, next) => {
  const method = String(req.method || "").toUpperCase();
  if (!WRITE_METHODS.has(method)) {
    return next();
  }

  const originalUrl = String(req.originalUrl || "");
  if (
    originalUrl.startsWith("/api/guest/start") ||
    originalUrl.startsWith("/api/auth/guest") ||
    originalUrl.startsWith("/api/auth/upgrade") ||
    originalUrl.startsWith("/api/auth/logout")
  ) {
    return next();
  }

  if (req.isAuthenticated && req.isAuthenticated() && req.user?.expires_at) {
    return next();
  }

  try {
    const guestIdentity = req.guestSession
      ? await resolveGuestIdentity(req, { allowExpired: true })
      : await resolveGuestIdentity(req, { allowExpired: true });

    if (!guestIdentity) {
      return next();
    }

    if (guestIdentity.trial.isExpired) {
      return res.status(403).json({
        code: "TRIAL_EXPIRED",
        message: "Guest trial has expired. Authenticate to continue and retain your data.",
        expiresAt: guestIdentity.trial.expiresAt,
      });
    }

    return next();
  } catch {
    return next();
  }
};

// Helper to get userId from either auth system
export function getUserId(req: any): string | null {
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  if (req.user?.id) {
    return req.user.id;
  }
  if (req.session?.userId) {
    return req.session.userId;
  }
  return null;
}

// Backward compatibility for existing route usage.
export const isAuthenticatedEither: RequestHandler = requireAnyIdentity;

// Usage tracking helper
export async function trackUsage(sessionId: string, metric: string, increment: number = 1) {
  try {
    const existing = await storage.getUsageMetrics(sessionId);
    if (existing) {
      const currentValue = parseInt((existing as any)[metric] || "0", 10);
      await storage.updateUsageMetric(sessionId, {
        [metric]: String(currentValue + increment),
      });
    }
  } catch (error) {
    console.error("Usage tracking error:", error);
  }
}
